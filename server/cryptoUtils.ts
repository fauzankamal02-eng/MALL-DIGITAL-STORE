import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/**
 * Computes a 6-digit RFC 6238 TOTP code (30s period, HMAC-SHA1).
 */
export function computeTotp(base32Secret: string, timestampMs = Date.now(), stepSeconds = 30): string {
  const key = decodeBase32(base32Secret);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(codeInt % 1_000_000).padStart(6, '0');
}

export function verifyTotp(base32Secret: string, candidateCode: string, timestampMs = Date.now()): boolean {
  const clean = candidateCode.replace(/\s+/g, '');
  if (!/^[0-9]{6}$/.test(clean)) return false;
  for (const delta of [-1, 0, 1]) {
    const expected = computeTotp(base32Secret, timestampMs + delta * 30_000);
    if (
      expected.length === clean.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))
    ) {
      return true;
    }
  }
  return false;
}

export interface EncryptedBackupEnvelope {
  algorithm: 'AES-256-GCM';
  ivHex: string;
  authTagHex: string;
  ciphertextBase64: string;
  checksumSha256: string;
  sizeBytes: number;
}

export function deriveAes256Key(secretSource?: string): Buffer {
  if (secretSource && secretSource.trim().length > 0) {
    return crypto.createHash('sha256').update(secretSource.trim()).digest();
  }
  return crypto.randomBytes(32);
}

export function encryptCloudBackup(payload: unknown, key: Buffer): EncryptedBackupEnvelope {
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const checksumSha256 = crypto.createHash('sha256').update(encrypted).digest('hex');

  return {
    algorithm: 'AES-256-GCM',
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
    ciphertextBase64: encrypted.toString('base64'),
    checksumSha256,
    sizeBytes: encrypted.byteLength,
  };
}

export function decryptCloudBackup<T = unknown>(
  envelope: EncryptedBackupEnvelope,
  key: Buffer
): T {
  const iv = Buffer.from(envelope.ivHex, 'hex');
  const authTag = Buffer.from(envelope.authTagHex, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertextBase64, 'base64');

  const computedChecksum = crypto.createHash('sha256').update(ciphertext).digest('hex');
  if (computedChecksum !== envelope.checksumSha256) {
    throw new Error('Backup integrity checksum mismatch.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}

export function signDownloadToken(orderId: string, productId: string, secret: Buffer): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const body = Buffer.from(JSON.stringify({ orderId, productId, expiresAt }), 'utf8').toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyDownloadToken(
  token: string,
  secret: Buffer
): { orderId: string; productId: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      orderId: string;
      productId: string;
      expiresAt: number;
    };
    if (!parsed.orderId || !parsed.productId || Date.now() > parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
