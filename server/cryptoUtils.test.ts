import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  computeTotp,
  decryptCloudBackup,
  deriveAes256Key,
  encryptCloudBackup,
  generateBase32Secret,
  signDownloadToken,
  verifyDownloadToken,
  verifyTotp,
} from './cryptoUtils';

test('TOTP MFA generates valid 6-digit RFC 6238 codes and verifies within 30s window', () => {
  const secret = generateBase32Secret();
  const now = 1795230000000;
  const code = computeTotp(secret, now);
  assert.match(code, /^[0-9]{6}$/);
  assert.equal(verifyTotp(secret, code, now), true);
  assert.equal(verifyTotp(secret, code, now + 25_000), true);
  assert.equal(verifyTotp(secret, '000000', now), code === '000000');
});

test('AES-256-GCM cloud backup encrypts, verifies SHA-256 checksum, and decrypts cleanly', () => {
  const key = deriveAes256Key('test-backup-secret-key');
  const snapshot = { orders: 12, products: 6, createdAt: '2026-11-20T18:00:00Z' };
  const encrypted = encryptCloudBackup(snapshot, key);
  assert.equal(encrypted.algorithm, 'AES-256-GCM');
  assert.ok(encrypted.ciphertextBase64.length > 0);
  assert.ok(encrypted.checksumSha256.length === 64);

  const decrypted = decryptCloudBackup<typeof snapshot>(encrypted, key);
  assert.deepEqual(decrypted, snapshot);

  // Tampering must throw
  assert.throws(() => {
    decryptCloudBackup({ ...encrypted, ciphertextBase64: 'AAAA' }, key);
  });
});

test('HMAC-SHA256 signed download tokens validate intact payloads and reject tampered tokens', () => {
  const secret = crypto.randomBytes(32);
  const token = signDownloadToken('ord-101', 'prod-uikit', secret);
  const parsed = verifyDownloadToken(token, secret);
  assert.ok(parsed);
  assert.equal(parsed?.orderId, 'ord-101');
  assert.equal(parsed?.productId, 'prod-uikit');

  const tampered = token.slice(0, -3) + 'xyz';
  assert.equal(verifyDownloadToken(tampered, secret), null);
});
