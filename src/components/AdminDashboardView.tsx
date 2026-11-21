import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Cloud,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type {
  ActivityLog,
  CloudBackupRecord,
  DigitalProduct,
  FaqCategory,
  FaqItem,
  OrderRecord,
  PayoutRecord,
} from '../types';
import { computeAnalyticsSummary, formatIdr } from '../utils/commerce';
import {
  downloadMonthlyFinancialCsv,
  downloadMonthlyFinancialPdf,
} from '../utils/exportReports';
import { FAQ_CATEGORIES } from '../utils/faqUtils';

interface AdminDashboardViewProps {
  orders: OrderRecord[];
  payouts: PayoutRecord[];
  products: DigitalProduct[];
  faqs: FaqItem[];
  activityLogs: ActivityLog[];
  backups: CloudBackupRecord[];
  backupSchedule: 'daily' | 'weekly';
  initialSection?: 'overview' | 'faq';
  darkMode: boolean;
  onTriggerBackup: () => Promise<void>;
  onChangeBackupSchedule: (schedule: 'daily' | 'weekly') => Promise<void>;
  onVerifyBackup: (id: string) => Promise<{
    verified: boolean;
    summary: { exportedAt: string; productsCount: number; ordersCount: number };
  }>;
  onCreateFaq: (input: {
    category: FaqCategory;
    question: string;
    answer: string;
    active: boolean;
  }) => Promise<void>;
  onUpdateFaq: (
    id: string,
    patch: {
      category?: FaqCategory;
      question?: string;
      answer?: string;
      active?: boolean;
    }
  ) => Promise<void>;
  onDeleteFaq: (id: string) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  orders,
  payouts,
  products,
  faqs,
  activityLogs,
  backups,
  backupSchedule,
  initialSection = 'overview',
  darkMode,
  onTriggerBackup,
  onChangeBackupSchedule,
  onVerifyBackup,
  onCreateFaq,
  onUpdateFaq,
  onDeleteFaq,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'faq'>(initialSection);
  const [logFilter, setLogFilter] = useState<'all' | ActivityLog['category']>('all');
  const [backingUp, setBackingUp] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  // Admin FAQ Manager states
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState<FaqCategory>('Pembayaran');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqActive, setFaqActive] = useState(true);
  const [faqSubmitting, setFaqSubmitting] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [faqNotice, setFaqNotice] = useState<string | null>(null);
  const [busyFaqId, setBusyFaqId] = useState<string | null>(null);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const analytics = useMemo(
    () => computeAnalyticsSummary(orders, payouts, products),
    [orders, payouts, products]
  );

  const filteredLogs = useMemo(
    () =>
      logFilter === 'all'
        ? activityLogs
        : activityLogs.filter((l) => l.category === logFilter),
    [activityLogs, logFilter]
  );

  const axisColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? '#1e293b' : '#e2e8f0';

  const handleRunBackup = async () => {
    setBackingUp(true);
    setBackupNotice(null);
    try {
      await onTriggerBackup();
      setBackupNotice('Cadangan terenkripsi AES-256-GCM berhasil dibuat dan disinkronkan ke penyimpanan awan.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleVerifySnapshot = async (id: string) => {
    setVerifyingId(id);
    setBackupNotice(null);
    try {
      const res = await onVerifyBackup(id);
      setBackupNotice(
        `Integritas AES-256-GCM terverifikasi (${res.summary.productsCount} produk, ${res.summary.ordersCount} pesanan).`
      );
    } finally {
      setVerifyingId(null);
    }
  };

  const sortedFaqs = useMemo(
    () =>
      [...faqs].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
      ),
    [faqs]
  );

  const activeFaqCount = useMemo(() => faqs.filter((item) => item.active).length, [faqs]);

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqCategory('Pembayaran');
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqActive(true);
    setFaqError(null);
  };

  const handleStartEditFaq = (item: FaqItem) => {
    setEditingFaqId(item.id);
    setFaqCategory(item.category);
    setFaqQuestion(item.question);
    setFaqAnswer(item.answer);
    setFaqActive(item.active);
    setFaqError(null);
    setFaqNotice(null);
  };

  const handleSubmitFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError(null);
    setFaqNotice(null);
    setFaqSubmitting(true);
    try {
      if (editingFaqId) {
        await onUpdateFaq(editingFaqId, {
          category: faqCategory,
          question: faqQuestion,
          answer: faqAnswer,
          active: faqActive,
        });
        setFaqNotice('Perubahan FAQ berhasil disimpan dan langsung tersinkronisasi ke halaman beranda.');
      } else {
        await onCreateFaq({
          category: faqCategory,
          question: faqQuestion,
          answer: faqAnswer,
          active: faqActive,
        });
        setFaqNotice('FAQ baru berhasil ditambahkan dan langsung tampil di halaman beranda.');
      }
      resetFaqForm();
    } catch (err) {
      setFaqError(err instanceof Error ? err.message : 'Gagal menyimpan data FAQ.');
    } finally {
      setFaqSubmitting(false);
    }
  };

  const handleToggleFaqVisibility = async (item: FaqItem) => {
    setBusyFaqId(item.id);
    setFaqError(null);
    setFaqNotice(null);
    try {
      await onUpdateFaq(item.id, { active: !item.active });
      setFaqNotice(
        !item.active
          ? `FAQ "${item.question}" sekarang ditayangkan di halaman beranda.`
          : `FAQ "${item.question}" disembunyikan dari halaman beranda.`
      );
    } catch (err) {
      setFaqError(err instanceof Error ? err.message : 'Gagal memperbarui status FAQ.');
    } finally {
      setBusyFaqId(null);
    }
  };

  const handleDeleteFaqItem = async (item: FaqItem) => {
    setBusyFaqId(item.id);
    setFaqError(null);
    setFaqNotice(null);
    try {
      await onDeleteFaq(item.id);
      if (editingFaqId === item.id) {
        resetFaqForm();
      }
      setFaqNotice(`FAQ "${item.question}" telah dihapus dari daftar.`);
    } catch (err) {
      setFaqError(err instanceof Error ? err.message : 'Gagal menghapus FAQ.');
    } finally {
      setBusyFaqId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dasbor Admin — Keuangan Bulanan, FAQ &amp; Pengawasan Platform
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Kelola daftar FAQ beranda pelanggan, laporan keuangan bulanan Rupiah, pencadangan awan terenkripsi, dan jejak audit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadMonthlyFinancialCsv(analytics.monthlyFinancials)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Laporan Keuangan CSV
          </button>
          <button
            type="button"
            onClick={() => downloadMonthlyFinancialPdf(analytics.monthlyFinancials)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            Laporan Keuangan PDF
          </button>
        </div>
      </div>

      {/* Section Switcher */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-teal-950 overflow-x-auto">
        <button
          type="button"
          data-testid="admin-tab-overview"
          onClick={() => setActiveSection('overview')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeSection === 'overview'
              ? 'text-cyan-800 dark:text-teal-300 border-teal-600 dark:border-teal-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Keuangan, Cadangan &amp; Audit
        </button>
        <button
          type="button"
          data-testid="admin-tab-faq"
          onClick={() => setActiveSection('faq')}
          className={`inline-flex items-center gap-1.5 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeSection === 'faq'
              ? 'text-cyan-800 dark:text-teal-300 border-teal-600 dark:border-teal-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Kelola FAQ Pelanggan ({activeFaqCount}/{faqs.length})
        </button>
      </div>

      {activeSection === 'faq' ? (
        <section
          data-testid="admin-faq-section"
          aria-label="Manajemen FAQ Beranda Pelanggan"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left: Add / Edit FAQ Form */}
          <div className="lg:col-span-5 bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-teal-300">
                {editingFaqId ? 'Mode Sunting FAQ' : 'Tambah Pertanyaan Baru'}
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingFaqId ? 'Perbarui Jawaban FAQ' : 'Buat FAQ Beranda Pelanggan'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setiap perubahan langsung tersinkronisasi ke komponen FAQ di halaman beranda agar pelanggan mendapat jawaban instan sebelum menghubungi CS.
              </p>
            </div>

            {faqError && (
              <div
                role="alert"
                className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl"
              >
                {faqError}
              </div>
            )}

            {faqNotice && (
              <div
                role="status"
                className="p-3 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl"
              >
                {faqNotice}
              </div>
            )}

            <form
              data-testid="admin-faq-form"
              onSubmit={handleSubmitFaq}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-faq-category"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Kategori Pertanyaan
                </label>
                <select
                  id="admin-faq-category"
                  data-testid="admin-faq-category-select"
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value as FaqCategory)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FCFD] dark:bg-[#051621] border border-slate-300 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {FAQ_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-faq-question"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Pertanyaan Umum Pelanggan
                </label>
                <input
                  id="admin-faq-question"
                  data-testid="admin-faq-question-input"
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="Contoh: Apakah bisa bayar pakai QRIS dari semua bank?"
                  className="w-full px-3 py-2.5 text-xs bg-[#F8FCFD] dark:bg-[#051621] border border-slate-300 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-faq-answer"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Jawaban Resmi Toko
                </label>
                <textarea
                  id="admin-faq-answer"
                  data-testid="admin-faq-answer-input"
                  rows={4}
                  required
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Tulis penjelasan lengkap, jelas, dan langkah yang perlu dilakukan pelanggan..."
                  className="w-full px-3 py-2.5 text-xs bg-[#F8FCFD] dark:bg-[#051621] border border-slate-300 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 leading-relaxed"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={faqActive}
                  onChange={(e) => setFaqActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Tayangkan langsung di halaman beranda pelanggan</span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  data-testid="admin-faq-submit-btn"
                  disabled={faqSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {faqSubmitting
                    ? 'Menyimpan...'
                    : editingFaqId
                      ? 'Simpan Perubahan FAQ'
                      : 'Tambahkan ke Beranda'}
                </button>
                {editingFaqId && (
                  <button
                    type="button"
                    onClick={resetFaqForm}
                    className="px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-teal-900 hover:bg-slate-50 dark:hover:bg-teal-950/40 rounded-xl whitespace-nowrap"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: Managed FAQ Directory */}
          <div className="lg:col-span-7 bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 rounded-2xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-teal-950 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Daftar Pertanyaan Umum Aktif &amp; Draf
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeFaqCount} tayang di beranda · {faqs.length - activeFaqCount} disembunyikan
                </p>
              </div>
            </div>

            {sortedFaqs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada FAQ tersimpan. Tambahkan pertanyaan pertama melalui formulir di samping.
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-teal-950">
                {sortedFaqs.map((item, idx) => {
                  const isBusy = busyFaqId === item.id;
                  const isEditing = editingFaqId === item.id;
                  return (
                    <div
                      key={item.id}
                      data-testid={`admin-faq-row-${item.id}`}
                      className={`p-5 sm:px-6 space-y-2.5 transition-colors ${
                        isEditing ? 'bg-sky-50/50 dark:bg-teal-950/35' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums text-cyan-800 dark:text-teal-300 font-semibold">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                item.active
                                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                  : 'text-amber-700 dark:text-amber-400 font-semibold'
                              }
                            >
                              {item.active ? 'Tayang di Beranda' : 'Disembunyikan'}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                            {item.question}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStartEditFaq(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-teal-900 hover:border-teal-500 rounded-lg whitespace-nowrap"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            data-testid={`admin-faq-toggle-${item.id}`}
                            disabled={isBusy}
                            onClick={() => handleToggleFaqVisibility(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg whitespace-nowrap"
                          >
                            {item.active ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                Sembunyikan
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                Tayangkan
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            data-testid={`admin-faq-delete-${item.id}`}
                            disabled={isBusy}
                            onClick={() => handleDeleteFaqItem(item)}
                            aria-label={`Hapus FAQ ${item.question}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/70 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
      {/* Section 1: Monthly Financial Report Chart + Table */}
      <section className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Grafik Laporan Keuangan Bulanan (Omzet Kotor vs Penarikan Penjual)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Periode Juli – November 2026 dalam mata uang Rupiah (IDR).
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.monthlyFinancials}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(0)}jt`}
                />
                <Tooltip
                  formatter={(value: unknown) => formatIdr(Number(value))}
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="grossRevenueIdr"
                  name="Omzet Kotor"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  animationDuration={200}
                />
                <Bar
                  dataKey="sellerPayoutsIdr"
                  name="Penarikan Penjual"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  animationDuration={200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Rekapitulasi Keuangan Bulanan
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Periode</th>
                  <th className="px-6 py-3 font-medium text-right">Pesanan</th>
                  <th className="px-6 py-3 font-medium text-right">Omzet Kotor</th>
                  <th className="px-6 py-3 font-medium text-right">Biaya Gateway</th>
                  <th className="px-6 py-3 font-medium text-right">Penarikan Penjual</th>
                  <th className="px-6 py-3 font-medium text-right">Pendapatan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.monthlyFinancials.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                      {row.month}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {row.orderCount}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {formatIdr(row.grossRevenueIdr)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatIdr(row.gatewayFeesIdr)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatIdr(row.sellerPayoutsIdr)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums font-semibold text-cyan-700 dark:text-teal-300">
                      {formatIdr(row.platformNetIdr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Automated AES-256-GCM Encrypted Cloud Backup */}
      <section className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pencadangan Data Otomatis ke Penyimpanan Awan Terenkripsi
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seluruh database produk, transaksi, penarikan, dan promo dienkripsi server-side menggunakan AES-256-GCM + checksum SHA-256.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="backup-schedule" className="sr-only">
              Jadwal Pencadangan Otomatis
            </label>
            <select
              id="backup-schedule"
              value={backupSchedule}
              onChange={(e) => onChangeBackupSchedule(e.target.value as 'daily' | 'weekly')}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="daily">Otomatis Harian (02:00 WIB)</option>
              <option value="weekly">Otomatis Mingguan (Minggu 02:00 WIB)</option>
            </select>
            <button
              type="button"
              disabled={backingUp}
              onClick={handleRunBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${backingUp ? 'animate-spin' : ''}`} />
              {backingUp ? 'Mengenkripsi...' : 'Cadangkan Sekarang'}
            </button>
          </div>
        </div>

        {backupNotice && (
          <div
            role="status"
            className="p-3.5 text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg"
          >
            {backupNotice}
          </div>
        )}

        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-4">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="pb-2.5 pr-4 font-medium">Kode Snapshot</th>
                <th className="pb-2.5 pr-4 font-medium">Enkripsi &amp; Checksum</th>
                <th className="pb-2.5 pr-4 font-medium text-right">Entitas / Ukuran</th>
                <th className="pb-2.5 pr-4 font-medium">Status</th>
                <th className="pb-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {backups.map((bkp) => (
                <tr key={bkp.id} data-testid={`backup-row-${bkp.backupCode}`}>
                  <td className="py-3 pr-4">
                    <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {bkp.backupCode}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(bkp.createdAt).toLocaleString('id-ID')} · Mode {bkp.scheduleMode}
                    </p>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-cyan-700 dark:text-teal-400" />
                      {bkp.algorithm}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      SHA-256: {bkp.checksumSha256.slice(0, 18)}…
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {bkp.recordCount} rekaman · {(bkp.sizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-3 pr-4 font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {bkp.status === 'verified' ? 'Terverifikasi Dekripsi' : 'Tersinkronisasi'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        disabled={verifyingId === bkp.id}
                        onClick={() => handleVerifySnapshot(bkp.id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                      >
                        {verifyingId === bkp.id ? 'Cek...' : 'Verifikasi'}
                      </button>
                      <a
                        href={`/api/backups/${bkp.id}/download`}
                        download={`${bkp.backupCode}.enc.json`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-md"
                      >
                        <Download className="w-3 h-3" />
                        Unduh .enc
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Real-Time User Activity Monitoring Log */}
      <section className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Pemantauan Aktivitas Pengguna
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jejak audit transaksi, autentikasi MFA/biometrik, inventaris, dan pencadangan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'Semua'],
                ['order', 'Transaksi'],
                ['payout', 'Penarikan'],
                ['inventory', 'Inventaris'],
                ['auth', 'Keamanan'],
                ['backup', 'Cadangan'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLogFilter(key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  logFilter === key
                    ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white border-transparent'
                    : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.map((log) => (
            <div key={log.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {log.action}{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    · {log.actorName} ({log.actorEmail})
                  </span>
                </p>
                <p className="text-slate-600 dark:text-slate-400">{log.summary}</p>
              </div>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {new Date(log.createdAt).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  );
};
