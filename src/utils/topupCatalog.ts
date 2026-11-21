import type { PaymentMethodCode } from '../types';
import { calculateOrderPricing } from './commerce';

export type TopUpServiceId =
  | 'pulsa'
  | 'pln'
  | 'ewallet'
  | 'game'
  | 'pdam'
  | 'internet'
  | 'bpjs'
  | 'voucher';

export interface TopUpNominalOption {
  id: string;
  label: string;
  sublabel: string;
  priceIdr: number;
  resellerPriceIdr: number;
  popular?: boolean;
}

export interface TopUpServiceConfig {
  id: TopUpServiceId;
  label: string;
  shortLabel: string;
  description: string;
  targetLabel: string;
  targetPlaceholder: string;
  targetHelper: string;
  providers: string[];
  nominals: TopUpNominalOption[];
}

export const TOPUP_SERVICES: TopUpServiceConfig[] = [
  {
    id: 'pulsa',
    label: 'Pulsa & Paket Data',
    shortLabel: 'Pulsa & Data',
    description: 'Isi ulang pulsa reguler & kuota internet semua operator Indonesia masuk dalam hitungan detik.',
    targetLabel: 'Nomor HP Tujuan',
    targetPlaceholder: 'Contoh: 081234567890',
    targetHelper: 'Masukkan 10–14 digit nomor seluler aktif diawali 08.',
    providers: ['Telkomsel', 'Indosat IM3', 'XL Axiata', 'Axis', 'Tri (3)', 'Smartfren', 'by.U'],
    nominals: [
      { id: 'pulsa-10k', label: 'Pulsa 10.000', sublabel: 'Masa aktif +15 hari', priceIdr: 11200, resellerPriceIdr: 10500 },
      { id: 'pulsa-25k', label: 'Pulsa 25.000', sublabel: 'Masa aktif +30 hari', priceIdr: 25900, resellerPriceIdr: 25100, popular: true },
      { id: 'pulsa-50k', label: 'Pulsa 50.000', sublabel: 'Masa aktif +45 hari', priceIdr: 50500, resellerPriceIdr: 49600 },
      { id: 'pulsa-100k', label: 'Pulsa 100.000', sublabel: 'Masa aktif +60 hari', priceIdr: 99500, resellerPriceIdr: 98200 },
      { id: 'data-15gb', label: 'Paket Data 15 GB', sublabel: '30 Hari · Semua Jaringan', priceIdr: 42000, resellerPriceIdr: 39500, popular: true },
      { id: 'data-35gb', label: 'Paket Data 35 GB', sublabel: '30 Hari · 4G/5G Prioritas', priceIdr: 76000, resellerPriceIdr: 72500 },
    ],
  },
  {
    id: 'pln',
    label: 'Token & Tagihan PLN',
    shortLabel: 'Token PLN',
    description: 'Beli token listrik prabayar (20 digit SN langsung tampil) atau bayar tagihan listrik bulanan.',
    targetLabel: 'ID Pelanggan / Nomor Meter PLN',
    targetPlaceholder: 'Contoh: 530012345678',
    targetHelper: 'Masukkan 11–12 digit nomor meter atau ID Pelanggan PLN.',
    providers: ['Token Listrik Prabayar', 'Tagihan PLN Pascabayar'],
    nominals: [
      { id: 'pln-20k', label: 'Token PLN 20.000', sublabel: 'SN 20 digit instan', priceIdr: 21500, resellerPriceIdr: 20400 },
      { id: 'pln-50k', label: 'Token PLN 50.000', sublabel: 'SN 20 digit instan', priceIdr: 51500, resellerPriceIdr: 50400, popular: true },
      { id: 'pln-100k', label: 'Token PLN 100.000', sublabel: 'SN 20 digit instan', priceIdr: 101500, resellerPriceIdr: 100400, popular: true },
      { id: 'pln-200k', label: 'Token PLN 200.000', sublabel: 'SN 20 digit instan', priceIdr: 201500, resellerPriceIdr: 200400 },
      { id: 'pln-500k', label: 'Token PLN 500.000', sublabel: 'SN 20 digit instan', priceIdr: 501500, resellerPriceIdr: 500400 },
      { id: 'pln-tagihan', label: 'Bayar Tagihan Bulanan', sublabel: 'Cek & lunas otomatis', priceIdr: 168500, resellerPriceIdr: 166500 },
    ],
  },
  {
    id: 'ewallet',
    label: 'Top Up Saldo E-Wallet',
    shortLabel: 'E-Wallet',
    description: 'Isi saldo dompet digital DANA, GoPay, OVO, ShopeePay, dan LinkAja biaya admin ringan.',
    targetLabel: 'Nomor HP Terdaftar E-Wallet',
    targetPlaceholder: 'Contoh: 081234567890',
    targetHelper: 'Pastikan nomor HP sudah terdaftar pada akun dompet digital tujuan.',
    providers: ['DANA', 'GoPay', 'OVO', 'ShopeePay', 'LinkAja'],
    nominals: [
      { id: 'ew-25k', label: 'Saldo Rp 25.000', sublabel: 'Masuk real-time', priceIdr: 26200, resellerPriceIdr: 25600 },
      { id: 'ew-50k', label: 'Saldo Rp 50.000', sublabel: 'Masuk real-time', priceIdr: 51200, resellerPriceIdr: 50600, popular: true },
      { id: 'ew-100k', label: 'Saldo Rp 100.000', sublabel: 'Masuk real-time', priceIdr: 101200, resellerPriceIdr: 100600, popular: true },
      { id: 'ew-200k', label: 'Saldo Rp 200.000', sublabel: 'Masuk real-time', priceIdr: 201200, resellerPriceIdr: 200600 },
      { id: 'ew-300k', label: 'Saldo Rp 300.000', sublabel: 'Masuk real-time', priceIdr: 301200, resellerPriceIdr: 300600 },
      { id: 'ew-500k', label: 'Saldo Rp 500.000', sublabel: 'Masuk real-time', priceIdr: 501200, resellerPriceIdr: 500600 },
    ],
  },
  {
    id: 'game',
    label: 'Top Up Game Instan',
    shortLabel: 'Game Topup',
    description: 'Diamond, UC, VP, dan Genesis Crystal legal resmi dengan proses otomatis 24 jam.',
    targetLabel: 'User ID & Server / Zone ID',
    targetPlaceholder: 'Contoh: 10928374 (2104)',
    targetHelper: 'Masukkan User ID game (tambahkan Zone/Server ID untuk MLBB/Genshin).',
    providers: ['Mobile Legends', 'Free Fire', 'Valorant', 'PUBG Mobile', 'Genshin Impact', 'Honor of Kings'],
    nominals: [
      { id: 'game-86', label: '86 Diamond / 100 UC', sublabel: 'Proses 1–30 detik', priceIdr: 22500, resellerPriceIdr: 20800 },
      { id: 'game-172', label: '172 Diamond / 250 UC', sublabel: 'Proses 1–30 detik', priceIdr: 44500, resellerPriceIdr: 41900 },
      { id: 'game-257', label: '257 Diamond / 420 VP', sublabel: 'Terlaris · Bonus Event', priceIdr: 65500, resellerPriceIdr: 62000, popular: true },
      { id: 'game-wpass', label: 'Weekly Diamond Pass', sublabel: 'Aktif 7 Hari · Resmi', priceIdr: 27900, resellerPriceIdr: 26200, popular: true },
      { id: 'game-514', label: '514 Diamond / 700 VP', sublabel: 'Proses 1–30 detik', priceIdr: 129000, resellerPriceIdr: 123500 },
      { id: 'game-1050', label: '1050 Diamond / Welkin+GC', sublabel: 'Prioritas VIP', priceIdr: 258000, resellerPriceIdr: 248000 },
    ],
  },
  {
    id: 'pdam',
    label: 'Tagihan Air PDAM',
    shortLabel: 'Air PDAM',
    description: 'Bayar tagihan air PDAM berbagai wilayah Indonesia dengan struk bukti lunas resmi.',
    targetLabel: 'Nomor Pelanggan PDAM',
    targetPlaceholder: 'Contoh: 0045198231',
    targetHelper: 'Masukkan 6–16 digit nomor sambungan pelanggan PDAM.',
    providers: ['PAM Jaya (Jakarta)', 'PDAM Surya Sembada (Surabaya)', 'PDAM Tirtawening (Bandung)', 'PDAM Tirta Moedal (Semarang)', 'PDAM Tirta Pakuan (Bogor)'],
    nominals: [
      { id: 'pdam-r1', label: 'Tagihan Periode Berjalan (R1)', sublabel: 'Golongan Rumah Tangga', priceIdr: 87500, resellerPriceIdr: 85500, popular: true },
      { id: 'pdam-r2', label: 'Tagihan Periode Berjalan (R2)', sublabel: 'Golongan Menengah', priceIdr: 142500, resellerPriceIdr: 140500 },
      { id: 'pdam-niaga', label: 'Tagihan Niaga / Kantor', sublabel: 'Bukti Lunas PDF + Struk', priceIdr: 265000, resellerPriceIdr: 262000 },
    ],
  },
  {
    id: 'internet',
    label: 'Internet & TV Kabel',
    shortLabel: 'Internet & TV',
    description: 'Lunasi tagihan WiFi rumah dan TV berlangganan tanpa antre, bukti pembayaran terkirim ke email.',
    targetLabel: 'Nomor Pelanggan Internet / TV',
    targetPlaceholder: 'Contoh: 122801948271',
    targetHelper: 'Masukkan nomor pelanggan layanan internet atau TV kabel Anda.',
    providers: ['IndiHome', 'Biznet Home', 'MyRepublic', 'First Media', 'MNC Vision', 'CBN Fiber'],
    nominals: [
      { id: 'net-30m', label: 'Tagihan Paket 30–50 Mbps', sublabel: 'Pembayaran bulanan resmi', priceIdr: 295000, resellerPriceIdr: 292000, popular: true },
      { id: 'net-100m', label: 'Tagihan Paket 100 Mbps', sublabel: 'Pembayaran bulanan resmi', priceIdr: 415000, resellerPriceIdr: 411000 },
      { id: 'net-tv', label: 'Tagihan TV Kabel + Internet', sublabel: 'Paket Bundling Bulanan', priceIdr: 485000, resellerPriceIdr: 480000 },
    ],
  },
  {
    id: 'bpjs',
    label: 'Iuran BPJS Kesehatan',
    shortLabel: 'BPJS',
    description: 'Pembayaran iuran BPJS Kesehatan & Ketenagakerjaan praktis lengkap dengan nomor referensi resmi.',
    targetLabel: 'Nomor VA / Kartu BPJS (13–16 Digit)',
    targetPlaceholder: 'Contoh: 0001234567890',
    targetHelper: 'Masukkan nomor kartu peserta atau nomor Virtual Account BPJS.',
    providers: ['BPJS Kesehatan Kelas 1', 'BPJS Kesehatan Kelas 2', 'BPJS Kesehatan Kelas 3', 'BPJS Ketenagakerjaan'],
    nominals: [
      { id: 'bpjs-1bln', label: 'Iuran 1 Bulan (1 Peserta)', sublabel: 'Tercatat langsung di sistem', priceIdr: 102500, resellerPriceIdr: 101000, popular: true },
      { id: 'bpjs-kel', label: 'Iuran 1 Bulan (Keluarga)', sublabel: 'Multi-peserta 1 KK', priceIdr: 302500, resellerPriceIdr: 300500 },
      { id: 'bpjs-3bln', label: 'Iuran 3 Bulan Sekaligus', sublabel: 'Hemat biaya admin', priceIdr: 304500, resellerPriceIdr: 302000 },
    ],
  },
  {
    id: 'voucher',
    label: 'Voucher Digital & Gift Card',
    shortLabel: 'Voucher Digital',
    description: 'Kode redeem resmi Google Play, Steam Wallet IDR, Apple Gift Card, dan Roblox langsung terkirim.',
    targetLabel: 'Email / Nomor WhatsApp Penerima Kode',
    targetPlaceholder: 'Contoh: 081234567890 atau email@anda.id',
    targetHelper: 'Kode redeem akan dikirim ke penerima sekaligus tersedia di menu Pesanan.',
    providers: ['Google Play IDR', 'Steam Wallet IDR', 'Apple Gift Card ID', 'Roblox Gift Card', 'PlayStation Store ID'],
    nominals: [
      { id: 'vch-50k', label: 'Voucher Rp 50.000', sublabel: 'Kode Redeem Instan', priceIdr: 52500, resellerPriceIdr: 50900 },
      { id: 'vch-100k', label: 'Voucher Rp 100.000', sublabel: 'Kode Redeem Instan', priceIdr: 103000, resellerPriceIdr: 100900, popular: true },
      { id: 'vch-150k', label: 'Voucher Rp 150.000', sublabel: 'Kode Redeem Instan', priceIdr: 154000, resellerPriceIdr: 151000 },
      { id: 'vch-300k', label: 'Voucher Rp 300.000', sublabel: 'Kode Redeem Instan', priceIdr: 306000, resellerPriceIdr: 301500 },
    ],
  },
];

export function getTopUpService(serviceId: string): TopUpServiceConfig | undefined {
  return TOPUP_SERVICES.find((s) => s.id === serviceId);
}

export function validateTopUpTarget(
  serviceId: TopUpServiceId,
  rawTarget: string
): { valid: boolean; cleaned: string; error?: string } {
  const cleaned = rawTarget.trim();
  if (!cleaned) {
    return { valid: false, cleaned, error: 'Nomor tujuan atau ID pelanggan wajib diisi.' };
  }

  const digitsOnly = cleaned.replace(/[\s\-+]/g, '');

  if (serviceId === 'pulsa' || serviceId === 'ewallet') {
    if (!/^08\d{8,12}$/.test(digitsOnly)) {
      return {
        valid: false,
        cleaned,
        error: 'Masukkan nomor HP Indonesia yang valid (diawali 08, 10–14 digit).',
      };
    }
    return { valid: true, cleaned: digitsOnly };
  }

  if (serviceId === 'pln') {
    if (!/^\d{11,13}$/.test(digitsOnly)) {
      return {
        valid: false,
        cleaned,
        error: 'Nomor meter / ID Pelanggan PLN harus terdiri dari 11–13 digit angka.',
      };
    }
    return { valid: true, cleaned: digitsOnly };
  }

  if (serviceId === 'pdam' || serviceId === 'internet' || serviceId === 'bpjs') {
    if (!/^\d{6,16}$/.test(digitsOnly)) {
      return {
        valid: false,
        cleaned,
        error: 'Masukkan nomor pelanggan / VA yang valid (6–16 digit angka).',
      };
    }
    return { valid: true, cleaned: digitsOnly };
  }

  if (serviceId === 'game') {
    if (cleaned.length < 4 || cleaned.length > 40) {
      return {
        valid: false,
        cleaned,
        error: 'Masukkan User ID game yang valid (minimal 4 karakter).',
      };
    }
    return { valid: true, cleaned };
  }

  // voucher: allow phone or email
  if (cleaned.length < 5 || cleaned.length > 100) {
    return {
      valid: false,
      cleaned,
      error: 'Masukkan nomor WhatsApp atau alamat email penerima kode voucher.',
    };
  }
  return { valid: true, cleaned };
}

export function calculateTopUpPricing(
  nominal: TopUpNominalOption,
  pricingTier: 'reguler' | 'reseller',
  paymentMethod: PaymentMethodCode
) {
  const unitPriceIdr = pricingTier === 'reseller' ? nominal.resellerPriceIdr : nominal.priceIdr;
  return calculateOrderPricing(unitPriceIdr, null, 0, paymentMethod);
}
