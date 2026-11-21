import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeliveredPayload,
  maskCredentialPreview,
  parseBulkVaultLines,
  signWebhookPayload,
  verifyWebhookSignature,
} from './fulfillmentEngine';

test('HMAC-SHA256 webhook signature validates authentic payloads and rejects tampering', () => {
  const secret = 'test-webhook-secret-2026';
  const body = JSON.stringify({ orderCode: 'KD-2026-9910', transactionStatus: 'PAID', amountIdr: 25000 });
  const sig = signWebhookPayload(body, secret);

  assert.equal(verifyWebhookSignature(body, sig, secret), true);
  assert.equal(verifyWebhookSignature(body + ' ', sig, secret), false);
  assert.equal(verifyWebhookSignature(body, '0'.repeat(64), secret), false);
  assert.equal(verifyWebhookSignature(body, 'not-hex', secret), false);
});

test('parseBulkVaultLines trims, deduplicates, and ignores too-short lines', () => {
  const lines = parseBulkVaultLines(`
    akun1@mail.id | Pass123
    ok
    akun1@mail.id | Pass123
    akun2@mail.id | Pass456
  `);
  assert.deepEqual(lines, ['akun1@mail.id | Pass123', 'akun2@mail.id | Pass456']);
});

test('maskCredentialPreview hides sensitive middle characters', () => {
  const masked = maskCredentialPreview('netflix-vip@mall.id | Rahasia99');
  assert.ok(masked.startsWith('netf'));
  assert.ok(masked.endsWith('a99'));
  assert.ok(!masked.includes('Rahasi'));
});

test('buildDeliveredPayload delivers vault credential for apps and 20-digit SN for top-up', () => {
  const appDelivery = buildDeliveredPayload(
    {
      id: 'ord-1',
      orderCode: 'KD-2026-1001',
      productId: 'prod-netflix-1bln',
      productTitle: 'NETFLIX 1 BULAN ANTILIMIT',
      fileName: 'netflix.txt',
    },
    'vip01@malldigital.id | Pass8821 | Profil 2',
    '2026-11-20T12:00:00.000Z',
    false
  );
  assert.equal(appDelivery.type, 'account_license');
  assert.equal(appDelivery.source, 'vault');
  assert.equal(appDelivery.value, 'vip01@malldigital.id | Pass8821 | Profil 2');

  const plnDelivery = buildDeliveredPayload(
    {
      id: 'ord-2',
      orderCode: 'TU-2026-2002',
      productId: 'topup-pln-pln-50k',
      productTitle: 'Token PLN · 50.000',
      fileName: 'Struk_PLN.txt',
    },
    null,
    '2026-11-20T12:00:00.000Z',
    false
  );
  assert.equal(plnDelivery.type, 'topup_sn');
  assert.match(plnDelivery.value, /^\d{4}-\d{4}-\d{4}-\d{4}-\d{4}$/);
});
