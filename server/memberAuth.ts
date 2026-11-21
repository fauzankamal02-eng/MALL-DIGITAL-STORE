import crypto from 'node:crypto';
import type { MemberProfile, MemberSavedTarget } from '../src/types';

export interface StoredMemberRecord extends MemberProfile {
  passwordHash: string | null;
  passwordSalt: string | null;
}

const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE_RE = /^[0-9+\-\s]{8,20}$/;

const VALID_SERVICE_IDS = new Set<MemberSavedTarget['serviceId']>([
  'pulsa',
  'pln',
  'ewallet',
  'game',
  'pdam',
  'internet',
  'bpjs',
  'voucher',
]);

export function hashMemberPassword(password: string, saltHex?: string): {
  saltHex: string;
  hashHex: string;
} {
  const salt = saltHex ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { saltHex: salt, hashHex: derived };
}

export function verifyMemberPassword(
  password: string,
  saltHex: string | null,
  expectedHashHex: string | null
): boolean {
  if (!saltHex || !expectedHashHex) return false;
  const candidate = crypto.scryptSync(password, saltHex, 64);
  const expected = Buffer.from(expectedHashHex, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function generateMemberCode(sequenceNumber: number): string {
  const seq = String(Math.max(1, Math.floor(sequenceNumber))).padStart(4, '0');
  return `MBR-2026-${seq}`;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function toPublicMember(record: StoredMemberRecord): MemberProfile {
  return {
    id: record.id,
    memberCode: record.memberCode,
    displayName: record.displayName,
    email: record.email,
    phone: record.phone,
    tier: record.tier,
    authProvider: record.authProvider,
    loyaltyPoints: record.loyaltyPoints,
    savedTargets: [...record.savedTargets],
    joinedAt: record.joinedAt,
    lastLoginAt: record.lastLoginAt,
  };
}

export function validateMemberRegistration(input: {
  displayName?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  tier?: unknown;
}): {
  valid: boolean;
  error?: string;
  cleaned?: {
    displayName: string;
    email: string;
    phone: string;
    password: string;
    tier: 'reguler' | 'reseller';
  };
} {
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const tier = input.tier === 'reseller' ? 'reseller' : 'reguler';

  if (displayName.length < 2 || displayName.length > 80) {
    return { valid: false, error: 'Nama lengkap member minimal 2 karakter dan maksimal 80 karakter.' };
  }
  if (!VALID_EMAIL_RE.test(email) || email.length > 160) {
    return { valid: false, error: 'Format alamat email tidak valid.' };
  }
  if (phone && !VALID_PHONE_RE.test(phone)) {
    return { valid: false, error: 'Nomor WhatsApp harus terdiri dari 8–20 digit angka yang valid.' };
  }
  if (password.length < 8 || password.length > 128) {
    return { valid: false, error: 'Kata sandi minimal 8 karakter agar akun member aman.' };
  }

  return {
    valid: true,
    cleaned: {
      displayName,
      email,
      phone,
      password,
      tier,
    },
  };
}

export function validateSavedTargetInput(input: {
  serviceId?: unknown;
  provider?: unknown;
  targetNumber?: unknown;
  label?: unknown;
}): {
  valid: boolean;
  error?: string;
  cleaned?: {
    serviceId: MemberSavedTarget['serviceId'];
    provider: string;
    targetNumber: string;
    label: string;
  };
} {
  const serviceId =
    typeof input.serviceId === 'string' && VALID_SERVICE_IDS.has(input.serviceId as MemberSavedTarget['serviceId'])
      ? (input.serviceId as MemberSavedTarget['serviceId'])
      : null;
  const provider = typeof input.provider === 'string' ? input.provider.trim().slice(0, 48) : '';
  const targetNumber =
    typeof input.targetNumber === 'string' ? input.targetNumber.trim().slice(0, 40) : '';
  const label = typeof input.label === 'string' ? input.label.trim().slice(0, 60) : '';

  if (!serviceId) {
    return { valid: false, error: 'Jenis layanan top up atau tagihan tidak valid.' };
  }
  if (provider.length < 2) {
    return { valid: false, error: 'Nama penyedia layanan wajib diisi.' };
  }
  if (targetNumber.length < 4) {
    return { valid: false, error: 'Nomor tujuan atau ID pelanggan minimal 4 karakter.' };
  }

  return {
    valid: true,
    cleaned: {
      serviceId,
      provider,
      targetNumber,
      label: label || `${provider} (${targetNumber})`,
    },
  };
}

export function validateGoogleSyncTokenClaims(
  idToken: unknown,
  expectedProjectId: string
): { valid: boolean; uid?: string; email?: string; name?: string; error?: string } {
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3) {
    return { valid: false, error: 'Token autentikasi Google tidak valid.' };
  }
  try {
    const payloadPart = idToken.split('.')[1];
    const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as {
      aud?: string;
      iss?: string;
      sub?: string;
      email?: string;
      name?: string;
      exp?: number;
    };
    const nowSec = Math.floor(Date.now() / 1000);
    if (!claims.sub || !claims.email || !VALID_EMAIL_RE.test(claims.email)) {
      return { valid: false, error: 'Klaim identitas Google tidak lengkap.' };
    }
    if (expectedProjectId && claims.aud !== expectedProjectId) {
      return { valid: false, error: 'Audience token Google tidak sesuai proyek.' };
    }
    if (typeof claims.exp === 'number' && claims.exp < nowSec) {
      return { valid: false, error: 'Token sesi Google telah kedaluwarsa.' };
    }
    return {
      valid: true,
      uid: claims.sub,
      email: claims.email.trim().toLowerCase(),
      name: typeof claims.name === 'string' ? claims.name.trim().slice(0, 80) : undefined,
    };
  } catch {
    return { valid: false, error: 'Gagal membaca token autentikasi Google.' };
  }
}

