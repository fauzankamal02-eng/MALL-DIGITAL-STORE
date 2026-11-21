import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderPricing,
  calculatePayoutBreakdown,
  computeAnalyticsSummary,
  formatIdr,
  validateBankAccount,
} from './commerce';
import type { DigitalProduct, OrderRecord, PayoutRecord, PromoVoucher } from '../types';

test('formatIdr formats Rupiah accurately with Indonesian thousands separators', () => {
  assert.equal(formatIdr(249000), 'Rp 249.000');
  assert.equal(formatIdr(1500000), 'Rp 1.500.000');
  assert.equal(formatIdr(0), 'Rp 0');
});

test('calculateOrderPricing applies percentage promo, loyalty cap, and QRIS fee', () => {
  const promo: PromoVoucher = {
    id: 'p1',
    code: 'HEMAT15',
    description: 'Diskon 15%',
    discountType: 'percent',
    discountValue: 15,
    minPurchaseIdr: 100000,
    usageCount: 2,
    maxUsage: 100,
    active: true,
    createdAt: '2026-11-20T00:00:00Z',
  };

  const result = calculateOrderPricing(200000, promo, 1000, 'QRIS');
  assert.equal(result.promoError, null);
  assert.equal(result.promoDiscountIdr, 30000); // 15% of 200.000
  // After promo = 170.000; max loyalty = 25% = 42.500 -> 425 pts = Rp 42.500
  assert.equal(result.loyaltyPointsUsed, 425);
  assert.equal(result.loyaltyDiscountIdr, 42500);
  assert.equal(result.gatewayFeeIdr, 1500);
  assert.equal(result.finalAmountIdr, 129000);
  assert.equal(result.installmentMonths, 1);
});

test('calculateOrderPricing enforces minimum purchase for voucher and calculates 0% 3x installment', () => {
  const promo: PromoVoucher = {
    id: 'p2',
    code: 'BIG50K',
    description: 'Potongan 50rb',
    discountType: 'fixed',
    discountValue: 50000,
    minPurchaseIdr: 300000,
    usageCount: 0,
    maxUsage: 50,
    active: true,
    createdAt: '2026-11-20T00:00:00Z',
  };

  const rejected = calculateOrderPricing(150000, promo, 0, 'CICILAN_3X');
  assert.ok(rejected.promoError?.includes('Minimal transaksi'));
  assert.equal(rejected.promoDiscountIdr, 0);
  assert.equal(rejected.installmentMonths, 3);
  assert.equal(rejected.monthlyInstallmentIdr, 50000);
});

test('calculatePayoutBreakdown enforces minimum withdrawal and BI-FAST bank fees', () => {
  const tooLow = calculatePayoutBreakdown(25000, 'BCA', 500000);
  assert.ok(tooLow.error?.includes('Minimal penarikan'));

  const exceeds = calculatePayoutBreakdown(600000, 'BCA', 500000);
  assert.ok(exceeds.error?.includes('Saldo tidak mencukupi'));

  const okBca = calculatePayoutBreakdown(300000, 'BCA', 500000);
  assert.equal(okBca.error, null);
  assert.equal(okBca.feeIdr, 2500);
  assert.equal(okBca.netAmountIdr, 297500);

  const okJago = calculatePayoutBreakdown(300000, 'JAGO', 500000);
  assert.equal(okJago.feeIdr, 0);
  assert.equal(okJago.netAmountIdr, 300000);
});

test('validateBankAccount rejects invalid numbers and accepts Indonesian account formats', () => {
  assert.equal(validateBankAccount('1234', 'Budi Santoso').valid, false);
  assert.equal(validateBankAccount('1234567890', 'A').valid, false);
  assert.equal(validateBankAccount('5271048821', 'Rina Wijaya').valid, true);
});

test('computeAnalyticsSummary aggregates verified orders, available seller balance, and low stock alerts', () => {
  const products: DigitalProduct[] = [
    {
      id: 'prod-1',
      title: 'UI Kit Nusantara',
      brand: 'Figma',
      category: 'Template & Kode',
      description: 'Desain sistem modern',
      highlights: ['Figma'],
      originalPriceIdr: 299000,
      priceIdr: 250000,
      resellerPriceIdr: 220000,
      stock: 5,
      soldCount: 10,
      fileName: 'uikit.zip',
      fileFormat: 'FIG / ZIP',
      fileSizeMb: 42,
      version: '2.0',
      imageUrl: '',
      brandColor: '#111827',
      brandGlyph: 'UI',
      sellerId: 's1',
      sellerName: 'Studio',
      active: true,
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    },
  ];
  const orders: OrderRecord[] = [
    {
      id: 'o1',
      orderCode: 'KD-2026-001',
      buyerId: 'b1',
      buyerName: 'Andi',
      buyerEmail: 'andi@example.com',
      sellerId: 's1',
      productId: 'prod-1',
      productTitle: 'UI Kit Nusantara',
      fileName: 'uikit.zip',
      fileFormat: 'FIG / ZIP',
      fileSizeMb: 42,
      amountIdr: 250000,
      discountIdr: 0,
      loyaltyDiscountIdr: 0,
      gatewayFeeIdr: 1500,
      finalAmountIdr: 251500,
      paymentMethod: 'QRIS',
      paymentMethodLabel: 'QRIS Nasional',
      paymentReference: 'QR-001',
      paymentStatus: 'verified',
      downloadToken: 'tok1',
      downloadCount: 2,
      promoCode: null,
      installmentMonths: 1,
      monthlyInstallmentIdr: 251500,
      emailSent: true,
      timeline: [],
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    },
  ];
  const payouts: PayoutRecord[] = [
    {
      id: 'po1',
      payoutCode: 'WD-001',
      sellerId: 's1',
      bankCode: 'BCA',
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '5271048821',
      accountHolder: 'Fauzan Kamal',
      amountIdr: 100000,
      feeIdr: 2500,
      netAmountIdr: 97500,
      status: 'completed',
      createdAt: '2026-11-20T00:00:00Z',
    },
  ];

  const summary = computeAnalyticsSummary(orders, payouts, products);
  assert.equal(summary.totalGrossRevenueIdr, 251500);
  assert.equal(summary.totalVerifiedOrders, 1);
  assert.equal(summary.totalDownloads, 2);
  assert.equal(summary.availableBalanceIdr, Math.round(251500 * 0.95) - 100000);
  assert.equal(summary.lowStockProducts.length, 1);
});
