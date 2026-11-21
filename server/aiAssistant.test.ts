import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStoreCatalogContext,
  extractRecommendedProductIds,
} from './aiAssistant';
import type { DigitalProduct, PromoVoucher } from '../src/types';

const sampleProducts: DigitalProduct[] = [
  {
    id: 'prod-capcut-pro-1bln',
    title: 'CapCut Pro 1 Bulan Private',
    brand: 'CapCut',
    category: 'Aplikasi Premium',
    description: 'Editing video 4K tanpa watermark.',
    highlights: ['Akun Private', 'Ekspor 4K'],
    priceIdr: 26000,
    resellerPriceIdr: 24000,
    stock: 18,
    soldCount: 412,
    fileName: 'CapCut.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1.2,
    version: '30H',
    imageUrl: '',
    brandColor: '#0B1E38',
    brandGlyph: 'CC',
    sellerId: 'seller-1',
    sellerName: 'MALL DIGITAL STORE',
    active: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'prod-sold-out',
    title: 'Apple Music Habis',
    brand: 'Apple Music',
    category: 'Aplikasi Premium',
    description: 'Stok habis.',
    highlights: ['Lossless'],
    priceIdr: 9500,
    resellerPriceIdr: 7500,
    stock: 0,
    soldCount: 100,
    fileName: 'Apple.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1,
    version: '30H',
    imageUrl: '',
    brandColor: '#FA243C',
    brandGlyph: 'AM',
    sellerId: 'seller-1',
    sellerName: 'MALL DIGITAL STORE',
    active: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

const samplePromos: PromoVoucher[] = [
  {
    id: 'promo-1',
    code: 'HEMAT15',
    description: 'Diskon 15% semua produk',
    discountType: 'percent',
    discountValue: 15,
    minPurchaseIdr: 10000,
    usageCount: 10,
    maxUsage: 500,
    active: true,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
];

test('buildStoreCatalogContext formats Rupiah prices, reseller tier, stock, and active vouchers', () => {
  const ctx = buildStoreCatalogContext(sampleProducts, samplePromos);
  assert.match(ctx, /MALL DIGITAL STORE/);
  assert.match(ctx, /CapCut Pro 1 Bulan Private/);
  assert.match(ctx, /26\.000/);
  assert.match(ctx, /24\.000/);
  assert.match(ctx, /STOK HABIS/);
  assert.match(ctx, /HEMAT15/);
});

test('extractRecommendedProductIds extracts valid in-stock tagged products and strips raw tags', () => {
  const raw =
    'Saya rekomendasikan CapCut Pro 1 Bulan Private untuk editing 4K.\n\n[[PRODUCT:prod-capcut-pro-1bln]] [[PRODUCT:prod-sold-out]] [[PRODUCT:invalid-id]]';
  const res = extractRecommendedProductIds(raw, sampleProducts);
  assert.deepEqual(res.recommendedProductIds, ['prod-capcut-pro-1bln']);
  assert.ok(!res.cleanText.includes('[[PRODUCT:'));
  assert.match(res.cleanText, /CapCut Pro 1 Bulan Private/);
});

test('extractRecommendedProductIds falls back to brand/title mention matching when tags are omitted', () => {
  const raw = 'Pilihan terbaik untuk editing video adalah CapCut Pro 1 Bulan Private.';
  const res = extractRecommendedProductIds(raw, sampleProducts);
  assert.deepEqual(res.recommendedProductIds, ['prod-capcut-pro-1bln']);
});
