import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPublicFaqs, validateFaqInput } from './faqUtils.ts';
import type { FaqItem } from '../types.ts';

test('validateFaqInput accepts valid FAQ payload and rejects short question or invalid category', () => {
  const ok = validateFaqInput({
    question: 'Bagaimana cara unduh file setelah bayar QRIS?',
    answer: 'Begitu QRIS terverifikasi otomatis, file langsung terunduh dan tautannya dikirim ke email.',
    category: 'Pengiriman Otomatis',
    active: true,
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.cleaned?.category, 'Pengiriman Otomatis');

  const shortQ = validateFaqInput({
    question: 'Halo?',
    answer: 'Jawaban cukup panjang untuk lolos pemeriksaan validasi.',
    category: 'Pembayaran',
  });
  assert.equal(shortQ.valid, false);

  const badCat = validateFaqInput({
    question: 'Apakah tersedia garansi penggantian akun?',
    answer: 'Ya, garansi penuh sesuai masa aktif paket yang tertera pada produk.',
    category: 'TidakValid',
  });
  assert.equal(badCat.valid, false);
});

test('filterPublicFaqs hides inactive FAQs, filters by category & query, and respects sortOrder', () => {
  const sample: FaqItem[] = [
    {
      id: 'faq-2',
      question: 'Apakah saldo DANA masuk otomatis?',
      answer: 'Ya, saldo DANA dan e-wallet masuk otomatis dalam hitungan detik.',
      category: 'Top Up & Tagihan',
      active: true,
      sortOrder: 2,
      createdAt: '2026-11-20T01:00:00Z',
      updatedAt: '2026-11-20T01:00:00Z',
    },
    {
      id: 'faq-1',
      question: 'Metode pembayaran apa saja yang didukung?',
      answer: 'QRIS, Virtual Account BCA, Mandiri, BNI, BRI, GoPay, OVO, DANA, dan ShopeePay.',
      category: 'Pembayaran',
      active: true,
      sortOrder: 1,
      createdAt: '2026-11-20T01:00:00Z',
      updatedAt: '2026-11-20T01:00:00Z',
    },
    {
      id: 'faq-hidden',
      question: 'Pertanyaan draft internal admin',
      answer: 'Tidak boleh tampil di halaman beranda pelanggan.',
      category: 'Pembayaran',
      active: false,
      sortOrder: 0,
      createdAt: '2026-11-20T01:00:00Z',
      updatedAt: '2026-11-20T01:00:00Z',
    },
  ];

  const allPublic = filterPublicFaqs(sample, 'Semua', '');
  assert.equal(allPublic.length, 2);
  assert.equal(allPublic[0].id, 'faq-1');
  assert.equal(allPublic[1].id, 'faq-2');

  const onlyTopUp = filterPublicFaqs(sample, 'Top Up & Tagihan', '');
  assert.equal(onlyTopUp.length, 1);
  assert.equal(onlyTopUp[0].id, 'faq-2');

  const byKeyword = filterPublicFaqs(sample, 'Semua', 'qris');
  assert.equal(byKeyword.length, 1);
  assert.equal(byKeyword[0].id, 'faq-1');
});
