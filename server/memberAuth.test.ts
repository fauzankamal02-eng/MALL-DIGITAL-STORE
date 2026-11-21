import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateMemberCode,
  hashMemberPassword,
  toPublicMember,
  validateMemberRegistration,
  validateSavedTargetInput,
  verifyMemberPassword,
  type StoredMemberRecord,
} from './memberAuth';

test('hashMemberPassword and verifyMemberPassword validate correct password and reject wrong password', () => {
  const { saltHex, hashHex } = hashMemberPassword('RahasiaAman2026!');
  assert.equal(verifyMemberPassword('RahasiaAman2026!', saltHex, hashHex), true);
  assert.equal(verifyMemberPassword('SalahBanget123', saltHex, hashHex), false);
  assert.equal(verifyMemberPassword('RahasiaAman2026!', null, null), false);
});

test('validateMemberRegistration validates inputs cleanly and rejects weak passwords or invalid email', () => {
  const ok = validateMemberRegistration({
    displayName: 'Rina Kusuma',
    email: 'Rina.Kusuma@Example.ID',
    phone: '081234567890',
    password: 'PasswordKuat123',
    tier: 'reseller',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.cleaned?.email, 'rina.kusuma@example.id');
  assert.equal(ok.cleaned?.tier, 'reseller');

  const shortPwd = validateMemberRegistration({
    displayName: 'Rina',
    email: 'rina@example.id',
    password: '12345',
  });
  assert.equal(shortPwd.valid, false);

  const badEmail = validateMemberRegistration({
    displayName: 'Rina',
    email: 'bukan-email',
    password: 'PasswordKuat123',
  });
  assert.equal(badEmail.valid, false);
});

test('toPublicMember strips passwordHash and passwordSalt while preserving member fields', () => {
  const stored: StoredMemberRecord = {
    id: 'mbr-1',
    memberCode: generateMemberCode(12),
    displayName: 'Budi Santoso',
    email: 'budi@malldigitalstore.id',
    phone: '081299998888',
    tier: 'reguler',
    authProvider: 'email',
    loyaltyPoints: 250,
    savedTargets: [],
    joinedAt: '2026-11-20T00:00:00.000Z',
    lastLoginAt: '2026-11-20T00:00:00.000Z',
    passwordHash: 'deadbeef',
    passwordSalt: 'cafebabe',
  };

  const pub = toPublicMember(stored);
  assert.equal(pub.memberCode, 'MBR-2026-0012');
  assert.equal('passwordHash' in pub, false);
  assert.equal('passwordSalt' in pub, false);
});

test('validateSavedTargetInput accepts valid PLN/pulsa targets and rejects invalid service IDs', () => {
  const valid = validateSavedTargetInput({
    serviceId: 'pln',
    provider: 'PLN Prabayar',
    targetNumber: '512345678901',
    label: 'Meteran Rumah',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.cleaned?.label, 'Meteran Rumah');

  const invalid = validateSavedTargetInput({
    serviceId: 'unknown',
    provider: 'PLN',
    targetNumber: '512345678901',
  });
  assert.equal(invalid.valid, false);
});
