import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPUP_SERVICES,
  getTopUpService,
  validateTopUpTarget,
  calculateTopUpPricing,
} from './topupCatalog';

test('TOPUP_SERVICES exposes all 8 digital payment & top-up categories', () => {
  assert.equal(TOPUP_SERVICES.length, 8);
  const ids = TOPUP_SERVICES.map((s) => s.id);
  assert.deepEqual(ids, ['pulsa', 'pln', 'ewallet', 'game', 'pdam', 'internet', 'bpjs', 'voucher']);
});

test('validateTopUpTarget validates Indonesian phone numbers for pulsa and e-wallet', () => {
  const ok = validateTopUpTarget('pulsa', '0812-3456-7890');
  assert.equal(ok.valid, true);
  assert.equal(ok.cleaned, '081234567890');

  const bad = validateTopUpTarget('ewallet', '12345');
  assert.equal(bad.valid, false);
  assert.ok(bad.error && bad.error.includes('08'));
});

test('validateTopUpTarget validates PLN meter IDs and Game User IDs', () => {
  assert.equal(validateTopUpTarget('pln', '530012345678').valid, true);
  assert.equal(validateTopUpTarget('pln', '12345').valid, false);

  assert.equal(validateTopUpTarget('game', '10928374 (2104)').valid, true);
  assert.equal(validateTopUpTarget('game', '12').valid, false);
});

test('calculateTopUpPricing applies reguler vs reseller pricing with gateway fee', () => {
  const game = getTopUpService('game');
  assert.ok(game);
  const nominal = game.nominals.find((n) => n.id === 'game-257');
  assert.ok(nominal);

  const reg = calculateTopUpPricing(nominal, 'reguler', 'QRIS');
  const res = calculateTopUpPricing(nominal, 'reseller', 'QRIS');

  assert.equal(reg.subtotalIdr, nominal.priceIdr);
  assert.equal(res.subtotalIdr, nominal.resellerPriceIdr);
  assert.ok(res.finalAmountIdr < reg.finalAmountIdr);
});
