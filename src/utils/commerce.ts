import type {
  DigitalProduct,
  IndonesianBankCode,
  MonthlyFinancialRow,
  OrderRecord,
  PaymentMethodCode,
  PayoutRecord,
  PromoVoucher,
} from '../types';

export interface PaymentGatewayOption {
  code: PaymentMethodCode;
  label: string;
  group: 'QRIS & Instan' | 'Virtual Account Bank' | 'Dompet Digital' | 'Pembayaran Fleksibel';
  provider: string;
  feeIdr: number;
  installmentMonths: number;
  settlementNote: string;
}

export const PAYMENT_GATEWAY_OPTIONS: PaymentGatewayOption[] = [
  {
    code: 'QRIS',
    label: 'QRIS Nasional',
    group: 'QRIS & Instan',
    provider: 'Midtrans / BI-SNAP',
    feeIdr: 1500,
    installmentMonths: 1,
    settlementNote: 'Verifikasi otomatis instan (< 5 detik)',
  },
  {
    code: 'VA_BCA',
    label: 'BCA Virtual Account',
    group: 'Virtual Account Bank',
    provider: 'Bank BCA',
    feeIdr: 4000,
    installmentMonths: 1,
    settlementNote: 'Transfer via m-BCA / KlikBCA otomatis terdeteksi',
  },
  {
    code: 'VA_MANDIRI',
    label: 'Mandiri Virtual Account',
    group: 'Virtual Account Bank',
    provider: 'Bank Mandiri',
    feeIdr: 4000,
    installmentMonths: 1,
    settlementNote: "Livin' by Mandiri verifikasi otomatis",
  },
  {
    code: 'VA_BNI',
    label: 'BNI Virtual Account',
    group: 'Virtual Account Bank',
    provider: 'Bank BNI',
    feeIdr: 4000,
    installmentMonths: 1,
    settlementNote: 'BNI Mobile / wondr verifikasi otomatis',
  },
  {
    code: 'VA_BRI',
    label: 'BRI Virtual Account (BRIVA)',
    group: 'Virtual Account Bank',
    provider: 'Bank BRI',
    feeIdr: 4000,
    installmentMonths: 1,
    settlementNote: 'BRImo verifikasi otomatis 24 jam',
  },
  {
    code: 'GOPAY',
    label: 'GoPay',
    group: 'Dompet Digital',
    provider: 'GoTo Financial',
    feeIdr: 2000,
    installmentMonths: 1,
    settlementNote: 'Konfirmasi langsung di aplikasi GoPay',
  },
  {
    code: 'OVO',
    label: 'OVO',
    group: 'Dompet Digital',
    provider: 'OVO Indonesia',
    feeIdr: 2000,
    installmentMonths: 1,
    settlementNote: 'Notifikasi bayar instan ke akun OVO',
  },
  {
    code: 'DANA',
    label: 'DANA',
    group: 'Dompet Digital',
    provider: 'DANA Indonesia',
    feeIdr: 2000,
    installmentMonths: 1,
    settlementNote: 'Saldo DANA & Kartu tersimpan',
  },
  {
    code: 'SHOPEEPAY',
    label: 'ShopeePay',
    group: 'Dompet Digital',
    provider: 'AirPay / ShopeePay',
    feeIdr: 2000,
    installmentMonths: 1,
    settlementNote: 'Scan & konfirmasi otomatis',
  },
  {
    code: 'CICILAN_3X',
    label: 'Cicilan Fleksibel 0% (3 Bulan)',
    group: 'Pembayaran Fleksibel',
    provider: 'Kredivo / Indodana PayLater',
    feeIdr: 0,
    installmentMonths: 3,
    settlementNote: 'Bunga 0%, file langsung diunduh setelah DP terverifikasi',
  },
  {
    code: 'CICILAN_6X',
    label: 'Cicilan Fleksibel Ringan (6 Bulan)',
    group: 'Pembayaran Fleksibel',
    provider: 'Kredivo / Akulaku PayLater',
    feeIdr: 5000,
    installmentMonths: 6,
    settlementNote: 'Tenor 6 bulan, lisensi aktif seketika',
  },
];

export interface LocalBankOption {
  code: IndonesianBankCode;
  name: string;
  feeIdr: number;
  etaLabel: string;
}

export const INDONESIAN_BANKS: LocalBankOption[] = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)', feeIdr: 2500, etaLabel: 'BI-FAST Instan' },
  { code: 'MANDIRI', name: 'Bank Mandiri', feeIdr: 2500, etaLabel: 'BI-FAST Instan' },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)', feeIdr: 2500, etaLabel: 'BI-FAST Instan' },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)', feeIdr: 2500, etaLabel: 'BI-FAST Instan' },
  { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)', feeIdr: 2500, etaLabel: 'BI-FAST Instan' },
  { code: 'JAGO', name: 'Bank Jago', feeIdr: 0, etaLabel: 'Bebas Biaya · Instan' },
  { code: 'SEABANK', name: 'SeaBank Indonesia', feeIdr: 0, etaLabel: 'Bebas Biaya · Instan' },
];

export function formatIdr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.abs(safe));
  return safe < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export interface OrderPricingBreakdown {
  subtotalIdr: number;
  promoDiscountIdr: number;
  loyaltyDiscountIdr: number;
  loyaltyPointsUsed: number;
  gatewayFeeIdr: number;
  finalAmountIdr: number;
  installmentMonths: number;
  monthlyInstallmentIdr: number;
  earnedLoyaltyPoints: number;
  promoError: string | null;
}

export function calculateOrderPricing(
  subtotalIdr: number,
  promo: PromoVoucher | null,
  loyaltyPointsRequested: number,
  paymentMethod: PaymentMethodCode
): OrderPricingBreakdown {
  const safeSubtotal = Math.max(0, Math.round(subtotalIdr));
  let promoDiscountIdr = 0;
  let promoError: string | null = null;

  if (promo) {
    if (!promo.active) {
      promoError = 'Kode promo sudah tidak aktif.';
    } else if (promo.usageCount >= promo.maxUsage) {
      promoError = 'Kuota kode promo telah habis.';
    } else if (safeSubtotal < promo.minPurchaseIdr) {
      promoError = `Minimal transaksi ${formatIdr(promo.minPurchaseIdr)} untuk voucher ${promo.code}.`;
    } else if (promo.discountType === 'percent') {
      promoDiscountIdr = Math.min(
        safeSubtotal,
        Math.round((safeSubtotal * promo.discountValue) / 100)
      );
    } else {
      promoDiscountIdr = Math.min(safeSubtotal, Math.round(promo.discountValue));
    }
  }

  const afterPromo = Math.max(0, safeSubtotal - promoDiscountIdr);
  // 1 loyalty point = Rp 100, capped at 25% of post-promo subtotal
  const maxLoyaltyIdr = Math.floor(afterPromo * 0.25);
  const maxPointsAllowed = Math.floor(maxLoyaltyIdr / 100);
  const loyaltyPointsUsed = Math.max(0, Math.min(Math.floor(loyaltyPointsRequested), maxPointsAllowed));
  const loyaltyDiscountIdr = loyaltyPointsUsed * 100;

  const gateway =
    PAYMENT_GATEWAY_OPTIONS.find((item) => item.code === paymentMethod) ??
    PAYMENT_GATEWAY_OPTIONS[0];

  const finalAmountIdr = Math.max(0, afterPromo - loyaltyDiscountIdr + gateway.feeIdr);
  const installmentMonths = gateway.installmentMonths;
  const monthlyInstallmentIdr =
    installmentMonths > 1 ? Math.ceil(finalAmountIdr / installmentMonths) : finalAmountIdr;

  // Earn 1 loyalty point per Rp 10.000 spent
  const earnedLoyaltyPoints = Math.floor(finalAmountIdr / 10000);

  return {
    subtotalIdr: safeSubtotal,
    promoDiscountIdr,
    loyaltyDiscountIdr,
    loyaltyPointsUsed,
    gatewayFeeIdr: gateway.feeIdr,
    finalAmountIdr,
    installmentMonths,
    monthlyInstallmentIdr,
    earnedLoyaltyPoints,
    promoError,
  };
}

export interface PayoutCalculation {
  amountIdr: number;
  feeIdr: number;
  netAmountIdr: number;
  bankName: string;
  error: string | null;
}

export function calculatePayoutBreakdown(
  amountIdr: number,
  bankCode: IndonesianBankCode,
  availableBalanceIdr: number
): PayoutCalculation {
  const bank = INDONESIAN_BANKS.find((b) => b.code === bankCode) ?? INDONESIAN_BANKS[0];
  const rounded = Math.round(amountIdr);

  if (!Number.isFinite(rounded) || rounded < 50000) {
    return {
      amountIdr: Math.max(0, rounded || 0),
      feeIdr: bank.feeIdr,
      netAmountIdr: 0,
      bankName: bank.name,
      error: 'Minimal penarikan dana adalah Rp 50.000.',
    };
  }

  if (rounded > availableBalanceIdr) {
    return {
      amountIdr: rounded,
      feeIdr: bank.feeIdr,
      netAmountIdr: 0,
      bankName: bank.name,
      error: `Saldo tidak mencukupi. Maksimal penarikan ${formatIdr(availableBalanceIdr)}.`,
    };
  }

  const netAmountIdr = Math.max(0, rounded - bank.feeIdr);
  return {
    amountIdr: rounded,
    feeIdr: bank.feeIdr,
    netAmountIdr,
    bankName: bank.name,
    error: null,
  };
}

export function validateBankAccount(
  accountNumber: string,
  accountHolder: string
): { valid: boolean; error: string | null } {
  const cleanNumber = accountNumber.replace(/\s+/g, '');
  if (!/^[0-9]{8,20}$/.test(cleanNumber)) {
    return { valid: false, error: 'Nomor rekening harus terdiri dari 8–20 digit angka.' };
  }
  const cleanHolder = accountHolder.trim();
  if (cleanHolder.length < 3 || cleanHolder.length > 80) {
    return { valid: false, error: 'Nama pemilik rekening harus antara 3–80 karakter.' };
  }
  return { valid: true, error: null };
}

export interface AnalyticsSummary {
  totalGrossRevenueIdr: number;
  totalVerifiedOrders: number;
  totalPendingOrders: number;
  totalDownloads: number;
  totalPayoutsIdr: number;
  availableBalanceIdr: number;
  conversionRatePct: number;
  lowStockProducts: DigitalProduct[];
  paymentMethodBreakdown: { name: string; value: number; count: number }[];
  categoryPerformance: { category: string; revenue: number; units: number }[];
  dailySeries: { label: string; revenue: number; orders: number }[];
  monthlyFinancials: MonthlyFinancialRow[];
}

export function computeAnalyticsSummary(
  orders: OrderRecord[],
  payouts: PayoutRecord[],
  products: DigitalProduct[]
): AnalyticsSummary {
  const verifiedOrders = orders.filter((o) => o.paymentStatus === 'verified');
  const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending');

  const totalGrossRevenueIdr = verifiedOrders.reduce((sum, o) => sum + o.finalAmountIdr, 0);
  const totalDownloads = verifiedOrders.reduce((sum, o) => sum + o.downloadCount, 0);
  const totalPayoutsIdr = payouts
    .filter((p) => p.status !== 'rejected')
    .reduce((sum, p) => sum + p.amountIdr, 0);

  // Platform takes 5% service fee; seller receives 95%
  const sellerNetEarned = Math.round(totalGrossRevenueIdr * 0.95);
  const availableBalanceIdr = Math.max(0, sellerNetEarned - totalPayoutsIdr);

  const conversionRatePct =
    orders.length > 0
      ? Number(((verifiedOrders.length / Math.max(orders.length, 1)) * 100).toFixed(1))
      : 0;

  const lowStockProducts = products.filter((p) => p.active && p.stock <= 10);

  // Payment method breakdown
  const gatewayMap = new Map<string, { revenue: number; count: number }>();
  for (const order of verifiedOrders) {
    const label = order.paymentMethodLabel;
    const prev = gatewayMap.get(label) ?? { revenue: 0, count: 0 };
    gatewayMap.set(label, {
      revenue: prev.revenue + order.finalAmountIdr,
      count: prev.count + 1,
    });
  }
  const paymentMethodBreakdown = Array.from(gatewayMap.entries())
    .map(([name, val]) => ({ name, value: val.revenue, count: val.count }))
    .sort((a, b) => b.value - a.value);

  // Category performance
  const productById = new Map(products.map((p) => [p.id, p]));
  const catMap = new Map<string, { revenue: number; units: number }>();
  for (const order of verifiedOrders) {
    const category = productById.get(order.productId)?.category ?? 'Produk Digital';
    const prev = catMap.get(category) ?? { revenue: 0, units: 0 };
    catMap.set(category, {
      revenue: prev.revenue + order.finalAmountIdr,
      units: prev.units + 1,
    });
  }
  const categoryPerformance = Array.from(catMap.entries())
    .map(([category, val]) => ({ category, revenue: val.revenue, units: val.units }))
    .sort((a, b) => b.revenue - a.revenue);

  // 7-day interactive revenue series combining baseline + live verified orders
  const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const baseRevenues = [1420000, 1890000, 1650000, 2340000, 2780000, 2150000, 0];
  const baseOrders = [5, 7, 6, 9, 11, 8, 0];
  const todayLiveRevenue = verifiedOrders.reduce((sum, o) => sum + o.finalAmountIdr, 0);
  const dailySeries = dayLabels.map((label, idx) => {
    if (idx === dayLabels.length - 1) {
      return {
        label: 'Hari Ini',
        revenue: todayLiveRevenue,
        orders: verifiedOrders.length,
      };
    }
    return {
      label,
      revenue: baseRevenues[idx],
      orders: baseOrders[idx],
    };
  });

  // Monthly financial report rows for Admin Dashboard & PDF/CSV export
  const liveGatewayFees = verifiedOrders.reduce((sum, o) => sum + o.gatewayFeeIdr, 0);
  const livePlatformNet = Math.max(0, Math.round(totalGrossRevenueIdr * 0.05));
  const monthlyFinancials: MonthlyFinancialRow[] = [
    {
      month: 'Jul 2026',
      grossRevenueIdr: 28450000,
      gatewayFeesIdr: 342000,
      sellerPayoutsIdr: 24500000,
      platformNetIdr: 1422500,
      orderCount: 112,
    },
    {
      month: 'Agu 2026',
      grossRevenueIdr: 34900000,
      gatewayFeesIdr: 418000,
      sellerPayoutsIdr: 30200000,
      platformNetIdr: 1745000,
      orderCount: 138,
    },
    {
      month: 'Sep 2026',
      grossRevenueIdr: 41200000,
      gatewayFeesIdr: 496000,
      sellerPayoutsIdr: 36800000,
      platformNetIdr: 2060000,
      orderCount: 164,
    },
    {
      month: 'Okt 2026',
      grossRevenueIdr: 47850000,
      gatewayFeesIdr: 572000,
      sellerPayoutsIdr: 42900000,
      platformNetIdr: 2392500,
      orderCount: 191,
    },
    {
      month: 'Nov 2026 (Berjalan)',
      grossRevenueIdr: 18500000 + totalGrossRevenueIdr,
      gatewayFeesIdr: 215000 + liveGatewayFees,
      sellerPayoutsIdr: 12000000 + totalPayoutsIdr,
      platformNetIdr: 925000 + livePlatformNet,
      orderCount: 74 + verifiedOrders.length,
    },
  ];

  return {
    totalGrossRevenueIdr,
    totalVerifiedOrders: verifiedOrders.length,
    totalPendingOrders: pendingOrders.length,
    totalDownloads,
    totalPayoutsIdr,
    availableBalanceIdr,
    conversionRatePct,
    lowStockProducts,
    paymentMethodBreakdown,
    categoryPerformance,
    dailySeries,
    monthlyFinancials,
  };
}
