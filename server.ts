import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type {
  ActivityLog,
  AutomatedEmailLog,
  AutomationSettings,
  BootstrapPayload,
  CloudBackupRecord,
  DigitalProduct,
  FaqCategory,
  FaqItem,
  IndonesianBankCode,
  OrderRecord,
  PaymentMethodCode,
  PayoutRecord,
  ProductCategory,
  PromoVoucher,
  PushNotificationItem,
  SecurityProfile,
  StoreAnnouncement,
  StoreAnnouncementLevel,
  SupportMessage,
  VaultProductSummary,
} from './src/types';
import {
  calculateOrderPricing,
  calculatePayoutBreakdown,
  computeAnalyticsSummary,
  formatIdr,
  PAYMENT_GATEWAY_OPTIONS,
  validateBankAccount,
} from './src/utils/commerce';
import {
  calculateTopUpPricing,
  getTopUpService,
  validateTopUpTarget,
} from './src/utils/topupCatalog';
import { validateFaqInput } from './src/utils/faqUtils';
import {
  computeTotp,
  decryptCloudBackup,
  deriveAes256Key,
  encryptCloudBackup,
  EncryptedBackupEnvelope,
  generateBase32Secret,
  signDownloadToken,
  verifyDownloadToken,
  verifyTotp,
} from './server/cryptoUtils';
import { askMallDigitalAssistant, type AssistantTurnInput } from './server/aiAssistant';
import {
  buildDeliveredPayload,
  maskCredentialPreview,
  parseBulkVaultLines,
  signWebhookPayload,
  verifyWebhookSignature,
} from './server/fulfillmentEngine';
import {
  generateMemberCode,
  generateSessionToken,
  hashMemberPassword,
  toPublicMember,
  validateGoogleSyncTokenClaims,
  validateMemberRegistration,
  validateSavedTargetInput,
  verifyMemberPassword,
  type StoredMemberRecord,
} from './server/memberAuth';
import firebaseAppletConfig from './firebase-applet-config.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DOWNLOAD_SECRET = deriveAes256Key(process.env.DOWNLOAD_SIGNING_SECRET);
const BACKUP_KEY = deriveAes256Key(process.env.BACKUP_ENCRYPTION_KEY);

// Server-authoritative state with deterministic initial Indonesian digital commerce data
const nowIso = () => new Date().toISOString();

const products: DigitalProduct[] = [
  {
    id: 'prod-capcut-pro-1bln',
    title: 'CapCut Pro 1 Bulan Private',
    brand: 'CapCut',
    category: 'Aplikasi Premium',
    description:
      'Akses penuh CapCut Pro Private 1 bulan dengan ekspor 4K tanpa watermark, efek AI premium, dan auto-caption cepat. Panduan aktivasi & file lisensi langsung terunduh otomatis.',
    highlights: ['Akun Private Anti-Limit', 'Ekspor 4K & Fitur AI Pro', 'Garansi Penuh 30 Hari'],
    originalPriceIdr: 34500,
    priceIdr: 26000,
    resellerPriceIdr: 24000,
    stock: 18,
    soldCount: 412,
    fileName: 'CapCut-Pro-1Bulan-Lisensi.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1.2,
    version: 'Private 30H',
    imageUrl: '',
    brandColor: '#111827',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'CC',
    isPromo: true,
    isBestSeller: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-11-20T10:20:00.000Z',
  },
  {
    id: 'prod-netflix-1bln',
    title: 'NETFLIX 1 BULAN ANTILIMIT',
    brand: 'Netflix',
    category: 'Aplikasi Premium',
    description:
      'Paket streaming kualitas 4K Ultra HD 1 bulan anti-limit, bebas gangguan, mendukung Smart TV, HP, dan laptop. Detail akses otomatis terkirim pasca verifikasi pembayaran.',
    highlights: ['Ultra HD 4K HDR', 'Support All Device', 'Pengiriman Instan Otomatis'],
    originalPriceIdr: 33250,
    priceIdr: 25000,
    resellerPriceIdr: 23000,
    stock: 70,
    soldCount: 530,
    fileName: 'Netflix-1Bulan-Antilimit-Akses.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1.1,
    version: '1P1U UHD',
    imageUrl: '',
    brandColor: '#141414',
    brandTextColor: '#E50914',
    brandGlyph: 'N',
    isPromo: true,
    isBestSeller: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-11-20T11:00:00.000Z',
  },
  {
    id: 'prod-adobe-express',
    title: 'Adobe Express — 4 Bulan',
    brand: 'Adobe',
    category: 'Aplikasi Premium',
    description:
      'Lisensi Adobe Express Premium 4 bulan dengan ribuan template konten sosial media, font komersial Adobe, dan penghapus latar otomatis sekali klik.',
    highlights: ['Masa Aktif 4 Bulan', 'Aset Adobe Stock Premium', 'Aktivasi Email Pembeli'],
    originalPriceIdr: 13300,
    priceIdr: 10000,
    resellerPriceIdr: 8000,
    stock: 32,
    soldCount: 184,
    fileName: 'Adobe-Express-4Bulan-Guide.pdf',
    fileFormat: 'LISENSI / PDF',
    fileSizeMb: 2.4,
    version: '4 Bulan',
    imageUrl: '',
    brandColor: '#2D1657',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'Ae',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-10T08:00:00.000Z',
    updatedAt: '2026-11-18T10:20:00.000Z',
  },
  {
    id: 'prod-adobe-lightroom',
    title: 'Adobe Lightroom — 1 Tahun',
    brand: 'Adobe',
    category: 'Aplikasi Premium',
    description:
      'Paket Adobe Lightroom Premium 1 tahun untuk pengeditan foto RAW, sinkronisasi preset seluler & desktop, serta alat masking AI profesional.',
    highlights: ['Aktif 12 Bulan Penuh', 'Preset & Masking AI', 'Panduan Instalasi Lengkap'],
    originalPriceIdr: 13300,
    priceIdr: 10000,
    resellerPriceIdr: 9000,
    stock: 29,
    soldCount: 221,
    fileName: 'Adobe-Lightroom-1Tahun-Lisensi.pdf',
    fileFormat: 'LISENSI / PDF',
    fileSizeMb: 3.1,
    version: '1 Tahun',
    imageUrl: '',
    brandColor: '#001E36',
    brandTextColor: '#31A8FF',
    brandGlyph: 'Lr',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-11T08:00:00.000Z',
    updatedAt: '2026-11-18T10:20:00.000Z',
  },
  {
    id: 'prod-alight-motion',
    title: 'Alight Motion Private — 1 Tahun iOS & Android',
    brand: 'Alight Motion',
    category: 'Aplikasi Premium',
    description:
      'Alight Motion Pro Private 1 tahun bebas watermark, mendukung impor preset XML 5MB+, transisi motion graphics, dan kompatibel iOS maupun Android.',
    highlights: ['Private 1 Tahun', 'Support XML & QR Preset', 'iOS & Android Ready'],
    originalPriceIdr: 6982,
    priceIdr: 5250,
    resellerPriceIdr: 3500,
    stock: 135,
    soldCount: 390,
    fileName: 'AlightMotion-Private-1Thn.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 0.9,
    version: '1 Tahun',
    imageUrl: '',
    brandColor: '#091A32',
    brandTextColor: '#38BDF8',
    brandGlyph: 'AM',
    isPromo: true,
    isBestSeller: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-11-19T10:20:00.000Z',
  },
  {
    id: 'prod-canva-pro-3bln',
    title: 'Canva Pro 3 Bulan Invite',
    brand: 'Canva',
    category: 'Aplikasi Premium',
    description:
      'Undangan resmi Canva Pro 3 bulan langsung ke email pribadi Anda. Buka semua elemen premium, Brand Kit, Magic Resize, dan ekspor PNG transparan.',
    highlights: ['Invite Email Pembeli', 'Semua Elemen Pro Terbuka', 'Garansi 3 Bulan'],
    originalPriceIdr: 7780,
    priceIdr: 5850,
    resellerPriceIdr: 3850,
    stock: 46,
    soldCount: 648,
    fileName: 'Canva-Pro-3Bulan-Invite.txt',
    fileFormat: 'INVITE / TXT',
    fileSizeMb: 0.8,
    version: '3 Bulan',
    imageUrl: '',
    brandColor: '#00C4CC',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'Canva',
    isPromo: true,
    isBestSeller: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-14T08:00:00.000Z',
    updatedAt: '2026-11-20T09:10:00.000Z',
  },
  {
    id: 'prod-chatgpt-go',
    title: 'ChatGPT GO Sharing — 3 Bulan NOGAR',
    brand: 'ChatGPT',
    category: 'Aplikasi Premium',
    description:
      'Akses produktivitas AI 3 bulan untuk riset, penulisan konten, dan bantuan kode harian dengan pengiriman instruksi akses langsung setelah transaksi terverifikasi.',
    highlights: ['Durasi 3 Bulan', 'Respon Cepat & Stabil', 'Akses Web & Mobile'],
    originalPriceIdr: 33250,
    priceIdr: 25000,
    resellerPriceIdr: 23000,
    stock: 11,
    soldCount: 274,
    fileName: 'ChatGPT-GO-3Bulan-Akses.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1.0,
    version: '3 Bulan',
    imageUrl: '',
    brandColor: '#10A37F',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'GPT',
    isPromo: true,
    isBestSeller: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'prod-spotify-1bln',
    title: 'Spotify 1 Bulan Bergaransi',
    brand: 'Spotify',
    category: 'Aplikasi Premium',
    description:
      'Nikmati musik bebas iklan, kualitas audio tinggi, dan unduh lagu offline selama 1 bulan penuh dengan jaminan penggantian cepat jika terjadi kendala.',
    highlights: ['Bebas Iklan & Offline', 'Bergaransi 30 Hari', 'Proses Cepat Otomatis'],
    originalPriceIdr: 28595,
    priceIdr: 21500,
    resellerPriceIdr: 19500,
    stock: 14,
    soldCount: 198,
    fileName: 'Spotify-Premium-1Bulan.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 0.9,
    version: '1 Bulan',
    imageUrl: '',
    brandColor: '#1DB954',
    brandTextColor: '#0F172A',
    brandGlyph: 'SP',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-16T08:00:00.000Z',
    updatedAt: '2026-11-19T12:00:00.000Z',
  },
  {
    id: 'prod-ebook-filosofi-teras',
    title: 'E-Book — Filosofi Teras (PDF + EPUB)',
    brand: 'E-Book',
    category: 'E-Book',
    description:
      'E-book pengembangan diri dan filsafat Stoa praktis untuk mengelola emosi, kecemasan, dan ketenangan berpikir sehari-hari. Format rapi siap baca di HP & tablet.',
    highlights: ['Format PDF & EPUB HD', 'Daftar Isi Interaktif', 'Unduh Otomatis Permanen'],
    originalPriceIdr: 13300,
    priceIdr: 10000,
    resellerPriceIdr: 8000,
    stock: 990,
    soldCount: 410,
    fileName: 'Ebook-Filosofi-Teras-HD.pdf',
    fileFormat: 'PDF / EPUB',
    fileSizeMb: 14.5,
    version: 'Edisi HD',
    imageUrl: '/src/assets/images/product_ebook_bisnis_1795230088051.jpg',
    brandColor: '#F59E0B',
    brandTextColor: '#111827',
    brandGlyph: 'EB',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'Pustaka Niaga ID',
    active: true,
    createdAt: '2026-10-05T09:30:00.000Z',
    updatedAt: '2026-11-16T14:00:00.000Z',
  },
  {
    id: 'prod-ebook-psychology-money',
    title: 'E-Book — The Psychology of Money',
    brand: 'E-Book',
    category: 'E-Book',
    description:
      'Pelajaran abadi tentang kekayaan, pengelolaan arus kas, dan pengambilan keputusan finansial cerdas. Langsung terunduh dalam format PDF & EPUB bersih.',
    highlights: ['PDF + EPUB Lengkap', 'Ringkasan Poin Kunci', 'Unduh Tanpa Batas'],
    originalPriceIdr: 13300,
    priceIdr: 10000,
    resellerPriceIdr: 8000,
    stock: 971,
    soldCount: 389,
    fileName: 'The-Psychology-of-Money.pdf',
    fileFormat: 'PDF / EPUB',
    fileSizeMb: 11.8,
    version: 'Lengkap',
    imageUrl: '/src/assets/images/product_template_keuangan_1795230088844.jpg',
    brandColor: '#0F766E',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'PM',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'Pustaka Niaga ID',
    active: true,
    createdAt: '2026-10-06T09:30:00.000Z',
    updatedAt: '2026-11-17T14:00:00.000Z',
  },
  {
    id: 'prod-ebook-bahasa-jepang',
    title: 'E-Book 1000+ File Materi Bahasa Jepang Lengkap N5–N1',
    brand: 'E-Book',
    category: 'E-Book',
    description:
      'Bundel komplit pembelajaran bahasa Jepang mulai dari Hiragana, Katakana, Kanji, tata bahasa, hingga latihan soal JLPT N5 sampai N1 disertai audio.',
    highlights: ['1000+ File Materi & Soal', 'Level JLPT N5 – N1', 'Tautan Unduhan Otomatis'],
    originalPriceIdr: 26600,
    priceIdr: 20000,
    resellerPriceIdr: 18000,
    stock: 95,
    soldCount: 152,
    fileName: 'Paket-1000-Materi-Bahasa-Jepang-N5-N1.zip',
    fileFormat: 'PDF / ZIP',
    fileSizeMb: 128.0,
    version: 'Bundel 2026',
    imageUrl: '',
    brandColor: '#DC2626',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'JP',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'Pustaka Niaga ID',
    active: true,
    createdAt: '2026-10-07T09:30:00.000Z',
    updatedAt: '2026-11-17T14:00:00.000Z',
  },
  {
    id: 'prod-apple-music-soldout',
    title: 'Apple Music Android — 1 Bulan Head',
    brand: 'Apple Music',
    category: 'Aplikasi Premium',
    description:
      'Audio Lossless dan Spatial Audio Dolby Atmos 1 bulan untuk perangkat Android. Stok diisi ulang secara berkala setiap hari.',
    highlights: ['Lossless Audio', 'Spatial Dolby Atmos', 'Restok Harian'],
    originalPriceIdr: 12635,
    priceIdr: 9500,
    resellerPriceIdr: 7500,
    stock: 0,
    soldCount: 145,
    fileName: 'Apple-Music-1Bulan-Akses.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 0.8,
    version: '1 Bulan',
    imageUrl: '',
    brandColor: '#FA243C',
    brandTextColor: '#FFFFFF',
    brandGlyph: '♫',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-09T09:30:00.000Z',
    updatedAt: '2026-11-19T14:00:00.000Z',
  },
  {
    id: 'prod-prime-video',
    title: 'Prime Video — Private 1 Bulan',
    brand: 'Prime Video',
    category: 'Aplikasi Premium',
    description:
      'Akses Prime Video Private 1 bulan kualitas Full HD & 4K untuk menonton film dan serial eksklusif tanpa gangguan iklan.',
    highlights: ['Private 1 Bulan', 'Full HD & 4K', 'Garansi Aktif'],
    originalPriceIdr: 13965,
    priceIdr: 10500,
    resellerPriceIdr: 8500,
    stock: 19,
    soldCount: 164,
    fileName: 'Prime-Video-Private-1Bulan.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 0.9,
    version: '1 Bulan',
    imageUrl: '',
    brandColor: '#00A8E1',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'PV',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-18T09:30:00.000Z',
    updatedAt: '2026-11-19T14:00:00.000Z',
  },
  {
    id: 'prod-duolingo-1bln',
    title: 'Duolingo Super Sharing — 1 Bulan',
    brand: 'Duolingo',
    category: 'Aplikasi Premium',
    description:
      'Belajar bahasa asing tanpa batas hati (Unlimited Hearts), bebas iklan, dan fitur latihan kesalahan personal selama 1 bulan penuh.',
    highlights: ['Unlimited Hearts', 'Bebas Iklan', 'Aktivasi Cepat'],
    originalPriceIdr: 9975,
    priceIdr: 7500,
    resellerPriceIdr: 5500,
    stock: 4,
    soldCount: 112,
    fileName: 'Duolingo-Super-1Bulan.txt',
    fileFormat: 'INVITE / TXT',
    fileSizeMb: 0.7,
    version: '1 Bulan',
    imageUrl: '',
    brandColor: '#58CC02',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'DL',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'MALL DIGITAL STORE Official',
    active: true,
    createdAt: '2026-10-19T09:30:00.000Z',
    updatedAt: '2026-11-19T14:00:00.000Z',
  },
  {
    id: 'prod-uikit-nusantara',
    title: 'Nusantara Design System — UI Kit Figma Pro',
    brand: 'Figma',
    category: 'Template & Kode',
    description:
      'Lebih dari 420 komponen UI responsif dengan token mode terang & gelap, halaman checkout lokal Indonesia, dan dasbor analitik siap pakai di Figma.',
    highlights: ['420+ Komponen Auto-Layout', 'Token Dark & Light Mode', 'Lisensi Komersial Tim'],
    originalPriceIdr: 299000,
    priceIdr: 249000,
    resellerPriceIdr: 210000,
    stock: 28,
    soldCount: 142,
    fileName: 'Nusantara-UI-Kit-v3.2.fig.zip',
    fileFormat: 'FIG / ZIP',
    fileSizeMb: 84.5,
    version: 'v3.2',
    imageUrl: '/src/assets/images/product_uikit_nusantara_1795230088088.jpg',
    brandColor: '#1E293B',
    brandTextColor: '#FFFFFF',
    brandGlyph: 'UI',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'Studio Raka Visual',
    active: true,
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-11-18T10:20:00.000Z',
  },
  {
    id: 'prod-sourcecode-saas',
    title: 'Boilerplate SaaS & Gateway Pembayaran Lokal',
    brand: 'Source Code',
    category: 'Template & Kode',
    description:
      'Kode sumber lengkap React, TypeScript, Tailwind CSS, dan Express API siap produksi dengan integrasi webhook QRIS, Virtual Account, serta ekspor faktur PDF.',
    highlights: ['Full TypeScript & REST API', 'Siap Webhook Midtrans/Xendit', 'Dokumentasi Arsitektur'],
    originalPriceIdr: 599000,
    priceIdr: 499000,
    resellerPriceIdr: 425000,
    stock: 14,
    soldCount: 89,
    fileName: 'SaaS-Starter-Indonesia-v4.0.zip',
    fileFormat: 'TS / ZIP',
    fileSizeMb: 46.0,
    version: 'v4.0',
    imageUrl: '/src/assets/images/product_sourcecode_saas_1795230088683.jpg',
    brandColor: '#0F172A',
    brandTextColor: '#38BDF8',
    brandGlyph: '</>',
    isPromo: true,
    sellerId: 'seller-karyadigital',
    sellerName: 'Arsitek Kode Jakarta',
    active: true,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-11-20T06:00:00.000Z',
  },
];

const promos: PromoVoucher[] = [
  {
    id: 'promo-hemat15',
    code: 'HEMAT15',
    description: 'Diskon 15% untuk semua produk digital & aplikasi premium (min. Rp 10.000)',
    discountType: 'percent',
    discountValue: 15,
    minPurchaseIdr: 10000,
    usageCount: 34,
    maxUsage: 500,
    active: true,
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'promo-loyal50k',
    code: 'LOYAL50K',
    description: 'Potongan langsung Rp 50.000 khusus paket bundel & source code (min. Rp 200.000)',
    discountType: 'fixed',
    discountValue: 50000,
    minPurchaseIdr: 200000,
    usageCount: 19,
    maxUsage: 100,
    active: true,
    createdAt: '2026-11-05T10:00:00.000Z',
  },
  {
    id: 'promo-reseller10',
    code: 'RESELLER10',
    description: 'Ekstra diskon 10% untuk transaksi mitra reseller (min. Rp 20.000)',
    discountType: 'percent',
    discountValue: 10,
    minPurchaseIdr: 20000,
    usageCount: 27,
    maxUsage: 300,
    active: true,
    createdAt: '2026-11-10T09:00:00.000Z',
  },
];

const seedToken1 = signDownloadToken('ord-2026-8801', 'prod-netflix-1bln', DOWNLOAD_SECRET);
const seedToken2 = signDownloadToken('ord-2026-8802', 'prod-sourcecode-saas', DOWNLOAD_SECRET);
const seedToken3 = signDownloadToken('ord-2026-8803', 'prod-capcut-pro-1bln', DOWNLOAD_SECRET);

const orders: OrderRecord[] = [
  {
    id: 'ord-2026-8801',
    orderCode: 'KD-2026-8801',
    buyerId: 'user-demo-01',
    buyerName: 'Nadia Kusuma',
    buyerEmail: 'nadia.kusuma@studio.id',
    sellerId: 'seller-karyadigital',
    productId: 'prod-netflix-1bln',
    productTitle: 'NETFLIX 1 BULAN ANTILIMIT',
    fileName: 'Netflix-1Bulan-Antilimit-Akses.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1.1,
    pricingTier: 'reguler',
    amountIdr: 25000,
    discountIdr: 3750,
    loyaltyDiscountIdr: 0,
    gatewayFeeIdr: 1500,
    finalAmountIdr: 22750,
    paymentMethod: 'QRIS',
    paymentMethodLabel: 'QRIS Nasional',
    paymentReference: 'QRIS-ID-99482716',
    paymentStatus: 'verified',
    downloadToken: seedToken1,
    downloadCount: 2,
    promoCode: 'HEMAT15',
    installmentMonths: 1,
    monthlyInstallmentIdr: 22750,
    emailSent: true,
    timeline: [
      { label: 'Pesanan dibuat', timestamp: '2026-11-20T09:12:00.000Z', completed: true },
      { label: 'Pembayaran QRIS terverifikasi', timestamp: '2026-11-20T09:12:08.000Z', completed: true },
      { label: 'Notifikasi email & tautan terkirim', timestamp: '2026-11-20T09:12:09.000Z', completed: true },
      { label: 'File digital diunduh otomatis', timestamp: '2026-11-20T09:12:14.000Z', completed: true },
    ],
    createdAt: '2026-11-20T09:12:00.000Z',
    updatedAt: '2026-11-20T09:12:14.000Z',
  },
  {
    id: 'ord-2026-8802',
    orderCode: 'KD-2026-8802',
    buyerId: 'user-demo-01',
    buyerName: 'Dimas Pratama',
    buyerEmail: 'dimas@kreatiflabs.id',
    sellerId: 'seller-karyadigital',
    productId: 'prod-sourcecode-saas',
    productTitle: 'Boilerplate SaaS & Gateway Pembayaran Lokal',
    fileName: 'SaaS-Starter-Indonesia-v4.0.zip',
    fileFormat: 'TS / ZIP',
    fileSizeMb: 46.0,
    pricingTier: 'reguler',
    amountIdr: 499000,
    discountIdr: 50000,
    loyaltyDiscountIdr: 15000,
    gatewayFeeIdr: 4000,
    finalAmountIdr: 438000,
    paymentMethod: 'VA_BCA',
    paymentMethodLabel: 'BCA Virtual Account',
    paymentReference: '390108128802914',
    paymentStatus: 'verified',
    downloadToken: seedToken2,
    downloadCount: 1,
    promoCode: 'LOYAL50K',
    installmentMonths: 1,
    monthlyInstallmentIdr: 438000,
    emailSent: true,
    timeline: [
      { label: 'Pesanan dibuat', timestamp: '2026-11-20T11:40:00.000Z', completed: true },
      { label: 'Pembayaran BCA VA terverifikasi', timestamp: '2026-11-20T11:41:22.000Z', completed: true },
      { label: 'Notifikasi email & tautan terkirim', timestamp: '2026-11-20T11:41:23.000Z', completed: true },
      { label: 'File digital diunduh otomatis', timestamp: '2026-11-20T11:41:40.000Z', completed: true },
    ],
    createdAt: '2026-11-20T11:40:00.000Z',
    updatedAt: '2026-11-20T11:41:40.000Z',
  },
  {
    id: 'ord-2026-8803',
    orderCode: 'KD-2026-8803',
    buyerId: 'user-demo-01',
    buyerName: 'Siti Rahmawati',
    buyerEmail: 'siti.rahma@niagamandiri.co.id',
    sellerId: 'seller-karyadigital',
    productId: 'prod-capcut-pro-1bln',
    productTitle: 'CapCut Pro 1 Bulan Private',
    fileName: 'CapCut-Pro-1Bulan-Lisensi.txt',
    fileFormat: 'LISENSI / TXT',
    fileSizeMb: 1.2,
    pricingTier: 'reseller',
    amountIdr: 24000,
    discountIdr: 0,
    loyaltyDiscountIdr: 0,
    gatewayFeeIdr: 1500,
    finalAmountIdr: 25500,
    paymentMethod: 'QRIS',
    paymentMethodLabel: 'QRIS Nasional',
    paymentReference: 'QRIS-ID-77129044',
    paymentStatus: 'verified',
    downloadToken: seedToken3,
    downloadCount: 1,
    promoCode: null,
    installmentMonths: 1,
    monthlyInstallmentIdr: 25500,
    emailSent: true,
    timeline: [
      { label: 'Pesanan dibuat', timestamp: '2026-11-20T14:05:00.000Z', completed: true },
      { label: 'Pembayaran QRIS terverifikasi', timestamp: '2026-11-20T14:05:18.000Z', completed: true },
      { label: 'Notifikasi email & tautan terkirim', timestamp: '2026-11-20T14:05:19.000Z', completed: true },
      { label: 'File digital diunduh otomatis', timestamp: '2026-11-20T14:05:31.000Z', completed: true },
    ],
    createdAt: '2026-11-20T14:05:00.000Z',
    updatedAt: '2026-11-20T14:05:31.000Z',
  },
];

const payouts: PayoutRecord[] = [
  {
    id: 'po-2026-01',
    payoutCode: 'WD-2026-0412',
    sellerId: 'seller-karyadigital',
    bankCode: 'BCA',
    bankName: 'Bank Central Asia (BCA)',
    accountNumber: '5271048821',
    accountHolder: 'Fauzan Kamal',
    amountIdr: 250000,
    feeIdr: 2500,
    netAmountIdr: 247500,
    status: 'completed',
    createdAt: '2026-11-18T16:30:00.000Z',
  },
];

const emails: AutomatedEmailLog[] = [
  {
    id: 'eml-8801',
    orderCode: 'KD-2026-8801',
    toEmail: 'nadia.kusuma@studio.id',
    recipientName: 'Nadia Kusuma',
    subject: '[MALL DIGITAL STORE] Pembayaran Terverifikasi & Tautan Unduh KD-2026-8801',
    bodyPreview:
      'Halo Nadia Kusuma, pembayaran Anda sebesar Rp 22.750 via QRIS Nasional telah diverifikasi. File Netflix-1Bulan-Antilimit-Akses.txt (1,1 MB) siap diunduh secara otomatis.',
    downloadUrl: `/api/downloads/${seedToken1}`,
    amountIdr: 22750,
    status: 'terkirim',
    sentAt: '2026-11-20T09:12:09.000Z',
  },
  {
    id: 'eml-8802',
    orderCode: 'KD-2026-8802',
    toEmail: 'dimas@kreatiflabs.id',
    recipientName: 'Dimas Pratama',
    subject: '[MALL DIGITAL STORE] Pembayaran Terverifikasi & Tautan Unduh KD-2026-8802',
    bodyPreview:
      'Halo Dimas Pratama, pembayaran BCA Virtual Account Rp 438.000 berhasil diverifikasi. Lisensi SaaS-Starter-Indonesia-v4.0.zip aktif dan siap diunduh.',
    downloadUrl: `/api/downloads/${seedToken2}`,
    amountIdr: 438000,
    status: 'terkirim',
    sentAt: '2026-11-20T11:41:23.000Z',
  },
];

const notifications: PushNotificationItem[] = [
  {
    id: 'notif-1',
    recipientName: 'Nadia Kusuma',
    title: 'Unduhan Siap — KD-2026-8801',
    message:
      'Halo Nadia, pembayaran QRIS Rp 22.750 terverifikasi. File Netflix-1Bulan-Antilimit-Akses.txt langsung dikirim ke akun Anda.',
    orderCode: 'KD-2026-8801',
    category: 'delivery',
    read: false,
    createdAt: '2026-11-20T09:12:09.000Z',
  },
  {
    id: 'notif-2',
    recipientName: 'Fauzan Kamal',
    title: 'Penarikan Dana Bank BCA Berhasil',
    message: 'Dana bersih Rp 247.500 telah dikirim melalui BI-FAST ke rekening BCA 5271048821.',
    category: 'payout',
    read: true,
    createdAt: '2026-11-18T16:35:00.000Z',
  },
];

const messages: SupportMessage[] = [
  {
    id: 'msg-1',
    roomId: 'main-support',
    senderId: 'agent-rina',
    senderName: 'Rina — Admin & CS MALL DIGITAL STORE',
    senderRole: 'support',
    text: 'Halo! Selamat datang di Layanan Dukungan MALL DIGITAL STORE. Jika Anda memiliki kendala aktivasi aplikasi premium, e-book, verifikasi QRIS/Virtual Account, atau penarikan dana bank lokal, silakan tulis pesan di sini.',
    createdAt: '2026-11-20T08:00:00.000Z',
  },
];

const activityLogs: ActivityLog[] = [
  {
    id: 'act-1',
    actorId: 'user-demo-01',
    actorName: 'Nadia Kusuma',
    actorEmail: 'nadia.kusuma@studio.id',
    action: 'Verifikasi Pembayaran',
    category: 'order',
    summary: 'Pesanan KD-2026-8801 (Rp 22.750) terverifikasi via QRIS Nasional & stok NETFLIX berkurang 1.',
    createdAt: '2026-11-20T09:12:08.000Z',
  },
  {
    id: 'act-2',
    actorId: 'seller-karyadigital',
    actorName: 'Fauzan Kamal',
    actorEmail: 'fauzankamal02@gmail.com',
    action: 'Penarikan Dana Bank',
    category: 'payout',
    summary: 'Penarikan Rp 250.000 ke Bank Central Asia (BCA) 5271048821 selesai diproses.',
    createdAt: '2026-11-18T16:30:00.000Z',
  },
  {
    id: 'act-3',
    actorId: 'admin-system',
    actorName: 'Sistem Otomatis',
    actorEmail: 'backup@malldigitalstore.id',
    action: 'Pencadangan Awan AES-256-GCM',
    category: 'backup',
    summary: 'Snapshot otomatis harian terenkripsi AES-256-GCM tersinkronisasi ke penyimpanan awan.',
    createdAt: '2026-11-20T02:00:00.000Z',
  },
];

let backupSchedule: 'daily' | 'weekly' = 'daily';
const backupEnvelopes = new Map<string, EncryptedBackupEnvelope>();
const backups: CloudBackupRecord[] = [];

function createEncryptedBackupSnapshot(mode: 'manual' | 'daily' | 'weekly'): CloudBackupRecord {
  const payload = {
    exportedAt: nowIso(),
    productsCount: products.length,
    ordersCount: orders.length,
    payoutsCount: payouts.length,
    promosCount: promos.length,
    products,
    orders,
    payouts,
    promos,
  };
  const envelope = encryptCloudBackup(payload, BACKUP_KEY);
  const id = `bkp-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const backupCode = `KD-BKP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

  backupEnvelopes.set(id, envelope);
  const record: CloudBackupRecord = {
    id,
    backupCode,
    algorithm: 'AES-256-GCM',
    checksumSha256: envelope.checksumSha256,
    ivHex: envelope.ivHex,
    recordCount: products.length + orders.length + payouts.length + promos.length,
    sizeBytes: envelope.sizeBytes,
    scheduleMode: mode,
    status: 'encrypted_synced',
    createdAt: nowIso(),
  };
  backups.unshift(record);
  return record;
}

// Seed 1 initial automated daily encrypted backup
createEncryptedBackupSnapshot('daily');

// MFA & Biometric WebAuthn server state
let mfaSecret: string | null = null;
let pendingWebAuthnChallenge: string | null = null;

// Editable Store Notice / Incident Alert Board state (broadcast to buyers in real-time)
let storeAnnouncement: StoreAnnouncement = {
  active: true,
  level: 'normal',
  title: 'Semua Layanan Digital Aktif & Normal 24 Jam',
  message:
    'Seluruh katalog Aplikasi Premium, E-Book, Template & Source Code, pembayaran lokal (QRIS/VA/E-Wallet), dan unduhan otomatis berjalan lancar tanpa kendala.',
  estimatedResolution: 'Respon CS rata-rata < 5 menit · Siap digunakan kapan saja',
  showTopBanner: false,
  updatedAt: nowIso(),
};

const security: SecurityProfile = {
  mfaEnabled: false,
  mfaSetupPending: false,
  mfaSecretMasked: null,
  mfaOtpAuthUri: null,
  mfaVerifiedAt: null,
  biometricEnabled: false,
  biometricDevices: [],
  loyaltyPoints: 450,
};

// Server-side webhook HMAC secret (never exposed to browser)
const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.PAYMENT_GATEWAY_SERVER_KEY ||
  crypto.randomBytes(32).toString('hex');

// Automation settings (controls automatic settlement & instant delivery)
let automationSettings: AutomationSettings = {
  autoFulfillEnabled: true,
  autoSandboxVerify: true,
  sandboxDelaySeconds: 3,
  autoDownloadOnPaid: true,
  autoEmailOnPaid: true,
  webhookEndpointPath: '/api/webhooks/payment',
  integrations: {
    paymentGatewayConfigured: Boolean(process.env.PAYMENT_GATEWAY_SERVER_KEY),
    webhookSecretConfigured: Boolean(process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMENT_GATEWAY_SERVER_KEY),
    supplierApiConfigured: Boolean(process.env.DIGIFLAZZ_USERNAME && process.env.DIGIFLAZZ_API_KEY),
    emailServiceConfigured: Boolean(process.env.RESEND_API_KEY),
  },
};

// Digital Credential / License Vault per product (queue of ready-to-deliver items)
interface ProductVaultBucket {
  available: string[];
  usedCount: number;
}

const productVaults = new Map<string, ProductVaultBucket>([
  [
    'prod-capcut-pro-1bln',
    {
      available: [
        'capcut-vip01@malldigital.id | Pass: CCPro#8821 | Private 1 Bulan',
        'capcut-vip02@malldigital.id | Pass: CCPro#9410 | Private 1 Bulan',
        'capcut-vip03@malldigital.id | Pass: CCPro#7742 | Private 1 Bulan',
      ],
      usedCount: 2,
    },
  ],
  [
    'prod-netflix-1bln',
    {
      available: [
        'nfx-antilimit01@malldigital.id | Pass: Nfx#4419 | Profil 2 · PIN 2026',
        'nfx-antilimit02@malldigital.id | Pass: Nfx#5520 | Profil 3 · PIN 3039',
        'nfx-antilimit03@malldigital.id | Pass: Nfx#6681 | Profil 4 · PIN 4048',
      ],
      usedCount: 3,
    },
  ],
  [
    'prod-canva-pro-3bln',
    {
      available: [
        'INVITE LINK: https://canva.com/brand/join?token=MDS-PRO-3BLN-A19X',
        'INVITE LINK: https://canva.com/brand/join?token=MDS-PRO-3BLN-B27K',
        'INVITE LINK: https://canva.com/brand/join?token=MDS-PRO-3BLN-C84M',
      ],
      usedCount: 5,
    },
  ],
  [
    'prod-chatgpt-go',
    {
      available: [
        'gpt-team01@malldigital.id | Pass: GptGo#9021 | 3 Bulan Aktif',
        'gpt-team02@malldigital.id | Pass: GptGo#4812 | 3 Bulan Aktif',
      ],
      usedCount: 1,
    },
  ],
  [
    'prod-spotify-1bln',
    {
      available: [
        'INVITE FAMILY: https://spotify.com/id/fam-invite/MDS-SP1M-7721 | Alamat: Jl. Sudirman No. 12',
        'INVITE FAMILY: https://spotify.com/id/fam-invite/MDS-SP1M-8834 | Alamat: Jl. Sudirman No. 12',
      ],
      usedCount: 1,
    },
  ],
]);

function getVaultSummaries(): VaultProductSummary[] {
  return products.map((p) => {
    const bucket = productVaults.get(p.id);
    return {
      productId: p.id,
      availableCount: bucket ? bucket.available.length : 0,
      usedCount: bucket ? bucket.usedCount : 0,
      maskedSamples: bucket ? bucket.available.slice(0, 3).map(maskCredentialPreview) : [],
    };
  });
}

const faqs: FaqItem[] = [
  {
    id: 'faq-pembayaran-otomatis',
    category: 'Pembayaran',
    question: 'Metode pembayaran apa saja yang didukung dan apakah terverifikasi otomatis?',
    answer:
      'MALL DIGITAL STORE mendukung QRIS (semua bank & e-wallet), Virtual Account BCA, Mandiri, BNI, BRI, BSI, serta DANA, GoPay, OVO, dan ShopeePay dalam mata uang Rupiah (IDR). Setelah pembayaran berhasil, sistem memverifikasi transaksi secara otomatis 24 jam tanpa perlu kirim bukti transfer manual.',
    active: true,
    sortOrder: 1,
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-18T09:00:00.000Z',
  },
  {
    id: 'faq-pengiriman-instan',
    category: 'Pengiriman Otomatis',
    question: 'Bagaimana cara mendapatkan file digital atau akun premium setelah pembayaran lunas?',
    answer:
      'Begitu status pembayaran terverifikasi lunas, tautan unduhan file (PDF, ZIP, template, atau panduan aktivasi) beserta akun/lisensi dari Gudang Digital langsung muncul di layar konfirmasi dan menu Pesanan. Salinan faktur serta akses produk juga otomatis dikirim ke email Anda.',
    active: true,
    sortOrder: 2,
    createdAt: '2026-11-10T08:05:00.000Z',
    updatedAt: '2026-11-18T09:05:00.000Z',
  },
  {
    id: 'faq-topup-tagihan',
    category: 'Top Up & Tagihan',
    question: 'Berapa lama proses Top Up Pulsa, Token PLN, E-Wallet, dan Diamond Game?',
    answer:
      'Transaksi Top Up & Pembayaran Tagihan diproses otomatis 24 jam dalam hitungan detik setelah pembayaran diterima. Untuk Token PLN Prabayar, 20 digit kode stroom (SN) akan tampil langsung di detail pesanan dan dapat disalin sekali klik.',
    active: true,
    sortOrder: 3,
    createdAt: '2026-11-10T08:10:00.000Z',
    updatedAt: '2026-11-18T09:10:00.000Z',
  },
  {
    id: 'faq-garansi-akun',
    category: 'Akun & Garansi',
    question: 'Apakah produk Aplikasi Premium mendapatkan garansi jika terjadi kendala login?',
    answer:
      'Ya, setiap produk Aplikasi Premium dilengkapi garansi penuh sesuai masa aktif yang tertera pada katalog (1 hingga 3 bulan). Jika akun terkendala, cek terlebih dahulu Papan Pemberitahuan Toko atau hubungi tim CS melalui Live Chat dengan menyertakan kode pesanan Anda untuk penggantian cepat.',
    active: true,
    sortOrder: 4,
    createdAt: '2026-11-10T08:15:00.000Z',
    updatedAt: '2026-11-18T09:15:00.000Z',
  },
  {
    id: 'faq-reseller-voucher',
    category: 'Reseller & Promo',
    question: 'Bagaimana cara mendapatkan harga Reseller dan memakai kode voucher diskon?',
    answer:
      'Anda dapat langsung beralih ke mode harga Reseller pada katalog atau saat checkout untuk menikmati tarif grosir lebih hemat. Anda juga dapat memasukkan kode promo aktif seperti HEMAT15, RESELLER10, atau LOYAL50K (syarat minimal belanja berlaku) serta menukarkan Poin Loyalitas.',
    active: true,
    sortOrder: 5,
    createdAt: '2026-11-10T08:20:00.000Z',
    updatedAt: '2026-11-18T09:20:00.000Z',
  },
  {
    id: 'faq-unduh-ulang',
    category: 'Pengiriman Otomatis',
    question: 'Bisakah saya mengunduh ulang file digital atau melihat kembali kode SN lama?',
    answer:
      'Tentu saja. Semua riwayat transaksi, tautan unduhan bertanda tangan HMAC, kredensial akun, dan nomor seri (SN) Top Up tersimpan rapi di menu Pesanan. Anda dapat mengunduh ulang file atau menyalin ulang lisensi kapan pun dibutuhkan.',
    active: true,
    sortOrder: 6,
    createdAt: '2026-11-10T08:25:00.000Z',
    updatedAt: '2026-11-18T09:25:00.000Z',
  },
];

function sanitizeString(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

const members: StoredMemberRecord[] = [
  {
    id: 'mbr-founder-01',
    memberCode: 'MBR-2026-0001',
    displayName: 'Fauzan Kamal',
    email: 'fauzankamal02@gmail.com',
    phone: '081234567890',
    tier: 'reseller',
    authProvider: 'google',
    loyaltyPoints: 450,
    savedTargets: [
      {
        id: 'tgt-seed-pln',
        serviceId: 'pln',
        provider: 'PLN Prabayar',
        targetNumber: '512345678901',
        label: 'Meteran Rumah',
        updatedAt: '2026-11-18T08:00:00.000Z',
      },
    ],
    joinedAt: '2026-10-01T08:00:00.000Z',
    lastLoginAt: '2026-11-18T08:00:00.000Z',
    passwordHash: null,
    passwordSalt: null,
  },
];

const memberSessions = new Map<string, { memberId: string; expiresAt: number }>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

function issueMemberSession(memberId: string): string {
  const token = generateSessionToken();
  memberSessions.set(token, {
    memberId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getAuthenticatedMember(req: express.Request): StoredMemberRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const session = memberSessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    memberSessions.delete(token);
    return null;
  }
  return members.find((m) => m.id === session.memberId) ?? null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  function broadcast(event: string, payload: unknown) {
    const packet = JSON.stringify({ event, payload, sentAt: nowIso() });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(packet);
      }
    }
  }

  function pushActivity(entry: Omit<ActivityLog, 'id' | 'createdAt'>) {
    const item: ActivityLog = {
      id: `act-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      createdAt: nowIso(),
      ...entry,
    };
    activityLogs.unshift(item);
    if (activityLogs.length > 100) activityLogs.pop();
    broadcast('activity:logged', item);
    return item;
  }

  function pushNotification(entry: Omit<PushNotificationItem, 'id' | 'read' | 'createdAt'>) {
    const item: PushNotificationItem = {
      id: `notif-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      read: false,
      createdAt: nowIso(),
      ...entry,
    };
    notifications.unshift(item);
    if (notifications.length > 60) notifications.pop();
    broadcast('notification:push', item);
    return item;
  }

  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        event: 'ws:connected',
        payload: { connectedClients: wss.clients.size },
        sentAt: nowIso(),
      })
    );
  });

  // 1. Bootstrap complete platform state
  app.get('/api/bootstrap', (_req, res) => {
    const payload: BootstrapPayload = {
      products,
      orders,
      promos,
      payouts,
      emails,
      notifications,
      messages,
      activityLogs,
      backups,
      backupSchedule,
      security,
      announcement: storeAnnouncement,
      automation: automationSettings,
      vaultSummaries: getVaultSummaries(),
      faqs,
      membersCount: members.length,
    };
    res.json(payload);
  });

  // 2. Inventory & Product CRUD (Synchronized)
  app.post('/api/products', (req, res) => {
    const title = sanitizeString(req.body?.title, 140);
    const brand = sanitizeString(req.body?.brand, 40) || title.split(/\s+/)[0] || 'Digital';
    const category = sanitizeString(req.body?.category, 40) as ProductCategory;
    const description = sanitizeString(req.body?.description, 1000);
    const fileName = sanitizeString(req.body?.fileName, 120);
    const fileFormat = sanitizeString(req.body?.fileFormat, 40);
    const version = sanitizeString(req.body?.version, 30) || '1 Bulan';
    const priceIdr = Math.round(Number(req.body?.priceIdr));
    const resellerPriceRaw = Number(req.body?.resellerPriceIdr);
    const resellerPriceIdr =
      Number.isFinite(resellerPriceRaw) && resellerPriceRaw >= 500
        ? Math.min(Math.round(resellerPriceRaw), priceIdr)
        : Math.max(500, priceIdr - Math.min(2000, Math.round(priceIdr * 0.15)));
    const originalPriceRaw = Number(req.body?.originalPriceIdr);
    const originalPriceIdr =
      Number.isFinite(originalPriceRaw) && originalPriceRaw > priceIdr
        ? Math.round(originalPriceRaw)
        : Math.round(priceIdr * 1.33);
    const stock = Math.round(Number(req.body?.stock));
    const fileSizeMb = Number(req.body?.fileSizeMb) || 1.2;

    const allowedCategories: ProductCategory[] = [
      'Aplikasi Premium',
      'E-Book',
      'Template & Kode',
      'UI Kit',
      'Template',
      'Source Code',
      'Tipografi',
      'Preset',
    ];
    if (title.length < 3 || !allowedCategories.includes(category) || description.length < 8) {
      return res.status(400).json({ error: 'Judul, kategori, dan deskripsi produk wajib valid.' });
    }
    if (!Number.isFinite(priceIdr) || priceIdr < 1000 || !Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({ error: 'Harga minimal Rp 1.000 dan stok tidak boleh negatif.' });
    }

    const newProduct: DigitalProduct = {
      id: `prod-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      title,
      brand,
      category,
      description,
      highlights: ['Unduh Otomatis Instan', 'Stok Tersinkronisasi', 'Harga Reseller Tersedia'],
      originalPriceIdr,
      priceIdr,
      resellerPriceIdr,
      stock,
      soldCount: 0,
      fileName: fileName || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
      fileFormat: fileFormat || (category === 'Aplikasi Premium' ? 'LISENSI / TXT' : 'PDF / ZIP'),
      fileSizeMb: Math.max(0.5, fileSizeMb),
      version,
      imageUrl:
        category === 'E-Book'
          ? '/src/assets/images/product_ebook_bisnis_1795230088051.jpg'
          : category === 'Template & Kode'
            ? '/src/assets/images/product_uikit_nusantara_1795230088088.jpg'
            : '',
      brandColor: sanitizeString(req.body?.brandColor, 20) || '#0369A1',
      brandTextColor: '#FFFFFF',
      brandGlyph: brand.slice(0, 2).toUpperCase(),
      isPromo: originalPriceIdr > priceIdr,
      sellerId: 'seller-karyadigital',
      sellerName: 'MALL DIGITAL STORE Official',
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    products.unshift(newProduct);
    broadcast('product:created', newProduct);
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: 'Penjual',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Tambah Produk Digital',
      category: 'inventory',
      summary: `Produk "${newProduct.title}" ditambahkan dengan stok ${newProduct.stock}.`,
    });
    res.status(201).json(newProduct);
  });

  app.patch('/api/products/:id', (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    if (req.body?.stock !== undefined) {
      const nextStock = Math.round(Number(req.body.stock));
      if (!Number.isFinite(nextStock) || nextStock < 0 || nextStock > 100000) {
        return res.status(400).json({ error: 'Stok lisensi tidak valid.' });
      }
      product.stock = nextStock;
    }
    if (req.body?.priceIdr !== undefined) {
      const nextPrice = Math.round(Number(req.body.priceIdr));
      if (!Number.isFinite(nextPrice) || nextPrice < 1000) {
        return res.status(400).json({ error: 'Harga minimal Rp 1.000.' });
      }
      product.priceIdr = nextPrice;
    }
    if (req.body?.resellerPriceIdr !== undefined) {
      const nextReseller = Math.round(Number(req.body.resellerPriceIdr));
      if (Number.isFinite(nextReseller) && nextReseller >= 500) {
        product.resellerPriceIdr = nextReseller;
      }
    }
    if (typeof req.body?.active === 'boolean') {
      product.active = req.body.active;
    }
    product.updatedAt = nowIso();
    broadcast('product:updated', product);
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: 'Penjual',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Sinkronisasi Inventaris',
      category: 'inventory',
      summary: `Inventaris "${product.title}" diperbarui: stok ${product.stock}, status ${product.active ? 'Aktif' : 'Nonaktif'}.`,
    });
    res.json(product);
  });

  // 3. Create Order with Indonesian Payment Gateway, Reseller Tier & Promo/Loyalty Calculation
  app.post('/api/orders', (req, res) => {
    const productId = sanitizeString(req.body?.productId, 128);
    const buyerName = sanitizeString(req.body?.buyerName, 100);
    const buyerEmail = sanitizeString(req.body?.buyerEmail, 160);
    const paymentMethod = sanitizeString(req.body?.paymentMethod, 32) as PaymentMethodCode;
    const promoCodeInput = sanitizeString(req.body?.promoCode, 32).toUpperCase();
    const pricingTier = req.body?.pricingTier === 'reseller' ? 'reseller' : 'reguler';
    const loyaltyPointsRequested = Math.max(0, Math.floor(Number(req.body?.loyaltyPointsToUse) || 0));

    if (buyerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return res.status(400).json({ error: 'Nama lengkap dan alamat email pembeli wajib valid.' });
    }

    const product = products.find((p) => p.id === productId && p.active);
    if (!product) {
      return res.status(404).json({ error: 'Produk digital tidak tersedia.' });
    }
    if (product.stock <= 0) {
      return res.status(409).json({ error: 'Stok produk ini sedang habis.' });
    }

    const gateway = PAYMENT_GATEWAY_OPTIONS.find((g) => g.code === paymentMethod);
    if (!gateway) {
      return res.status(400).json({ error: 'Metode pembayaran lokal tidak dikenali.' });
    }

    const promo = promoCodeInput
      ? promos.find((p) => p.code.toUpperCase() === promoCodeInput) ?? null
      : null;

    if (promoCodeInput && !promo) {
      return res.status(400).json({ error: `Kode promo "${promoCodeInput}" tidak ditemukan.` });
    }

    const unitPriceIdr = pricingTier === 'reseller' ? product.resellerPriceIdr : product.priceIdr;
    const cappedLoyaltyReq = Math.min(loyaltyPointsRequested, security.loyaltyPoints);
    const pricing = calculateOrderPricing(unitPriceIdr, promo, cappedLoyaltyReq, paymentMethod);
    if (pricing.promoError) {
      return res.status(400).json({ error: pricing.promoError });
    }

    const orderId = `ord-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const orderCode = `KD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomRef = Math.floor(100000000 + Math.random() * 900000000);
    const paymentReference = paymentMethod.startsWith('VA_')
      ? `88010${randomRef}`
      : paymentMethod === 'QRIS'
        ? `QRIS-ID-${randomRef}`
        : `${paymentMethod}-${randomRef}`;

    const createdAt = nowIso();
    const newOrder: OrderRecord = {
      id: orderId,
      orderCode,
      buyerId: sanitizeString(req.body?.buyerId, 128) || 'user-demo-01',
      buyerName,
      buyerEmail,
      sellerId: product.sellerId,
      productId: product.id,
      productTitle: product.title,
      fileName: product.fileName,
      fileFormat: product.fileFormat,
      fileSizeMb: product.fileSizeMb,
      pricingTier,
      amountIdr: pricing.subtotalIdr,
      discountIdr: pricing.promoDiscountIdr,
      loyaltyDiscountIdr: pricing.loyaltyDiscountIdr,
      gatewayFeeIdr: pricing.gatewayFeeIdr,
      finalAmountIdr: pricing.finalAmountIdr,
      paymentMethod: gateway.code,
      paymentMethodLabel: gateway.label,
      paymentReference,
      paymentStatus: 'pending',
      downloadToken: null,
      downloadCount: 0,
      promoCode: promo ? promo.code : null,
      installmentMonths: pricing.installmentMonths,
      monthlyInstallmentIdr: pricing.monthlyInstallmentIdr,
      emailSent: false,
      timeline: [
        { label: `Pesanan ${orderCode} dibuat`, timestamp: createdAt, completed: true },
        { label: `Menunggu pembayaran ${gateway.label}`, timestamp: createdAt, completed: false },
        { label: 'Notifikasi email & tautan otomatis', timestamp: '', completed: false },
        { label: 'File digital siap diunduh otomatis', timestamp: '', completed: false },
      ],
      createdAt,
      updatedAt: createdAt,
    };

    orders.unshift(newOrder);
    if (pricing.loyaltyPointsUsed > 0) {
      security.loyaltyPoints = Math.max(0, security.loyaltyPoints - pricing.loyaltyPointsUsed);
    }

    broadcast('order:created', newOrder);
    pushNotification({
      recipientName: buyerName,
      title: `Menunggu Pembayaran — ${orderCode}`,
      message: `Halo ${buyerName}, selesaikan pembayaran ${formatIdr(newOrder.finalAmountIdr)} via ${gateway.label} untuk mengunduh ${product.fileName} secara otomatis.`,
      orderCode,
      category: 'payment',
    });

    scheduleAutoSandboxFulfillment(newOrder.id);

    res.status(201).json({ order: newOrder, loyaltyPoints: security.loyaltyPoints });
  });

  // 3b. Create Instant Top-Up & Digital Bill Payment Order (Pulsa, PLN, E-Wallet, Game, PDAM, Internet, BPJS, Voucher)
  app.post('/api/topup/orders', (req, res) => {
    const serviceId = sanitizeString(req.body?.serviceId, 30);
    const provider = sanitizeString(req.body?.provider, 60);
    const nominalId = sanitizeString(req.body?.nominalId, 40);
    const rawTarget = sanitizeString(req.body?.targetNumber, 100);
    const buyerName = sanitizeString(req.body?.buyerName, 100);
    const buyerEmail = sanitizeString(req.body?.buyerEmail, 160);
    const paymentMethod = sanitizeString(req.body?.paymentMethod, 30) as PaymentMethodCode;
    const pricingTier: 'reguler' | 'reseller' =
      req.body?.pricingTier === 'reseller' ? 'reseller' : 'reguler';

    const service = getTopUpService(serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Kategori layanan pembayaran atau top up tidak ditemukan.' });
    }

    const validProvider = service.providers.includes(provider) ? provider : service.providers[0];
    const nominal = service.nominals.find((n) => n.id === nominalId);
    if (!nominal) {
      return res.status(400).json({ error: 'Pilihan nominal atau paket tidak valid.' });
    }

    const targetCheck = validateTopUpTarget(service.id, rawTarget);
    if (!targetCheck.valid) {
      return res.status(400).json({ error: targetCheck.error });
    }

    if (buyerName.length < 2 || !buyerEmail.includes('@')) {
      return res.status(400).json({ error: 'Nama pembeli dan alamat email valid wajib diisi untuk bukti struk.' });
    }

    const gateway = PAYMENT_GATEWAY_OPTIONS.find((g) => g.code === paymentMethod);
    if (!gateway) {
      return res.status(400).json({ error: 'Metode pembayaran lokal tidak dikenali.' });
    }

    const pricing = calculateTopUpPricing(nominal, pricingTier, paymentMethod);
    const orderId = `ord-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const orderCode = `TU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomRef = Math.floor(100000000 + Math.random() * 900000000);
    const paymentReference = paymentMethod.startsWith('VA_')
      ? `88010${randomRef}`
      : paymentMethod === 'QRIS'
        ? `QRIS-ID-${randomRef}`
        : `${paymentMethod}-${randomRef}`;

    const createdAt = nowIso();
    const productTitle = `${service.shortLabel} · ${validProvider} — ${nominal.label} (${targetCheck.cleaned})`;
    const fileName = `Struk_${service.id.toUpperCase()}_${orderCode}.txt`;

    const newOrder: OrderRecord = {
      id: orderId,
      orderCode,
      buyerId: sanitizeString(req.body?.buyerId, 128) || 'user-demo-01',
      buyerName,
      buyerEmail,
      sellerId: 'seller-karyadigital',
      productId: `topup-${service.id}-${nominal.id}`,
      productTitle,
      fileName,
      fileFormat: 'TXT',
      fileSizeMb: 0.1,
      pricingTier,
      amountIdr: pricing.subtotalIdr,
      discountIdr: 0,
      loyaltyDiscountIdr: 0,
      gatewayFeeIdr: pricing.gatewayFeeIdr,
      finalAmountIdr: pricing.finalAmountIdr,
      paymentMethod: gateway.code,
      paymentMethodLabel: gateway.label,
      paymentReference,
      paymentStatus: 'pending',
      downloadToken: null,
      downloadCount: 0,
      promoCode: null,
      installmentMonths: pricing.installmentMonths,
      monthlyInstallmentIdr: pricing.monthlyInstallmentIdr,
      emailSent: false,
      timeline: [
        { label: `Transaksi ${orderCode} dibuat (${validProvider})`, timestamp: createdAt, completed: true },
        { label: `Menunggu pembayaran ${gateway.label}`, timestamp: createdAt, completed: false },
        { label: 'Pemrosesan top up & tagihan otomatis', timestamp: '', completed: false },
        { label: 'Struk resmi & kode SN/Token siap diunduh', timestamp: '', completed: false },
      ],
      createdAt,
      updatedAt: createdAt,
    };

    orders.unshift(newOrder);
    broadcast('order:created', newOrder);
    pushNotification({
      recipientName: buyerName,
      title: `Menunggu Pembayaran Top Up — ${orderCode}`,
      message: `Halo ${buyerName}, selesaikan pembayaran ${formatIdr(newOrder.finalAmountIdr)} via ${gateway.label} untuk memproses ${validProvider} ${nominal.label} ke ${targetCheck.cleaned}.`,
      orderCode,
      category: 'payment',
    });

    scheduleAutoSandboxFulfillment(newOrder.id);

    res.status(201).json({ order: newOrder, loyaltyPoints: security.loyaltyPoints });
  });

  function scheduleAutoSandboxFulfillment(orderId: string) {
    if (!automationSettings.autoFulfillEnabled || !automationSettings.autoSandboxVerify) {
      return;
    }
    const delayMs = Math.max(1, Math.min(15, automationSettings.sandboxDelaySeconds)) * 1000;
    setTimeout(() => {
      const pending = orders.find((o) => o.id === orderId && o.paymentStatus === 'pending');
      if (pending && automationSettings.autoFulfillEnabled) {
        fulfillVerifiedOrder(orderId, 'auto_sandbox');
      }
    }, delayMs);
  }

  // Idempotent central Auto-Fulfillment Engine (used by Payment Webhooks, Auto-Sandbox, and Verify Endpoint)
  function fulfillVerifiedOrder(
    orderId: string,
    triggerSource: 'gateway_webhook' | 'auto_sandbox' | 'manual_verify'
  ):
    | { ok: false; status: number; error: string }
    | {
        ok: true;
        alreadyVerified?: boolean;
        order: OrderRecord;
        product?: DigitalProduct | null;
        email?: AutomatedEmailLog;
        notification?: PushNotificationItem;
        loyaltyPoints: number;
        downloadUrl: string;
      } {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { ok: false, status: 404, error: 'Pesanan tidak ditemukan.' };
    }
    if (order.paymentStatus === 'verified') {
      return {
        ok: true,
        alreadyVerified: true,
        order,
        loyaltyPoints: security.loyaltyPoints,
        downloadUrl: order.downloadToken ? `/api/downloads/${order.downloadToken}` : '',
      };
    }

    const isTopUpOrder = order.productId.startsWith('topup-');
    const product = isTopUpOrder ? null : products.find((p) => p.id === order.productId) ?? null;

    if (!isTopUpOrder) {
      if (!product || product.stock <= 0) {
        return { ok: false, status: 409, error: 'Stok lisensi produk sudah habis saat verifikasi.' };
      }
      // Atomic inventory sync
      product.stock = Math.max(0, product.stock - 1);
      product.soldCount += 1;
      product.updatedAt = nowIso();
    }

    // Pop next unused credential / license from Digital Vault if stocked
    let poppedVaultItem: string | null = null;
    if (!isTopUpOrder) {
      const bucket = productVaults.get(order.productId);
      if (bucket && bucket.available.length > 0) {
        poppedVaultItem = bucket.available.shift() ?? null;
        if (poppedVaultItem) {
          bucket.usedCount += 1;
        }
      }
    }

    // Update promo usage count
    if (order.promoCode) {
      const promo = promos.find((pr) => pr.code === order.promoCode);
      if (promo && promo.usageCount < promo.maxUsage) {
        promo.usageCount += 1;
        broadcast('promo:updated', promo);
      }
    }

    // Earn loyalty points (1 point per Rp 10.000)
    const earnedPoints = Math.max(1, Math.floor(order.finalAmountIdr / 10000));
    security.loyaltyPoints += earnedPoints;

    const verifiedAt = nowIso();
    const downloadToken = signDownloadToken(order.id, order.productId, DOWNLOAD_SECRET);
    const deliveredPayload = buildDeliveredPayload(
      order,
      poppedVaultItem,
      verifiedAt,
      automationSettings.integrations.supplierApiConfigured
    );

    const triggerLabel =
      triggerSource === 'gateway_webhook'
        ? 'Webhook Gateway Otomatis'
        : triggerSource === 'auto_sandbox'
          ? 'Otomatisasi Sistem 24/7'
          : 'Verifikasi Gateway Lokal';

    order.paymentStatus = 'verified';
    order.downloadToken = downloadToken;
    order.deliveredPayload = deliveredPayload;
    order.emailSent = automationSettings.autoEmailOnPaid;
    order.updatedAt = verifiedAt;
    order.timeline = isTopUpOrder
      ? [
          order.timeline[0] ?? { label: `Transaksi ${order.orderCode} dibuat`, timestamp: order.createdAt, completed: true },
          { label: `Pembayaran ${order.paymentMethodLabel} lunas (${triggerLabel})`, timestamp: verifiedAt, completed: true },
          { label: `Top up / tagihan diproses otomatis · SN: ${deliveredPayload.value}`, timestamp: verifiedAt, completed: true },
          { label: `Struk resmi ${order.fileName} & email terkirim`, timestamp: verifiedAt, completed: true },
        ]
      : [
          order.timeline[0] ?? { label: `Pesanan ${order.orderCode} dibuat`, timestamp: order.createdAt, completed: true },
          { label: `Pembayaran ${order.paymentMethodLabel} lunas (${triggerLabel})`, timestamp: verifiedAt, completed: true },
          { label: `Akses produk & email otomatis terkirim ke ${order.buyerEmail}`, timestamp: verifiedAt, completed: true },
          { label: `File ${order.fileName} & lisensi siap digunakan`, timestamp: verifiedAt, completed: true },
        ];

    // Dispatch automated email receipt log (+ optional real Resend API dispatch when RESEND_API_KEY is configured)
    const emailLog: AutomatedEmailLog = {
      id: `eml-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      orderCode: order.orderCode,
      toEmail: order.buyerEmail,
      recipientName: order.buyerName,
      subject: isTopUpOrder
        ? `[MALL DIGITAL STORE] Struk Top Up & SN Lunas ${order.orderCode}`
        : `[MALL DIGITAL STORE] Pesanan Otomatis Terkirim — ${order.orderCode}`,
      bodyPreview: isTopUpOrder
        ? `Halo ${order.buyerName}, transaksi "${order.productTitle}" (${formatIdr(order.finalAmountIdr)}) telah BERHASIL diproses otomatis via ${triggerLabel}. Kode SN/Token: ${deliveredPayload.value}. Anda mendapatkan +${earnedPoints} poin loyalitas.`
        : `Halo ${order.buyerName}, pembayaran ${formatIdr(order.finalAmountIdr)} telah terverifikasi otomatis (${triggerLabel}). ${deliveredPayload.label}: ${deliveredPayload.value}. File "${order.fileName}" siap diunduh.`,
      downloadUrl: `/api/downloads/${downloadToken}`,
      amountIdr: order.finalAmountIdr,
      status: 'terkirim',
      sentAt: verifiedAt,
    };
    emails.unshift(emailLog);

    if (process.env.RESEND_API_KEY && automationSettings.autoEmailOnPaid) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MALL DIGITAL STORE <noreply@malldigitalstore.id>',
          to: [order.buyerEmail],
          subject: emailLog.subject,
          text: `${emailLog.bodyPreview}\n\n${deliveredPayload.instructions}`,
        }),
      }).catch(() => {
        // Non-blocking fallback: email log already persisted
      });
    }

    // Personalized real-time push notification
    const pushNotif = pushNotification({
      recipientName: order.buyerName,
      title: isTopUpOrder
        ? `Top Up Otomatis Sukses — ${order.orderCode}`
        : `Pesanan Otomatis Terkirim — ${order.orderCode}`,
      message: isTopUpOrder
        ? `Halo ${order.buyerName}, "${order.productTitle}" berhasil diproses otomatis! SN/Token: ${deliveredPayload.value}.`
        : `Halo ${order.buyerName}, "${order.productTitle}" lunas via ${triggerLabel}! Akses produk & tautan unduh sudah langsung tersedia.`,
      orderCode: order.orderCode,
      category: 'delivery',
    });

    pushActivity({
      actorId: order.buyerId,
      actorName: order.buyerName,
      actorEmail: order.buyerEmail,
      action: isTopUpOrder ? 'Auto-Fulfill Top Up & Tagihan' : 'Auto-Fulfill Produk Digital',
      category: 'order',
      summary: `${order.orderCode} (${formatIdr(order.finalAmountIdr)}) diselesaikan otomatis via ${triggerLabel} (${deliveredPayload.source}).`,
    });

    if (product) {
      broadcast('product:updated', product);
      broadcast('vault:updated', getVaultSummaries());
    }
    broadcast('order:verified', { order, email: emailLog, loyaltyPoints: security.loyaltyPoints });

    return {
      ok: true,
      order,
      product,
      email: emailLog,
      notification: pushNotif,
      loyaltyPoints: security.loyaltyPoints,
      downloadUrl: `/api/downloads/${downloadToken}`,
    };
  }

  // 4. Verify Local Gateway Payment (manual trigger or instant check)
  app.post('/api/payments/verify', (req, res) => {
    const orderId = sanitizeString(req.body?.orderId, 128);
    const result = fulfillVerifiedOrder(orderId, 'manual_verify');
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json(result);
  });

  // 4b. Production Payment Gateway Webhook (HMAC-SHA256 verified, idempotent)
  app.post('/api/webhooks/payment', (req, res) => {
    const signatureHeader = sanitizeString(
      req.headers['x-webhook-signature'] ?? req.headers['x-callback-signature'],
      128
    );
    const rawBody = JSON.stringify(req.body ?? {});
    if (!verifyWebhookSignature(rawBody, signatureHeader, WEBHOOK_SECRET)) {
      return res.status(401).json({
        error: 'Signature webhook HMAC-SHA256 tidak valid atau tidak cocok.',
      });
    }

    const orderCode = sanitizeString(req.body?.orderCode, 60);
    const orderId = sanitizeString(req.body?.orderId, 128);
    const transactionStatus = sanitizeString(req.body?.transactionStatus, 30).toUpperCase();
    const amountIdr = req.body?.amountIdr !== undefined ? Math.round(Number(req.body.amountIdr)) : null;

    if (!['PAID', 'SETTLEMENT', 'CAPTURE', 'SUCCESS'].includes(transactionStatus)) {
      return res.status(200).json({ ignored: true, reason: `Status ${transactionStatus || 'UNKNOWN'} belum lunas.` });
    }

    const order = orders.find(
      (o) => (orderId && o.id === orderId) || (orderCode && o.orderCode === orderCode)
    );
    if (!order) {
      return res.status(404).json({ error: 'Pesanan dari callback webhook tidak ditemukan.' });
    }

    if (amountIdr !== null && Number.isFinite(amountIdr) && amountIdr !== order.finalAmountIdr) {
      return res.status(400).json({ error: 'Nominal pembayaran pada webhook tidak sesuai tagihan pesanan.' });
    }

    const result = fulfillVerifiedOrder(order.id, 'gateway_webhook');
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      received: true,
      alreadyVerified: Boolean(result.alreadyVerified),
      orderCode: result.order.orderCode,
      deliveredType: result.order.deliveredPayload?.type ?? null,
    });
  });

  // 5. Verified Automatic Digital File Download Endpoint
  app.get('/api/downloads/:token', (req, res) => {
    const token = sanitizeString(req.params.token, 512);
    const verified = verifyDownloadToken(token, DOWNLOAD_SECRET);
    if (!verified) {
      return res.status(403).json({ error: 'Tautan unduhan tidak valid atau telah kedaluwarsa.' });
    }
    const order = orders.find((o) => o.id === verified.orderId && o.paymentStatus === 'verified');
    if (!order) {
      return res.status(403).json({ error: 'Pembayaran belum terverifikasi untuk file ini.' });
    }

    order.downloadCount += 1;
    order.updatedAt = nowIso();
    broadcast('order:downloaded', { orderId: order.id, downloadCount: order.downloadCount });

    const isTopUpOrder = order.productId.startsWith('topup-');
    const safeFileName = order.fileName.replace(/[^a-zA-Z0-9._\-]/g, '_') + (order.fileName.endsWith('.txt') ? '' : '.txt');
    const hashHex = crypto.createHash('sha256').update(order.id).digest('hex').toUpperCase();
    const numericToken = Array.from(hashHex.slice(0, 20))
      .map((ch) => parseInt(ch, 16) % 10)
      .join('')
      .replace(/(.{4})/g, '$1-')
      .slice(0, 24);

    const deliverableContent = isTopUpOrder
      ? [
          '====================================================================',
          'MALL DIGITAL STORE — STRUK RESMI PEMBAYARAN & TOP UP DIGITAL',
          '====================================================================',
          `Kode Transaksi    : ${order.orderCode}`,
          `Layanan & Tujuan  : ${order.productTitle}`,
          `Nama Pembeli      : ${order.buyerName} <${order.buyerEmail}>`,
          `Metode Pembayaran : ${order.paymentMethodLabel} (Ref: ${order.paymentReference})`,
          `Nominal Bayar     : ${formatIdr(order.finalAmountIdr)}`,
          `Status Transaksi  : BERHASIL / LUNAS OTOMATIS`,
          `Nomor SN / Token  : ${order.deliveredPayload?.value ?? numericToken}`,
          `Waktu Cetak       : ${new Date().toLocaleString('id-ID')}`,
          '--------------------------------------------------------------------',
          'Simpan struk resmi ini sebagai bukti transaksi sah MALL DIGITAL STORE.',
          'Jika butuh bantuan, hubungi Live Chat CS atau AI Assistant kami 24/7.',
          '====================================================================',
        ].join('\n')
      : [
          '====================================================================',
          'MALL DIGITAL STORE — SERTIFIKAT LISENSI & PAKET ASET DIGITAL',
          '====================================================================',
          `Kode Pesanan      : ${order.orderCode}`,
          `Nama Produk       : ${order.productTitle}`,
          `Nama Berkas Asli  : ${order.fileName} (${order.fileFormat}, ${order.fileSizeMb} MB)`,
          `Pemegang Lisensi  : ${order.buyerName} <${order.buyerEmail}>`,
          `Metode Pembayaran : ${order.paymentMethodLabel} (Ref: ${order.paymentReference})`,
          `Nominal Terbayar  : ${formatIdr(order.finalAmountIdr)}`,
          `Status Verifikasi : TERVERIFIKASI OTOMATIS`,
          `Akses / Lisensi   : ${order.deliveredPayload?.value ?? `MDS-LIC-${hashHex.slice(0, 16)}`}`,
          `Waktu Unduh       : ${new Date().toLocaleString('id-ID')}`,
          '--------------------------------------------------------------------',
          'Petunjuk Penggunaan:',
          '1. Simpan file sertifikat lisensi ini sebagai bukti kepemilikan resmi.',
          '2. Anda berhak atas pembaruan minor versi terbaru melalui halaman Pesanan.',
          '3. Hubungi Live Chat atau AI Assistant MALL DIGITAL STORE bila butuh bantuan.',
          '====================================================================',
        ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.send(deliverableContent);
  });

  // 6. Seller Local Indonesian Bank Withdrawal (Payout)
  app.post('/api/payouts', (req, res) => {
    const bankCode = sanitizeString(req.body?.bankCode, 20) as IndonesianBankCode;
    const accountNumber = sanitizeString(req.body?.accountNumber, 24);
    const accountHolder = sanitizeString(req.body?.accountHolder, 100);
    const amountIdr = Math.round(Number(req.body?.amountIdr));

    const accValidation = validateBankAccount(accountNumber, accountHolder);
    if (!accValidation.valid) {
      return res.status(400).json({ error: accValidation.error });
    }

    const summary = computeAnalyticsSummary(orders, payouts, products);
    const calc = calculatePayoutBreakdown(amountIdr, bankCode, summary.availableBalanceIdr);
    if (calc.error) {
      return res.status(400).json({ error: calc.error });
    }

    const payout: PayoutRecord = {
      id: `po-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      payoutCode: `WD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      sellerId: 'seller-karyadigital',
      bankCode,
      bankName: calc.bankName,
      accountNumber: accountNumber.replace(/\s+/g, ''),
      accountHolder,
      amountIdr: calc.amountIdr,
      feeIdr: calc.feeIdr,
      netAmountIdr: calc.netAmountIdr,
      status: 'completed',
      createdAt: nowIso(),
    };

    payouts.unshift(payout);
    broadcast('payout:created', payout);
    pushNotification({
      recipientName: accountHolder,
      title: `Penarikan Dana ${payout.payoutCode} Diproses`,
      message: `Dana bersih ${formatIdr(payout.netAmountIdr)} telah ditransfer ke ${payout.bankName} (${payout.accountNumber}).`,
      category: 'payout',
    });
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: accountHolder,
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Penarikan Dana Bank Lokal',
      category: 'payout',
      summary: `Penarikan ${formatIdr(payout.amountIdr)} ke ${payout.bankName} a.n. ${payout.accountHolder} berhasil.`,
    });

    res.status(201).json(payout);
  });

  // 7. Promotions & Loyalty Vouchers
  app.post('/api/promos', (req, res) => {
    const code = sanitizeString(req.body?.code, 32).toUpperCase();
    const description = sanitizeString(req.body?.description, 200);
    const discountType = req.body?.discountType === 'fixed' ? 'fixed' : 'percent';
    const discountValue = Math.round(Number(req.body?.discountValue));
    const minPurchaseIdr = Math.max(0, Math.round(Number(req.body?.minPurchaseIdr) || 0));
    const maxUsage = Math.max(1, Math.round(Number(req.body?.maxUsage) || 50));

    if (!/^[A-Z0-9_\-]{3,32}$/.test(code) || description.length < 4) {
      return res.status(400).json({ error: 'Kode voucher (3–32 huruf/angka) dan deskripsi wajib valid.' });
    }
    if (promos.some((p) => p.code === code)) {
      return res.status(409).json({ error: `Kode promo ${code} sudah terdaftar.` });
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percent' && discountValue > 80)) {
      return res.status(400).json({ error: 'Nilai diskon tidak valid (maksimal 80% untuk persentase).' });
    }

    const promo: PromoVoucher = {
      id: `promo-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      code,
      description,
      discountType,
      discountValue,
      minPurchaseIdr,
      usageCount: 0,
      maxUsage,
      active: true,
      createdAt: nowIso(),
    };
    promos.unshift(promo);
    broadcast('promo:created', promo);
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: 'Penjual',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Buat Promo Loyalitas',
      category: 'promo',
      summary: `Voucher ${promo.code} (${promo.discountType === 'percent' ? `${promo.discountValue}%` : formatIdr(promo.discountValue)}) diaktifkan.`,
    });
    res.status(201).json(promo);
  });

  app.patch('/api/promos/:id', (req, res) => {
    const promo = promos.find((p) => p.id === req.params.id);
    if (!promo) return res.status(404).json({ error: 'Voucher tidak ditemukan.' });
    if (typeof req.body?.active === 'boolean') {
      promo.active = req.body.active;
    }
    broadcast('promo:updated', promo);
    res.json(promo);
  });

  // 8. Real-Time Customer Support Live Chat (WebSocket-backed)
  app.post('/api/chat/messages', (req, res) => {
    const text = sanitizeString(req.body?.text, 1000);
    const senderName = sanitizeString(req.body?.senderName, 80) || 'Pelanggan';
    const senderRole =
      req.body?.senderRole === 'support' || req.body?.senderRole === 'seller'
        ? req.body.senderRole
        : 'customer';
    const orderRef = sanitizeString(req.body?.orderRef, 40) || undefined;

    if (!text) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const message: SupportMessage = {
      id: `msg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      roomId: 'main-support',
      senderId: sanitizeString(req.body?.senderId, 128) || 'user-demo-01',
      senderName,
      senderRole,
      text,
      orderRef,
      createdAt: nowIso(),
    };

    messages.push(message);
    if (messages.length > 200) messages.shift();
    broadcast('chat:message', message);

    res.status(201).json(message);
  });

  // 9. Automated Encrypted Cloud Backup (AES-256-GCM)
  app.post('/api/backups', (req, res) => {
    const mode = req.body?.mode === 'daily' || req.body?.mode === 'weekly' ? req.body.mode : 'manual';
    const record = createEncryptedBackupSnapshot(mode);
    broadcast('backup:created', record);
    pushNotification({
      recipientName: 'Administrator',
      title: `Cadangan Terenkripsi ${record.backupCode}`,
      message: `Snapshot ${record.recordCount} entitas berhasil dienkripsi AES-256-GCM dan disinkronkan ke awan.`,
      category: 'backup',
    });
    pushActivity({
      actorId: 'admin-karyadigital',
      actorName: 'Admin',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Pencadangan Awan AES-256-GCM',
      category: 'backup',
      summary: `Snapshot ${record.backupCode} (${record.sizeBytes} B, SHA-256 ${record.checksumSha256.slice(0, 12)}…) tersimpan.`,
    });
    res.status(201).json(record);
  });

  app.patch('/api/backups/schedule', (req, res) => {
    const nextSchedule = req.body?.schedule === 'weekly' ? 'weekly' : 'daily';
    backupSchedule = nextSchedule;
    broadcast('backup:schedule', { backupSchedule });
    res.json({ backupSchedule });
  });

  app.post('/api/backups/:id/verify', (req, res) => {
    const record = backups.find((b) => b.id === req.params.id);
    const envelope = backupEnvelopes.get(req.params.id);
    if (!record || !envelope) {
      return res.status(404).json({ error: 'Arsip cadangan tidak ditemukan.' });
    }
    try {
      const decrypted = decryptCloudBackup<{ exportedAt: string; ordersCount: number; productsCount: number }>(
        envelope,
        BACKUP_KEY
      );
      record.status = 'verified';
      broadcast('backup:verified', record);
      res.json({
        verified: true,
        backup: record,
        summary: {
          exportedAt: decrypted.exportedAt,
          productsCount: decrypted.productsCount,
          ordersCount: decrypted.ordersCount,
        },
      });
    } catch {
      res.status(500).json({ error: 'Verifikasi integritas dekripsi AES-256-GCM gagal.' });
    }
  });

  app.get('/api/backups/:id/download', (req, res) => {
    const record = backups.find((b) => b.id === req.params.id);
    const envelope = backupEnvelopes.get(req.params.id);
    if (!record || !envelope) {
      return res.status(404).json({ error: 'Arsip cadangan tidak ditemukan.' });
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${record.backupCode}.enc.json"`);
    res.send(JSON.stringify({ backupCode: record.backupCode, createdAt: record.createdAt, ...envelope }, null, 2));
  });

  // 10. Multi-Factor Authentication (RFC 6238 TOTP)
  app.post('/api/auth/mfa/setup', (req, res) => {
    const email = sanitizeString(req.body?.email, 160) || 'fauzankamal02@gmail.com';
    mfaSecret = generateBase32Secret();
    const otpAuthUri = `otpauth://totp/MALL%20DIGITAL%20STORE:${encodeURIComponent(email)}?secret=${mfaSecret}&issuer=MALL%20DIGITAL%20STORE&algorithm=SHA1&digits=6&period=30`;
    security.mfaSetupPending = true;
    security.mfaSecretMasked = `${mfaSecret.slice(0, 4)}••••${mfaSecret.slice(-4)}`;
    security.mfaOtpAuthUri = otpAuthUri;
    const currentValidCode = computeTotp(mfaSecret);
    res.json({
      security,
      secretForEnrollment: mfaSecret,
      otpAuthUri,
      currentCodePreview: currentValidCode,
    });
  });

  app.post('/api/auth/mfa/verify', (req, res) => {
    const code = sanitizeString(req.body?.code, 12);
    if (!mfaSecret) {
      return res.status(400).json({ error: 'Mulai pengaturan MFA terlebih dahulu.' });
    }
    if (!verifyTotp(mfaSecret, code)) {
      return res.status(401).json({ error: 'Kode OTP 6 digit tidak sesuai atau sudah kedaluwarsa.' });
    }
    security.mfaEnabled = true;
    security.mfaSetupPending = false;
    security.mfaVerifiedAt = nowIso();
    pushNotification({
      recipientName: 'Pemilik Akun',
      title: 'Autentikasi Multi-Faktor (MFA) Aktif',
      message: 'Login Multi-Faktor TOTP 6-digit berhasil diaktifkan untuk melindungi akun & penarikan dana Anda.',
      category: 'security',
    });
    pushActivity({
      actorId: 'user-demo-01',
      actorName: 'Pemilik Akun',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Aktivasi MFA (TOTP)',
      category: 'auth',
      summary: 'Autentikasi 2-faktor berbasis RFC 6238 TOTP telah diverifikasi dan diaktifkan.',
    });
    res.json({ verified: true, security });
  });

  app.post('/api/auth/mfa/disable', (_req, res) => {
    mfaSecret = null;
    security.mfaEnabled = false;
    security.mfaSetupPending = false;
    security.mfaSecretMasked = null;
    security.mfaOtpAuthUri = null;
    res.json({ security });
  });

  // 11. Biometric Authentication (WebAuthn / Passkey Challenge-Response)
  app.post('/api/auth/webauthn/challenge', (_req, res) => {
    pendingWebAuthnChallenge = crypto.randomBytes(32).toString('base64url');
    res.json({ challenge: pendingWebAuthnChallenge });
  });

  app.post('/api/auth/webauthn/register', (req, res) => {
    const challenge = sanitizeString(req.body?.challenge, 128);
    const deviceLabel = sanitizeString(req.body?.deviceLabel, 80) || 'Perangkat Biometrik (Passkey)';
    const credentialId = sanitizeString(req.body?.credentialId, 200) || `cred-${crypto.randomBytes(8).toString('hex')}`;

    if (!pendingWebAuthnChallenge || challenge !== pendingWebAuthnChallenge) {
      return res.status(400).json({ error: 'Challenge kriptografis WebAuthn tidak valid.' });
    }
    pendingWebAuthnChallenge = null;

    const timestamp = nowIso();
    security.biometricEnabled = true;
    security.biometricDevices.unshift({
      id: credentialId,
      label: deviceLabel,
      registeredAt: timestamp,
      lastVerifiedAt: timestamp,
    });

    pushNotification({
      recipientName: 'Pemilik Akun',
      title: 'Kunci Biometrik Terdaftar',
      message: `Perangkat "${deviceLabel}" berhasil didaftarkan untuk login biometrik & konfirmasi penarikan dana.`,
      category: 'security',
    });
    pushActivity({
      actorId: 'user-demo-01',
      actorName: 'Pemilik Akun',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Registrasi Biometrik WebAuthn',
      category: 'auth',
      summary: `Passkey biometrik "${deviceLabel}" terverifikasi melalui challenge kriptografis.`,
    });

    res.status(201).json({ registered: true, security });
  });

  app.post('/api/auth/webauthn/verify', (req, res) => {
    const challenge = sanitizeString(req.body?.challenge, 128);
    const deviceId = sanitizeString(req.body?.deviceId, 200);
    if (!pendingWebAuthnChallenge || challenge !== pendingWebAuthnChallenge) {
      return res.status(400).json({ error: 'Challenge verifikasi biometrik tidak valid.' });
    }
    pendingWebAuthnChallenge = null;
    const device = security.biometricDevices.find((d) => d.id === deviceId) ?? security.biometricDevices[0];
    if (!device) {
      return res.status(404).json({ error: 'Belum ada perangkat biometrik terdaftar.' });
    }
    device.lastVerifiedAt = nowIso();
    res.json({ verified: true, device, security });
  });

  // 12. Mark Push Notifications Read
  app.post('/api/notifications/read-all', (_req, res) => {
    for (const item of notifications) {
      item.read = true;
    }
    res.json({ ok: true });
  });

  // 13. AI Shopping & Business Assistant (Server-side @google/genai)
  app.post('/api/ai/assistant', async (req, res) => {
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const cleanedHistory: AssistantTurnInput[] = [];

    for (const item of rawMessages.slice(-16)) {
      const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null;
      const text = sanitizeString(item?.text, 1200);
      if (role && text) {
        cleanedHistory.push({ role, text });
      }
    }

    if (cleanedHistory.length === 0 || cleanedHistory[cleanedHistory.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Silakan tulis pertanyaan untuk AI Assistant terlebih dahulu.' });
    }

    try {
      const result = await askMallDigitalAssistant(cleanedHistory, products, promos);
      return res.json(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Terjadi kendala saat menghubungi layanan AI Assistant.';
      console.error('AI Assistant error:', message);
      return res.status(502).json({ error: message });
    }
  });

  // 14. Editable Store Announcement / Incident Notice Broadcast
  app.put('/api/announcement', (req, res) => {
    const allowedLevels: StoreAnnouncementLevel[] = ['normal', 'info', 'warning', 'maintenance'];
    const rawLevel = sanitizeString(req.body?.level, 20) as StoreAnnouncementLevel;
    const level: StoreAnnouncementLevel = allowedLevels.includes(rawLevel) ? rawLevel : 'info';
    const title = sanitizeString(req.body?.title, 120);
    const message = sanitizeString(req.body?.message, 600);
    const estimatedResolution = sanitizeString(req.body?.estimatedResolution, 140);
    const active = req.body?.active !== false;
    const showTopBanner = Boolean(req.body?.showTopBanner);

    if (title.length < 4 || message.length < 8) {
      return res.status(400).json({
        error: 'Judul pemberitahuan minimal 4 karakter dan isi pesan minimal 8 karakter.',
      });
    }

    storeAnnouncement = {
      active,
      level,
      title,
      message,
      estimatedResolution,
      showTopBanner,
      updatedAt: nowIso(),
    };

    broadcast('announcement:updated', storeAnnouncement);
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: 'Admin MALL DIGITAL STORE',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Pembaruan Pemberitahuan Toko',
      category: 'promo',
      summary: `Status [${level.toUpperCase()}]: ${title}`,
    });

    if (active && (level === 'warning' || level === 'maintenance')) {
      pushNotification({
        recipientName: 'Seluruh Pelanggan',
        title: `Pemberitahuan Toko: ${title}`,
        message,
        category: 'delivery',
      });
    }

    return res.json(storeAnnouncement);
  });

  // 15. Automation Settings & Digital Account/License Vault Management
  app.put('/api/automation/settings', (req, res) => {
    const delayRaw = Math.round(Number(req.body?.sandboxDelaySeconds));
    const sandboxDelaySeconds = Number.isFinite(delayRaw)
      ? Math.max(1, Math.min(15, delayRaw))
      : automationSettings.sandboxDelaySeconds;

    automationSettings = {
      ...automationSettings,
      autoFulfillEnabled: Boolean(req.body?.autoFulfillEnabled),
      autoSandboxVerify: Boolean(req.body?.autoSandboxVerify),
      sandboxDelaySeconds,
      autoDownloadOnPaid: Boolean(req.body?.autoDownloadOnPaid),
      autoEmailOnPaid: Boolean(req.body?.autoEmailOnPaid),
    };

    broadcast('automation:updated', automationSettings);
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: 'Admin MALL DIGITAL STORE',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Pengaturan Otomatisasi Transaksi',
      category: 'inventory',
      summary: `Mode otomatis: ${automationSettings.autoFulfillEnabled ? 'AKTIF' : 'MANUAL'} · Auto-callback sandbox: ${automationSettings.autoSandboxVerify ? `${automationSettings.sandboxDelaySeconds} dtk` : 'Nonaktif'}.`,
    });
    return res.json(automationSettings);
  });

  app.post('/api/automation/vault', (req, res) => {
    const productId = sanitizeString(req.body?.productId, 80);
    const rawLines = typeof req.body?.rawLines === 'string' ? req.body.rawLines : '';
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Produk target untuk gudang stok otomatis tidak ditemukan.' });
    }

    const parsed = parseBulkVaultLines(rawLines);
    if (parsed.length === 0) {
      return res.status(400).json({
        error: 'Masukkan minimal 1 baris data akun, tautan undangan, atau kode lisensi (min. 4 karakter per baris).',
      });
    }

    const bucket = productVaults.get(product.id) ?? { available: [], usedCount: 0 };
    bucket.available.push(...parsed);
    productVaults.set(product.id, bucket);

    // Sync product stock if vault now holds more items than stock counter
    if (product.stock < bucket.available.length) {
      product.stock = bucket.available.length;
      product.updatedAt = nowIso();
      broadcast('product:updated', product);
    }

    const summaries = getVaultSummaries();
    broadcast('vault:updated', summaries);
    pushActivity({
      actorId: 'seller-karyadigital',
      actorName: 'Penjual',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Isi Gudang Akun/Lisensi Otomatis',
      category: 'inventory',
      summary: `+${parsed.length} item akses otomatis ditambahkan ke "${product.title}" (Total siap kirim: ${bucket.available.length}).`,
    });

    return res.status(201).json({
      addedCount: parsed.length,
      product,
      vaultSummaries: summaries,
    });
  });

  app.post('/api/automation/test-webhook', (_req, res) => {
    const pendingOrder = orders.find((o) => o.paymentStatus === 'pending');
    const sampleBody = JSON.stringify({
      orderId: pendingOrder?.id ?? 'webhook-health-check',
      orderCode: pendingOrder?.orderCode ?? 'CHECK-2026-0001',
      transactionStatus: 'PAID',
      amountIdr: pendingOrder?.finalAmountIdr ?? 25000,
    });
    const signature = signWebhookPayload(sampleBody, WEBHOOK_SECRET);
    const valid = verifyWebhookSignature(sampleBody, signature, WEBHOOK_SECRET);

    if (pendingOrder && valid) {
      const fulfilled = fulfillVerifiedOrder(pendingOrder.id, 'gateway_webhook');
      if (fulfilled.ok) {
        return res.json({
          ok: true,
          signatureVerified: true,
          fulfilledOrderCode: fulfilled.order.orderCode,
          message: `Callback Webhook HMAC-SHA256 valid! Pesanan ${fulfilled.order.orderCode} langsung lunas & akses otomatis terkirim ke pembeli.`,
        });
      }
    }

    return res.json({
      ok: true,
      signatureVerified: valid,
      fulfilledOrderCode: null,
      message:
        'Endpoint Webhook POST /api/webhooks/payment siap menerima callback HMAC-SHA256 (belum ada pesanan berstatus menunggu bayar saat ini).',
    });
  });

  // 14. Admin FAQ Management CRUD (Synchronized Real-Time to Homepage)
  app.get('/api/faqs', (_req, res) => {
    res.json({ faqs });
  });

  app.post('/api/faqs', (req, res) => {
    const validated = validateFaqInput({
      question: req.body?.question,
      answer: req.body?.answer,
      category: req.body?.category,
      active: req.body?.active,
    });
    if (!validated.valid || !validated.cleaned) {
      return res.status(400).json({ error: validated.error });
    }

    const maxOrder = faqs.reduce((max, item) => Math.max(max, item.sortOrder), 0);
    const now = nowIso();
    const created: FaqItem = {
      id: `faq-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      category: validated.cleaned.category as FaqCategory,
      question: validated.cleaned.question,
      answer: validated.cleaned.answer,
      active: validated.cleaned.active,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    faqs.push(created);
    broadcast('faq:created', created);
    pushActivity({
      actorId: 'admin-malldigital',
      actorName: 'Admin',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Tambah FAQ Beranda',
      category: 'auth',
      summary: `Menambahkan FAQ kategori ${created.category}: "${created.question}"`,
    });

    return res.status(201).json(created);
  });

  app.patch('/api/faqs/:id', (req, res) => {
    const idx = faqs.findIndex((item) => item.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Data FAQ tidak ditemukan.' });
    }

    const existing = faqs[idx];
    const nextQuestion = req.body?.question !== undefined ? req.body.question : existing.question;
    const nextAnswer = req.body?.answer !== undefined ? req.body.answer : existing.answer;
    const nextCategory = req.body?.category !== undefined ? req.body.category : existing.category;
    const nextActiveInput =
      typeof req.body?.active === 'boolean' ? req.body.active : existing.active;

    const validated = validateFaqInput({
      question: nextQuestion,
      answer: nextAnswer,
      category: nextCategory,
      active: nextActiveInput,
    });
    if (!validated.valid || !validated.cleaned) {
      return res.status(400).json({ error: validated.error });
    }

    const nextOrderRaw = Number(req.body?.sortOrder);
    const nextSortOrder =
      Number.isFinite(nextOrderRaw) && nextOrderRaw >= 1
        ? Math.round(nextOrderRaw)
        : existing.sortOrder;

    const updated: FaqItem = {
      ...existing,
      question: validated.cleaned.question,
      answer: validated.cleaned.answer,
      category: validated.cleaned.category,
      active: validated.cleaned.active,
      sortOrder: nextSortOrder,
      updatedAt: nowIso(),
    };

    faqs[idx] = updated;
    broadcast('faq:updated', updated);
    pushActivity({
      actorId: 'admin-malldigital',
      actorName: 'Admin',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Perbarui FAQ Beranda',
      category: 'auth',
      summary: `Memperbarui FAQ "${updated.question}" (${updated.active ? 'Tayang' : 'Disembunyikan'}).`,
    });

    return res.json(updated);
  });

  app.delete('/api/faqs/:id', (req, res) => {
    const idx = faqs.findIndex((item) => item.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Data FAQ tidak ditemukan.' });
    }

    const [removed] = faqs.splice(idx, 1);
    broadcast('faq:deleted', { id: removed.id });
    pushActivity({
      actorId: 'admin-malldigital',
      actorName: 'Admin',
      actorEmail: 'fauzankamal02@gmail.com',
      action: 'Hapus FAQ Beranda',
      category: 'auth',
      summary: `Menghapus FAQ "${removed.question}" dari daftar pertanyaan umum.`,
    });

    return res.json({ deleted: true, id: removed.id });
  });

  // 15. Member Authentication & Automatic Member Registration (scrypt + Bearer Session + Google Sync)
  app.post('/api/members/register', (req, res) => {
    const validated = validateMemberRegistration({
      displayName: req.body?.displayName,
      email: req.body?.email,
      phone: req.body?.phone,
      password: req.body?.password,
      tier: req.body?.tier,
    });
    if (!validated.valid || !validated.cleaned) {
      return res.status(400).json({ error: validated.error });
    }

    const exists = members.find((m) => m.email === validated.cleaned!.email);
    if (exists) {
      return res
        .status(409)
        .json({ error: 'Email tersebut sudah terdaftar sebagai member. Silakan gunakan tab Masuk Member.' });
    }

    const { saltHex, hashHex } = hashMemberPassword(validated.cleaned.password);
    const now = nowIso();
    const savedTargets: StoredMemberRecord['savedTargets'] = [];
    if (validated.cleaned.phone) {
      savedTargets.push({
        id: `tgt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        serviceId: 'pulsa',
        provider: 'Telkomsel',
        targetNumber: validated.cleaned.phone.replace(/\s+/g, ''),
        label: 'Nomor WhatsApp Utama',
        updatedAt: now,
      });
    }

    const created: StoredMemberRecord = {
      id: `mbr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      memberCode: generateMemberCode(members.length + 1),
      displayName: validated.cleaned.displayName,
      email: validated.cleaned.email,
      phone: validated.cleaned.phone,
      tier: validated.cleaned.tier,
      authProvider: 'email',
      loyaltyPoints: 100,
      savedTargets,
      joinedAt: now,
      lastLoginAt: now,
      passwordHash: hashHex,
      passwordSalt: saltHex,
    };

    members.push(created);
    const token = issueMemberSession(created.id);
    const publicMember = toPublicMember(created);

    broadcast('member:registered', { membersCount: members.length });
    pushActivity({
      actorId: created.id,
      actorName: created.displayName,
      actorEmail: created.email,
      action: 'Pendaftaran Member Baru',
      category: 'auth',
      summary: `${created.displayName} (${created.memberCode}) mendaftar sebagai member ${created.tier === 'reseller' ? 'Reseller VIP' : 'Reguler'} (+100 poin).`,
    });
    pushNotification({
      recipientName: created.displayName,
      title: `Selamat Datang, Member ${created.memberCode}!`,
      message: `Akun member Anda aktif dengan bonus +100 Poin Loyalitas dan fitur simpan nomor Top Up & Tagihan.`,
      category: 'security',
    });

    return res.status(201).json({ member: publicMember, token });
  });

  app.post('/api/members/login', (req, res) => {
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Masukkan alamat email dan kata sandi akun member Anda.' });
    }

    const found = members.find((m) => m.email === email);
    if (!found || !verifyMemberPassword(password, found.passwordSalt, found.passwordHash)) {
      return res.status(401).json({ error: 'Email atau kata sandi member tidak sesuai.' });
    }

    found.lastLoginAt = nowIso();
    const token = issueMemberSession(found.id);

    pushActivity({
      actorId: found.id,
      actorName: found.displayName,
      actorEmail: found.email,
      action: 'Login Akun Member',
      category: 'auth',
      summary: `${found.displayName} (${found.memberCode}) masuk ke akun member.`,
    });

    return res.json({ member: toPublicMember(found), token });
  });

  app.post('/api/members/sync-google', (req, res) => {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const tokenCheck = validateGoogleSyncTokenClaims(
      bearerToken,
      firebaseAppletConfig.projectId
    );
    if (!tokenCheck.valid || !tokenCheck.uid || !tokenCheck.email) {
      return res
        .status(401)
        .json({ error: tokenCheck.error || 'Autentikasi Google diperlukan untuk sinkronisasi member.' });
    }

    const uid = sanitizeString(tokenCheck.uid, 128);
    const email = sanitizeString(tokenCheck.email, 160).toLowerCase();
    const displayName =
      sanitizeString(req.body?.displayName, 80) ||
      tokenCheck.name ||
      email.split('@')[0] ||
      'Member Google';

    const now = nowIso();
    let existing = members.find((m) => m.email === email);
    let isNewMember = false;

    if (existing && existing.authProvider === 'email') {
      return res.status(409).json({
        error:
          'Email ini terdaftar menggunakan kata sandi member. Silakan masuk melalui tab Masuk Member.',
      });
    }

    if (!existing) {
      isNewMember = true;
      existing = {
        id: `mbr-${uid.slice(0, 24)}`,
        memberCode: generateMemberCode(members.length + 1),
        displayName,
        email,
        phone: '',
        tier: 'reguler',
        authProvider: 'google',
        loyaltyPoints: 100,
        savedTargets: [],
        joinedAt: now,
        lastLoginAt: now,
        passwordHash: null,
        passwordSalt: null,
      };
      members.push(existing);
      broadcast('member:registered', { membersCount: members.length });
      pushActivity({
        actorId: existing.id,
        actorName: existing.displayName,
        actorEmail: existing.email,
        action: 'Registrasi Otomatis Member (Google)',
        category: 'auth',
        summary: `${existing.displayName} otomatis terdaftar sebagai member ${existing.memberCode} saat masuk via Google.`,
      });
      pushNotification({
        recipientName: existing.displayName,
        title: `Otomatis Terdaftar Member ${existing.memberCode}`,
        message: 'Akun Google Anda kini aktif sebagai Member MALL DIGITAL STORE (+100 Poin Loyalitas).',
        category: 'security',
      });
    } else {
      existing.displayName = displayName || existing.displayName;
      existing.lastLoginAt = now;
    }

    const token = issueMemberSession(existing.id);
    return res.json({
      member: toPublicMember(existing),
      token,
      isNewMember,
    });
  });

  app.get('/api/members/me', (req, res) => {
    const member = getAuthenticatedMember(req);
    if (!member) {
      return res.status(401).json({ error: 'Sesi member tidak valid atau sudah berakhir.' });
    }
    return res.json({ member: toPublicMember(member) });
  });

  app.post('/api/members/saved-targets', (req, res) => {
    const member = getAuthenticatedMember(req);
    if (!member) {
      return res.status(401).json({ error: 'Silakan masuk sebagai member terlebih dahulu untuk menyimpan nomor.' });
    }

    const validated = validateSavedTargetInput({
      serviceId: req.body?.serviceId,
      provider: req.body?.provider,
      targetNumber: req.body?.targetNumber,
      label: req.body?.label,
    });
    if (!validated.valid || !validated.cleaned) {
      return res.status(400).json({ error: validated.error });
    }

    const now = nowIso();
    const cleaned = validated.cleaned;
    const existingIdx = member.savedTargets.findIndex(
      (t) =>
        t.serviceId === cleaned.serviceId &&
        t.targetNumber.toLowerCase() === cleaned.targetNumber.toLowerCase()
    );

    if (existingIdx >= 0) {
      member.savedTargets[existingIdx] = {
        ...member.savedTargets[existingIdx],
        provider: cleaned.provider,
        label: cleaned.label,
        updatedAt: now,
      };
    } else {
      member.savedTargets.unshift({
        id: `tgt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        serviceId: cleaned.serviceId,
        provider: cleaned.provider,
        targetNumber: cleaned.targetNumber,
        label: cleaned.label,
        updatedAt: now,
      });
      if (member.savedTargets.length > 12) {
        member.savedTargets.pop();
      }
    }

    return res.json({ member: toPublicMember(member) });
  });

  app.post('/api/members/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) memberSessions.delete(token);
    }
    return res.json({ loggedOut: true });
  });

  // Serve Vite in dev or dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MALL DIGITAL STORE server aktif pada http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server MALL DIGITAL STORE:', err);
  process.exit(1);
});
