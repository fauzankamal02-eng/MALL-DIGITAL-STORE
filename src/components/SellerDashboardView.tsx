import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  FileText,
  Info,
  KeyRound,
  Megaphone,
  Package,
  Plus,
  ShieldCheck,
  Tag,
  TrendingUp,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react';
import type {
  AutomationSettings,
  DigitalProduct,
  IndonesianBankCode,
  OrderRecord,
  PayoutRecord,
  ProductCategory,
  PromoVoucher,
  StoreAnnouncement,
  StoreAnnouncementLevel,
  VaultProductSummary,
} from '../types';
import {
  calculatePayoutBreakdown,
  computeAnalyticsSummary,
  formatIdr,
  INDONESIAN_BANKS,
  validateBankAccount,
} from '../utils/commerce';
import { downloadSalesCsv, downloadSalesPdf } from '../utils/exportReports';
import { AppBrandLogo } from './AppBrandLogo';

type SellerSection = 'analytics' | 'inventory' | 'payouts' | 'promos' | 'announcement' | 'automation';

interface SellerDashboardViewProps {
  products: DigitalProduct[];
  orders: OrderRecord[];
  payouts: PayoutRecord[];
  promos: PromoVoucher[];
  announcement: StoreAnnouncement;
  automation: AutomationSettings;
  vaultSummaries: VaultProductSummary[];
  initialSection?: SellerSection;
  darkMode: boolean;
  onCreateProduct: (input: {
    title: string;
    brand?: string;
    category: ProductCategory;
    description: string;
    priceIdr: number;
    resellerPriceIdr?: number;
    stock: number;
    fileName: string;
    fileFormat: string;
    fileSizeMb: number;
    version: string;
  }) => Promise<void>;
  onUpdateProduct: (id: string, patch: { stock?: number; priceIdr?: number; active?: boolean }) => Promise<void>;
  onRequestPayout: (input: {
    bankCode: IndonesianBankCode;
    accountNumber: string;
    accountHolder: string;
    amountIdr: number;
  }) => Promise<void>;
  onCreatePromo: (input: {
    code: string;
    description: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minPurchaseIdr: number;
    maxUsage: number;
  }) => Promise<void>;
  onTogglePromo: (id: string, active: boolean) => Promise<void>;
  onUpdateAnnouncement: (input: {
    active: boolean;
    level: StoreAnnouncementLevel;
    title: string;
    message: string;
    estimatedResolution: string;
    showTopBanner: boolean;
  }) => Promise<void>;
  onUpdateAutomation: (input: {
    autoFulfillEnabled: boolean;
    autoSandboxVerify: boolean;
    sandboxDelaySeconds: number;
    autoDownloadOnPaid: boolean;
    autoEmailOnPaid: boolean;
  }) => Promise<void>;
  onAddVaultStock: (productId: string, rawLines: string) => Promise<{ addedCount: number }>;
  onTestWebhook: () => Promise<{
    ok: boolean;
    signatureVerified: boolean;
    fulfilledOrderCode: string | null;
    message: string;
  }>;
}

const ANNOUNCEMENT_TEMPLATES: Array<{
  label: string;
  level: StoreAnnouncementLevel;
  title: string;
  message: string;
  estimatedResolution: string;
  showTopBanner: boolean;
}> = [
  {
    label: 'Layanan Normal 24/7',
    level: 'normal',
    title: 'Semua Layanan Digital Aktif & Normal 24 Jam',
    message:
      'Seluruh katalog Aplikasi Premium, E-Book, Template & Source Code, pembayaran lokal (QRIS/VA/E-Wallet), dan unduhan otomatis berjalan lancar tanpa kendala.',
    estimatedResolution: 'Respon CS rata-rata < 5 menit · Siap digunakan kapan saja',
    showTopBanner: false,
  },
  {
    label: 'Kendala Pembayaran / Bank',
    level: 'warning',
    title: 'Keterlambatan Verifikasi Pembayaran Bank / QRIS',
    message:
      'Mohon maaf, saat ini terdapat keterlambatan verifikasi otomatis 5–10 menit dari pihak gateway bank. Dana Anda aman dan file akan terkirim otomatis begitu mutasi masuk.',
    estimatedResolution: 'Estimasi normal kembali: ± 15 menit',
    showTopBanner: true,
  },
  {
    label: 'Pemeliharaan Sistem',
    level: 'maintenance',
    title: 'Pemeliharaan Singkat Server Unduhan Otomatis',
    message:
      'Kami sedang melakukan peningkatan kecepatan server. Pesanan yang sudah dibayar tetap aman dan tautan file akan dikirim otomatis ke email Anda setelah pemeliharaan selesai.',
    estimatedResolution: 'Estimasi selesai: ± 30 menit · Hubungi CS bila mendesak',
    showTopBanner: true,
  },
  {
    label: 'Antrean Aktivasi Produk',
    level: 'info',
    title: 'Informasi Antrean Aktivasi Aplikasi Premium',
    message:
      'Karena tingginya pesanan hari ini, aktivasi beberapa akun Aplikasi Premium memerlukan waktu 10–20 menit. E-Book dan Template tetap langsung terunduh instan.',
    estimatedResolution: 'Tim CS aktif membantu di Live Chat',
    showTopBanner: true,
  },
];

export const SellerDashboardView: React.FC<SellerDashboardViewProps> = ({
  products,
  orders,
  payouts,
  promos,
  announcement,
  automation,
  vaultSummaries,
  initialSection = 'analytics',
  darkMode,
  onCreateProduct,
  onUpdateProduct,
  onRequestPayout,
  onCreatePromo,
  onTogglePromo,
  onUpdateAnnouncement,
  onUpdateAutomation,
  onAddVaultStock,
  onTestWebhook,
}) => {
  const [section, setSection] = useState<SellerSection>(initialSection);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable Store Announcement form
  const [annActive, setAnnActive] = useState(announcement.active);
  const [annLevel, setAnnLevel] = useState<StoreAnnouncementLevel>(announcement.level);
  const [annTitle, setAnnTitle] = useState(announcement.title);
  const [annMessage, setAnnMessage] = useState(announcement.message);
  const [annEta, setAnnEta] = useState(announcement.estimatedResolution);
  const [annShowTopBanner, setAnnShowTopBanner] = useState(announcement.showTopBanner);

  // Automation & Digital Vault state
  const [autoFulfill, setAutoFulfill] = useState(automation.autoFulfillEnabled);
  const [autoSandbox, setAutoSandbox] = useState(automation.autoSandboxVerify);
  const [sandboxDelay, setSandboxDelay] = useState(String(automation.sandboxDelaySeconds));
  const [autoDownload, setAutoDownload] = useState(automation.autoDownloadOnPaid);
  const [autoEmail, setAutoEmail] = useState(automation.autoEmailOnPaid);
  const [vaultProductId, setVaultProductId] = useState<string>(products[0]?.id ?? '');
  const [vaultRawLines, setVaultRawLines] = useState('');
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setAnnActive(announcement.active);
    setAnnLevel(announcement.level);
    setAnnTitle(announcement.title);
    setAnnMessage(announcement.message);
    setAnnEta(announcement.estimatedResolution);
    setAnnShowTopBanner(announcement.showTopBanner);
  }, [announcement]);

  useEffect(() => {
    setAutoFulfill(automation.autoFulfillEnabled);
    setAutoSandbox(automation.autoSandboxVerify);
    setSandboxDelay(String(automation.sandboxDelaySeconds));
    setAutoDownload(automation.autoDownloadOnPaid);
    setAutoEmail(automation.autoEmailOnPaid);
  }, [automation]);

  useEffect(() => {
    if (!vaultProductId && products.length > 0) {
      setVaultProductId(products[0].id);
    }
  }, [products, vaultProductId]);

  // New Product form
  const [prodTitle, setProdTitle] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>('Aplikasi Premium');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('25000');
  const [prodResellerPrice, setProdResellerPrice] = useState('22000');
  const [prodStock, setProdStock] = useState('25');
  const [prodFileName, setProdFileName] = useState('');
  const [prodFormat, setProdFormat] = useState('LISENSI / TXT');

  // Payout form
  const [bankCode, setBankCode] = useState<IndonesianBankCode>('BCA');
  const [accountNumber, setAccountNumber] = useState('5271048821');
  const [accountHolder, setAccountHolder] = useState('Fauzan Kamal');
  const [payoutAmount, setPayoutAmount] = useState('150000');

  // New Promo form
  const [promoCode, setPromoCode] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed'>('percent');
  const [promoValue, setPromoValue] = useState('15');
  const [promoMin, setPromoMin] = useState('100000');
  const [promoMaxUsage, setPromoMaxUsage] = useState('100');

  const analytics = useMemo(
    () => computeAnalyticsSummary(orders, payouts, products),
    [orders, payouts, products]
  );

  const payoutPreview = useMemo(
    () =>
      calculatePayoutBreakdown(
        Number(payoutAmount) || 0,
        bankCode,
        analytics.availableBalanceIdr
      ),
    [payoutAmount, bankCode, analytics.availableBalanceIdr]
  );

  const axisColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? '#1e293b' : '#e2e8f0';

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setBusy(true);
    try {
      await onCreateProduct({
        title: prodTitle.trim(),
        category: prodCategory,
        description: prodDesc.trim(),
        priceIdr: Number(prodPrice),
        resellerPriceIdr: Number(prodResellerPrice) || undefined,
        stock: Number(prodStock),
        fileName: prodFileName.trim() || `${prodTitle.trim().toLowerCase().replace(/\s+/g, '-')}.txt`,
        fileFormat: prodFormat.trim() || 'LISENSI / TXT',
        fileSizeMb: 1.5,
        version: '1 Bulan',
      });
      setProdTitle('');
      setProdDesc('');
      setProdFileName('');
      setFeedback('Produk digital baru berhasil ditambahkan dan disinkronkan ke etalase.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menambah produk.');
    } finally {
      setBusy(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    const accCheck = validateBankAccount(accountNumber, accountHolder);
    if (!accCheck.valid) {
      setErrorMsg(accCheck.error);
      return;
    }
    if (payoutPreview.error) {
      setErrorMsg(payoutPreview.error);
      return;
    }
    setBusy(true);
    try {
      await onRequestPayout({
        bankCode,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        amountIdr: Number(payoutAmount),
      });
      setFeedback(
        `Penarikan ${formatIdr(payoutPreview.netAmountIdr)} ke ${payoutPreview.bankName} berhasil diproses.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Penarikan dana gagal.');
    } finally {
      setBusy(false);
    }
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setBusy(true);
    try {
      await onCreatePromo({
        code: promoCode.trim().toUpperCase(),
        description: promoDesc.trim(),
        discountType: promoType,
        discountValue: Number(promoValue),
        minPurchaseIdr: Number(promoMin) || 0,
        maxUsage: Number(promoMaxUsage) || 50,
      });
      setPromoCode('');
      setPromoDesc('');
      setFeedback('Voucher promosi loyalitas berhasil dibuat dan langsung aktif di checkout.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat voucher.');
    } finally {
      setBusy(false);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setBusy(true);
    try {
      await onUpdateAnnouncement({
        active: annActive,
        level: annLevel,
        title: annTitle.trim(),
        message: annMessage.trim(),
        estimatedResolution: annEta.trim(),
        showTopBanner: annShowTopBanner,
      });
      setFeedback('Pemberitahuan toko berhasil disimpan dan langsung tayang ke seluruh pembeli secara real-time.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui pemberitahuan toko.');
    } finally {
      setBusy(false);
    }
  };

  const selectedVaultSummary = useMemo(
    () => vaultSummaries.find((v) => v.productId === vaultProductId) ?? null,
    [vaultSummaries, vaultProductId]
  );

  const handleSaveAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setBusy(true);
    try {
      await onUpdateAutomation({
        autoFulfillEnabled: autoFulfill,
        autoSandboxVerify: autoSandbox,
        sandboxDelaySeconds: Math.max(1, Math.min(15, Number(sandboxDelay) || 3)),
        autoDownloadOnPaid: autoDownload,
        autoEmailOnPaid: autoEmail,
      });
      setFeedback('Pengaturan layanan otomatis 24/7 berhasil disimpan dan aktif secara real-time.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan otomatis.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    if (!vaultProductId) {
      setErrorMsg('Pilih produk terlebih dahulu sebelum mengisi gudang akun/lisensi.');
      return;
    }
    setBusy(true);
    try {
      const res = await onAddVaultStock(vaultProductId, vaultRawLines);
      setVaultRawLines('');
      const prodTitleFound = products.find((p) => p.id === vaultProductId)?.title || 'Produk';
      setFeedback(
        `+${res.addedCount} item akses otomatis berhasil ditambahkan ke gudang "${prodTitleFound}".`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menambahkan stok gudang otomatis.');
    } finally {
      setBusy(false);
    }
  };

  const handleRunWebhookTest = async () => {
    setErrorMsg(null);
    setFeedback(null);
    setWebhookTestResult(null);
    setBusy(true);
    try {
      const res = await onTestWebhook();
      setWebhookTestResult(res.message);
      setFeedback(res.message);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menguji callback webhook.');
    } finally {
      setBusy(false);
    }
  };

  const webhookUrlDisplay =
    typeof window !== 'undefined'
      ? `${window.location.origin}${automation.webhookEndpointPath}`
      : automation.webhookEndpointPath;

  const handleCopyWebhookUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrlDisplay).catch(() => {});
    }
    setCopiedWebhook(true);
    window.setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header & Report Export */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dasbor Penjual &amp; Analitik Real-Time
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pantau omzet Rupiah secara langsung, kelola stok lisensi sinkron, promo loyalitas, dan penarikan bank lokal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSalesCsv(orders)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => downloadSalesPdf(orders, analytics.totalGrossRevenueIdr)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Real-Time KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Omzet Terverifikasi (Live)</p>
          <p
            data-testid="seller-kpi-revenue"
            className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50"
          >
            {formatIdr(analytics.totalGrossRevenueIdr)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
            {analytics.totalVerifiedOrders} transaksi selesai · Konversi {analytics.conversionRatePct}%
          </p>
        </div>

        <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Dapat Ditarik</p>
          <p
            data-testid="seller-kpi-balance"
            className="mt-2 text-2xl font-bold font-mono tabular-nums text-cyan-700 dark:text-teal-300"
          >
            {formatIdr(analytics.availableBalanceIdr)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Total ditarik: {formatIdr(analytics.totalPayoutsIdr)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Unduhan Otomatis</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {analytics.totalDownloads}x
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Terkirim otomatis setelah verifikasi gateway
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Kesehatan Inventaris</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {products.filter((p) => p.active).length} Produk Aktif
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            {analytics.lowStockProducts.length} produk stok lisensi &le; 10
          </p>
        </div>
      </section>

      {/* Sub-navigation Tabs */}
      <div
        role="tablist"
        aria-label="Menu Dasbor Penjual"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-3"
      >
        {(
          [
            ['analytics', 'Grafik Performa', TrendingUp],
            ['inventory', 'Inventaris Sinkron', Package],
            ['payouts', 'Penarikan Bank Lokal', Building2],
            ['promos', 'Promo & Loyalitas', Tag],
            ['announcement', 'Pemberitahuan Toko', Megaphone],
            ['automation', 'Otomatisasi & Webhook', Zap],
          ] as const
        ).map(([key, label, Icon]) => {
          const active = section === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              data-testid={`seller-tab-${key}`}
              type="button"
              onClick={() => {
                setSection(key);
                setFeedback(null);
                setErrorMsg(null);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-teal-950/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          role="status"
          className="p-3.5 text-sm text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg"
        >
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 text-sm text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg"
        >
          {errorMsg}
        </div>
      )}

      {/* TAB 1: Interactive Store Performance Charts */}
      {section === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Tren Pendapatan Penjualan Harian (IDR)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Diperbarui otomatis setiap transaksi terverifikasi masuk.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-700 dark:text-teal-300">7 Hari Terakhir</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailySeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatIdr(Number(value)), 'Omzet']}
                    contentStyle={{
                      backgroundColor: darkMode ? '#081e2c' : '#ffffff',
                      borderColor: darkMode ? '#115e59' : '#e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fill="url(#revFill)"
                    animationDuration={200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Performa per Kategori Produk
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kontribusi omzet berdasarkan kategori aset digital terverifikasi.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.categoryPerformance}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    stroke={axisColor}
                    fontSize={11}
                    width={98}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatIdr(Number(value)), 'Pendapatan']}
                    contentStyle={{
                      backgroundColor: darkMode ? '#081e2c' : '#ffffff',
                      borderColor: darkMode ? '#115e59' : '#e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#059669"
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                    animationDuration={200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Gateway Share Table */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Distribusi Metode Pembayaran Lokal
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-medium">Kanal Pembayaran</th>
                    <th className="px-6 py-3 font-medium text-right">Jumlah Transaksi</th>
                    <th className="px-6 py-3 font-medium text-right">Total Volume (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics.paymentMethodBreakdown.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {item.count}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatIdr(item.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Synchronized Inventory Management */}
      {section === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Manajemen Inventaris Lisensi Digital
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Setiap pesanan masuk otomatis mengurangi sisa kuota lisensi secara sinkron.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-medium">Produk &amp; Berkas</th>
                    <th className="px-6 py-3 font-medium">Kategori</th>
                    <th className="px-6 py-3 font-medium text-right">Harga (IDR)</th>
                    <th className="px-6 py-3 font-medium text-right">Terjual</th>
                    <th className="px-6 py-3 font-medium text-right">Sisa Lisensi</th>
                    <th className="px-6 py-3 font-medium text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <AppBrandLogo brand={prod.brand} title={prod.title} size="xs" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{prod.title}</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                              {prod.fileName} · {prod.version}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {prod.category}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {formatIdr(prod.priceIdr)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {prod.soldCount}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums">
                        <span
                          className={
                            prod.stock <= 10
                              ? 'font-semibold text-amber-700 dark:text-amber-400'
                              : 'font-semibold text-slate-900 dark:text-slate-100'
                          }
                        >
                          {prod.stock}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateProduct(prod.id, { stock: prod.stock + 10 })}
                            aria-label={`Tambah 10 stok ${prod.title}`}
                            className="px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-md whitespace-nowrap"
                          >
                            +10 Stok
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateProduct(prod.id, { active: !prod.active })}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md whitespace-nowrap"
                          >
                            {prod.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add New Digital Product Form */}
          <form
            onSubmit={handleAddProduct}
            className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tambah Produk Digital Baru
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="prod-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Produk
                </label>
                <input
                  id="prod-title"
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  placeholder="Contoh: YouTube Premium 1 Bulan"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="prod-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  id="prod-category"
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Aplikasi Premium">Aplikasi Premium</option>
                  <option value="E-Book">E-Book</option>
                  <option value="Template & Kode">Template &amp; Kode</option>
                  <option value="UI Kit">UI Kit</option>
                  <option value="Template">Template</option>
                  <option value="Source Code">Source Code</option>
                </select>
              </div>
              <div>
                <label htmlFor="prod-filename" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama File Unduhan
                </label>
                <input
                  id="prod-filename"
                  type="text"
                  value={prodFileName}
                  onChange={(e) => setProdFileName(e.target.value)}
                  placeholder="youtube-premium-1bln.txt"
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="prod-price" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Harga Reguler (IDR)
                </label>
                <input
                  id="prod-price"
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="prod-reseller-price" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Harga Reseller (IDR)
                </label>
                <input
                  id="prod-reseller-price"
                  type="number"
                  min={500}
                  step={500}
                  value={prodResellerPrice}
                  onChange={(e) => setProdResellerPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="prod-stock" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Stok Awal
                </label>
                <input
                  id="prod-stock"
                  type="number"
                  min={1}
                  required
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="prod-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Produk
                </label>
                <textarea
                  id="prod-desc"
                  rows={2}
                  required
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Jelaskan masa aktif, garansi, isi file, dan petunjuk aktivasi..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="prod-format" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Format Berkas
                </label>
                <input
                  id="prod-format"
                  type="text"
                  value={prodFormat}
                  onChange={(e) => setProdFormat(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-50"
              >
                {busy ? 'Menyimpan...' : 'Simpan & Sinkronkan Produk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Local Indonesian Bank Payouts */}
      {section === 'payouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePayoutSubmit}
            className="lg:col-span-5 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tarik Dana ke Bank Lokal Indonesia
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Saldo tersedia:{' '}
                <span className="font-mono font-semibold text-cyan-700 dark:text-teal-300">
                  {formatIdr(analytics.availableBalanceIdr)}
                </span>
              </p>
            </div>

            <div>
              <label htmlFor="payout-bank" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bank Tujuan (BI-FAST)
              </label>
              <select
                id="payout-bank"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value as IndonesianBankCode)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {INDONESIAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name} — {bank.feeIdr === 0 ? 'Gratis' : `Biaya ${formatIdr(bank.feeIdr)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="payout-account-number" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nomor Rekening
              </label>
              <input
                id="payout-account-number"
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="8–20 digit nomor rekening"
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="payout-account-holder" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nama Pemilik Rekening
              </label>
              <input
                id="payout-account-holder"
                type="text"
                required
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="payout-amount" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nominal Penarikan (IDR)
              </label>
              <input
                id="payout-amount"
                type="number"
                min={50000}
                step={5000}
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Biaya Transfer BI-FAST</span>
                <span className="font-mono tabular-nums">{formatIdr(payoutPreview.feeIdr)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100 text-sm">
                <span>Dana Bersih Diterima</span>
                <span className="font-mono tabular-nums text-cyan-700 dark:text-teal-300">
                  {formatIdr(payoutPreview.netAmountIdr)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-50"
            >
              {busy ? 'Memproses Penarikan...' : 'Proses Penarikan Dana'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Riwayat Penarikan ke Bank Lokal
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-medium">Kode &amp; Bank</th>
                    <th className="px-5 py-3 font-medium">Rekening</th>
                    <th className="px-5 py-3 font-medium text-right">Dana Bersih</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payouts.map((po) => (
                    <tr key={po.id} data-testid={`payout-row-${po.payoutCode}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-mono font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {po.payoutCode}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{po.bankName}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {po.accountNumber}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">{po.accountHolder}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatIdr(po.netAmountIdr)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {po.status === 'completed' ? 'Terkirim' : 'Diproses'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Special Promotions & Loyalty Vouchers */}
      {section === 'promos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePromoSubmit}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Buat Kode Promo &amp; Loyalitas
            </h2>

            <div>
              <label htmlFor="promo-code" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kode Voucher
              </label>
              <input
                id="promo-code"
                type="text"
                required
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Contoh: BONUS25"
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="promo-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi Promo
              </label>
              <input
                id="promo-desc"
                type="text"
                required
                value={promoDesc}
                onChange={(e) => setPromoDesc(e.target.value)}
                placeholder="Diskon spesial akhir bulan pelanggan loyal"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-type" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Diskon
                </label>
                <select
                  id="promo-type"
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as 'percent' | 'fixed')}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="percent">Persentase (%)</option>
                  <option value="fixed">Nominal Tetap (IDR)</option>
                </select>
              </div>
              <div>
                <label htmlFor="promo-val" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nilai Diskon
                </label>
                <input
                  id="promo-val"
                  type="number"
                  min={1}
                  required
                  value={promoValue}
                  onChange={(e) => setPromoValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-min" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Min. Transaksi (IDR)
                </label>
                <input
                  id="promo-min"
                  type="number"
                  min={0}
                  value={promoMin}
                  onChange={(e) => setPromoMin(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="promo-quota" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kuota Pemakaian
                </label>
                <input
                  id="promo-quota"
                  type="number"
                  min={1}
                  value={promoMaxUsage}
                  onChange={(e) => setPromoMaxUsage(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-50"
            >
              {busy ? 'Menyimpan...' : 'Aktifkan Kode Promo'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-teal-950">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Daftar Voucher &amp; Program Loyalitas Aktif
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-teal-950/70">
              {promos.map((promo) => (
                <div key={promo.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{promo.code}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-cyan-700 dark:text-teal-300">
                        {promo.discountType === 'percent'
                          ? `Diskon ${promo.discountValue}%`
                          : `Potongan ${formatIdr(promo.discountValue)}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Terpakai {promo.usageCount}/{promo.maxUsage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{promo.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePromo(promo.id, !promo.active)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    {promo.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Editable Store Announcement & Incident Broadcast Format */}
      {section === 'announcement' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAnnouncementSubmit}
            data-testid="announcement-editor-form"
            className="lg:col-span-7 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-5"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Format Pemberitahuan &amp; Info Kendala ke Pembeli
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Gunakan format ini kapan saja jika terjadi kendala pembayaran, antrean aktivasi, atau pemeliharaan agar pembeli langsung mengetahuinya di halaman utama.
              </p>
            </div>

            {/* 1-Click Preset Formats */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Template Cepat (1-Klik):
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      setAnnActive(true);
                      setAnnLevel(tpl.level);
                      setAnnTitle(tpl.title);
                      setAnnMessage(tpl.message);
                      setAnnEta(tpl.estimatedResolution);
                      setAnnShowTopBanner(tpl.showTopBanner);
                    }}
                    className="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-teal-900 bg-[#F3FAFC] dark:bg-[#04121C] hover:border-teal-500 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ['normal', 'Normal', CheckCircle2],
                  ['info', 'Info', Info],
                  ['warning', 'Kendala', AlertTriangle],
                  ['maintenance', 'Gangguan', Wrench],
                ] as const
              ).map(([lvl, label, Icon]) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setAnnLevel(lvl)}
                  aria-pressed={annLevel === lvl}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    annLevel === lvl
                      ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white border-transparent'
                      : 'bg-white dark:bg-[#04121C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="ann-title"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Judul Pemberitahuan
              </label>
              <input
                id="ann-title"
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Contoh: Keterlambatan Verifikasi QRIS 5-10 Menit"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="ann-message"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Isi Pesan untuk Pembeli
              </label>
              <textarea
                id="ann-message"
                rows={3}
                required
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                placeholder="Jelaskan kendala yang sedang terjadi dan jaminan keamanan pesanan pembeli..."
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="ann-eta"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Estimasi Selesai / Catatan Tambahan (Opsional)
              </label>
              <input
                id="ann-eta"
                type="text"
                value={annEta}
                onChange={(e) => setAnnEta(e.target.value)}
                placeholder="Contoh: Estimasi normal kembali ± 15 menit"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-teal-950">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annActive}
                  onChange={(e) => setAnnActive(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Tampilkan pesan ini di Papan Pemberitahuan Halaman Utama
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annShowTopBanner}
                  onChange={(e) => setAnnShowTopBanner(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Sematkan juga di bilah pengumuman paling atas (disarankan saat ada kendala)
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              data-testid="save-announcement-btn"
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl disabled:opacity-50"
            >
              {busy ? 'Menyimpan & Menyiarkan...' : 'Simpan & Tayangkan ke Pembeli'}
            </button>
          </form>

          {/* Live Buyer Preview Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pratinjau Tampilan Pembeli
                </h3>
                <span className="text-[11px] font-mono text-cyan-700 dark:text-teal-300">
                  Real-Time
                </span>
              </div>

              <div
                className={`p-4 rounded-xl bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-200 dark:border-teal-900 border-l-4 space-y-2 ${
                  annLevel === 'maintenance'
                    ? 'border-l-rose-500'
                    : annLevel === 'warning'
                      ? 'border-l-amber-500'
                      : annLevel === 'info'
                        ? 'border-l-sky-500'
                        : 'border-l-emerald-500'
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Papan Pemberitahuan Toko · {annLevel.toUpperCase()}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {annActive ? annTitle || 'Judul pemberitahuan...' : 'Mode Senyap (Layanan Normal)'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {annActive
                    ? annMessage || 'Isi pemberitahuan untuk pembeli...'
                    : 'Pembeli akan melihat status standar bahwa semua layanan berjalan normal.'}
                </p>
                {annActive && annEta && (
                  <p className="text-[11px] font-medium text-cyan-800 dark:text-teal-300 pt-1">
                    {annEta}
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Saat status diubah ke <strong>Kendala</strong> atau <strong>Gangguan</strong>, sistem otomatis mengirimkan notifikasi push real-time ke seluruh pembeli yang sedang membuka toko.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Auto-Fulfillment, Digital Vault & Payment Gateway Webhook */}
      {section === 'automation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Automation Toggles & Webhook Readiness */}
          <div className="lg:col-span-6 space-y-6">
            <form
              onSubmit={handleSaveAutomation}
              className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Pengaturan Layanan Otomatis 24/7
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Begitu pembayaran terverifikasi (webhook gateway atau sandbox otomatis), sistem langsung mengirim akun/lisensi/SN token &amp; membuka unduhan tanpa klik manual.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 ${
                    autoFulfill
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {autoFulfill ? 'AUTO AKTIF' : 'MANUAL'}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFulfill}
                    onChange={(e) => setAutoFulfill(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    <strong className="block text-slate-900 dark:text-slate-100">
                      Kirim Pesanan Otomatis Saat Pembayaran Lunas
                    </strong>
                    Ambil stok akun/lisensi dari Gudang Otomatis atau generate SN Token Top Up seketika.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSandbox}
                    onChange={(e) => setAutoSandbox(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    <strong className="block text-slate-900 dark:text-slate-100">
                      Auto-Verifikasi Pembayaran Sandbox (Uji Coba Tanpa Klik)
                    </strong>
                    Simulasikan callback lunas otomatis beberapa detik setelah pembeli membuat tagihan. Matikan saat sudah terhubung ke webhook Midtrans/Xendit/Tripay live.
                  </span>
                </label>

                {autoSandbox && (
                  <div className="pl-6">
                    <label
                      htmlFor="sandbox-delay-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Jeda Auto-Callback Sandbox (1–15 detik)
                    </label>
                    <input
                      id="sandbox-delay-input"
                      type="number"
                      min={1}
                      max={15}
                      value={sandboxDelay}
                      onChange={(e) => setSandboxDelay(e.target.value)}
                      className="w-28 px-3 py-1.5 text-sm font-mono bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDownload}
                    onChange={(e) => setAutoDownload(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    <strong className="block text-slate-900 dark:text-slate-100">
                      Picu Unduhan Berkas / Struk Otomatis di Browser Pembeli
                    </strong>
                    Saat pembayaran terkonfirmasi real-time, file produk digital atau struk otomatis mulai diunduh.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEmail}
                    onChange={(e) => setAutoEmail(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    <strong className="block text-slate-900 dark:text-slate-100">
                      Kirim Email Bukti &amp; Tautan Unduhan Otomatis
                    </strong>
                    Otomatis catat &amp; kirim email ke pelanggan (terhubung ke Resend bila kunci server aktif).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                data-testid="save-automation-btn"
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl disabled:opacity-50"
              >
                {busy ? 'Menyimpan...' : 'Simpan Pengaturan Otomatis'}
              </button>
            </form>

            {/* Production Webhook Endpoint & Integration Readiness Card (Read-Only Status — No Key Inputs) */}
            <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Endpoint Webhook Gateway &amp; Integrasi Live
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tempelkan URL callback di bawah ke dasbor <strong>Midtrans, Xendit, Tripay, atau Duitku</strong> agar status lunas langsung diterima server dengan verifikasi tanda tangan <strong>HMAC-SHA256</strong>.
              </p>

              <div className="p-3 rounded-lg bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-200 dark:border-teal-900 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-teal-300">
                    POST Webhook URL
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:text-teal-200 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-800 rounded-md hover:border-teal-400"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedWebhook ? 'Tersalin' : 'Salin URL'}
                  </button>
                </div>
                <p className="text-xs font-mono break-all text-slate-900 dark:text-slate-100">
                  {webhookUrlDisplay}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Header: x-webhook-signature: &lt;HMAC-SHA256 hex&gt;
                </p>
              </div>

              {/* Read-only Environment Readiness Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {(
                  [
                    [
                      'Gateway Lokal',
                      'PAYMENT_GATEWAY_SERVER_KEY',
                      automation.integrations.paymentGatewayConfigured,
                    ],
                    [
                      'Rahasia Webhook',
                      'PAYMENT_WEBHOOK_SECRET',
                      automation.integrations.webhookSecretConfigured,
                    ],
                    [
                      'Supplier Top Up H2H',
                      'DIGIFLAZZ_API_KEY',
                      automation.integrations.supplierApiConfigured,
                    ],
                    [
                      'Email Otomatis',
                      'RESEND_API_KEY',
                      automation.integrations.emailServiceConfigured,
                    ],
                  ] as const
                ).map(([label, envKey, ready]) => (
                  <div
                    key={envKey}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-teal-900 bg-slate-50/70 dark:bg-[#04121C]/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {label}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        {envKey}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        ready
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                      }`}
                    >
                      {ready ? 'Live Siap' : 'Sandbox'}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Demi keamanan, seluruh kunci rahasia integrasi dipasang di panel <strong>Secrets / Environment Server</strong> (bukan di browser).
              </p>

              <div className="pt-1 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRunWebhookTest()}
                  data-testid="test-webhook-btn"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-cyan-900 dark:text-teal-100 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/70 dark:to-emerald-950/70 border border-teal-300 dark:border-teal-800 hover:border-teal-500 rounded-xl disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Uji Callback Webhook (HMAC-SHA256)
                </button>
                {webhookTestResult && (
                  <div
                    data-testid="webhook-test-result"
                    className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200"
                  >
                    {webhookTestResult}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Digital Credential / License Vault */}
          <div className="lg:col-span-6 space-y-6">
            <form
              onSubmit={handleAddVaultSubmit}
              data-testid="vault-stock-form"
              className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
                  Gudang Stok Akun &amp; Lisensi Otomatis
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Masukkan daftar akun siap pakai, tautan undangan, atau kode serial (1 baris = 1 pesanan). Saat pembeli membayar lunas, sistem otomatis mengambil 1 baris dan langsung mengirimkannya ke pelanggan.
                </p>
              </div>

              <div>
                <label
                  htmlFor="vault-product-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Pilih Produk Digital
                </label>
                <select
                  id="vault-product-select"
                  value={vaultProductId}
                  onChange={(e) => setVaultProductId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {products.map((p) => {
                    const vs = vaultSummaries.find((s) => s.productId === p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title} — Gudang Siap Kirim: {vs?.availableCount ?? 0}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedVaultSummary && (
                <div className="p-3.5 rounded-xl bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-200 dark:border-teal-900 space-y-2.5">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Antrean Siap Kirim Otomatis:
                    </span>
                    <span
                      data-testid="vault-available-count"
                      className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      {selectedVaultSummary.availableCount} item
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Sudah Terkirim Otomatis:
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {selectedVaultSummary.usedCount} item
                    </span>
                  </div>
                  {selectedVaultSummary.maskedSamples.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-teal-950 space-y-1">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Pratinjau Antrean Berikutnya (Disamarkan):
                      </p>
                      {selectedVaultSummary.maskedSamples.map((sample, idx) => (
                        <p
                          key={`${sample}-${idx}`}
                          className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate"
                        >
                          {idx + 1}. {sample}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="vault-lines-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Tempel Daftar Akun / Lisensi / Tautan (1 baris = 1 pesanan)
                </label>
                <textarea
                  id="vault-lines-input"
                  data-testid="vault-lines-input"
                  rows={5}
                  value={vaultRawLines}
                  onChange={(e) => setVaultRawLines(e.target.value)}
                  placeholder={`Contoh:\nEmail: vip10@malldigital.id | Pass: CapPro#10 | Garansi 30 Hari\nEmail: vip11@malldigital.id | Pass: CapPro#11 | Garansi 30 Hari`}
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={busy || !vaultRawLines.trim()}
                data-testid="add-vault-btn"
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl disabled:opacity-50"
              >
                {busy ? 'Menyimpan ke Gudang...' : 'Tambahkan ke Gudang Otomatis'}
              </button>
            </form>

            {/* Quick Vault Overview Table */}
            <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-teal-950">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ringkasan Stok Gudang Otomatis per Produk
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-teal-950/70 max-h-64 overflow-y-auto">
                {products.slice(0, 8).map((prod) => {
                  const vs = vaultSummaries.find((s) => s.productId === prod.id);
                  const avail = vs?.availableCount ?? 0;
                  return (
                    <div
                      key={prod.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AppBrandLogo brand={prod.brand} title={prod.title} size="xs" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {prod.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {avail > 0
                              ? `${avail} akun/lisensi siap kirim otomatis`
                              : 'Mode kode lisensi/berkas otomatis'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVaultProductId(prod.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-cyan-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-md whitespace-nowrap shrink-0"
                      >
                        Isi Stok
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
