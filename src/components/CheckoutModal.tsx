import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Copy, CreditCard, Crown, Download, KeyRound, Loader2, Mail, ShieldCheck, Tag, X } from 'lucide-react';
import type {
  AutomationSettings,
  DigitalProduct,
  OrderRecord,
  PaymentMethodCode,
  PromoVoucher,
} from '../types';
import {
  calculateOrderPricing,
  formatIdr,
  PAYMENT_GATEWAY_OPTIONS,
} from '../utils/commerce';
import { AppBrandLogo } from './AppBrandLogo';

interface CheckoutModalProps {
  product: DigitalProduct;
  defaultTier?: 'reguler' | 'reseller';
  promos: PromoVoucher[];
  orders: OrderRecord[];
  automation: AutomationSettings;
  loyaltyPoints: number;
  defaultBuyerName: string;
  defaultBuyerEmail: string;
  onClose: () => void;
  onCreateOrder: (input: {
    productId: string;
    buyerName: string;
    buyerEmail: string;
    paymentMethod: PaymentMethodCode;
    promoCode: string;
    loyaltyPointsToUse: number;
    pricingTier: 'reguler' | 'reseller';
  }) => Promise<OrderRecord>;
  onVerifyPayment: (orderId: string) => Promise<{
    order: OrderRecord;
    downloadUrl: string;
  }>;
  onOpenOrderHistory: () => void;
}

const GATEWAY_GROUPS: Array<
  'QRIS & Instan' | 'Virtual Account Bank' | 'Dompet Digital' | 'Pembayaran Fleksibel'
> = [
  'QRIS & Instan',
  'Virtual Account Bank',
  'Dompet Digital',
  'Pembayaran Fleksibel',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  product,
  defaultTier = 'reguler',
  promos,
  orders,
  automation,
  loyaltyPoints,
  defaultBuyerName,
  defaultBuyerEmail,
  onClose,
  onCreateOrder,
  onVerifyPayment,
  onOpenOrderHistory,
}) => {
  const [pricingTier, setPricingTier] = useState<'reguler' | 'reseller'>(defaultTier);
  const [buyerName, setBuyerName] = useState(defaultBuyerName || 'Budi Santoso');
  const [buyerEmail, setBuyerEmail] = useState(defaultBuyerEmail || 'budi.santoso@malldigitalstore.id');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('QRIS');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);

  const [step, setStep] = useState<'form' | 'payment' | 'verified'>('form');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoDownloadedRef = useRef<string | null>(null);

  const matchedPromo = useMemo(() => {
    if (!appliedPromoCode) return null;
    return promos.find((p) => p.code.toUpperCase() === appliedPromoCode.toUpperCase()) ?? null;
  }, [promos, appliedPromoCode]);

  const unitPriceIdr = pricingTier === 'reseller' ? product.resellerPriceIdr : product.priceIdr;

  const pricing = useMemo(
    () =>
      calculateOrderPricing(
        unitPriceIdr,
        matchedPromo,
        useLoyaltyPoints ? loyaltyPoints : 0,
        paymentMethod
      ),
    [unitPriceIdr, matchedPromo, useLoyaltyPoints, loyaltyPoints, paymentMethod]
  );

  const handleApplyPromo = () => {
    setErrorMessage(null);
    const cleaned = promoCodeInput.trim().toUpperCase();
    if (!cleaned) {
      setAppliedPromoCode('');
      return;
    }
    const found = promos.find((p) => p.code.toUpperCase() === cleaned);
    if (!found) {
      setErrorMessage(`Kode voucher "${cleaned}" tidak ditemukan.`);
      setAppliedPromoCode('');
      return;
    }
    setAppliedPromoCode(found.code);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (buyerName.trim().length < 2) {
      setErrorMessage('Mohon isi nama lengkap pembeli minimal 2 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      setErrorMessage('Mohon masukkan alamat email yang valid untuk pengiriman file & faktur.');
      return;
    }
    if (pricing.promoError) {
      setErrorMessage(pricing.promoError);
      return;
    }

    setSubmitting(true);
    try {
      const created = await onCreateOrder({
        productId: product.id,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        paymentMethod,
        promoCode: matchedPromo ? matchedPromo.code : '',
        loyaltyPointsToUse: useLoyaltyPoints ? pricing.loyaltyPointsUsed : 0,
        pricingTier,
      });
      setActiveOrder(created);
      setStep('payment');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membuat pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerAutomaticDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Listen to real-time WebSocket auto-fulfillment (Webhook / Auto-Sandbox)
  useEffect(() => {
    if (step !== 'payment' || !activeOrder) return;
    const synced = orders.find((o) => o.id === activeOrder.id);
    if (synced && synced.paymentStatus === 'verified' && synced.downloadToken) {
      const nextUrl = `/api/downloads/${synced.downloadToken}`;
      setActiveOrder(synced);
      setDownloadUrl(nextUrl);
      setStep('verified');
      if (automation.autoDownloadOnPaid && autoDownloadedRef.current !== synced.id) {
        autoDownloadedRef.current = synced.id;
        triggerAutomaticDownload(nextUrl, synced.fileName);
      }
    }
  }, [orders, step, activeOrder, automation.autoDownloadOnPaid]);

  const handleCopyDelivered = (val: string) => {
    setCopiedPayload(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(val).catch(() => {});
    }
    window.setTimeout(() => setCopiedPayload(false), 1800);
  };

  const handleVerifyPaymentNow = async () => {
    if (!activeOrder) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const result = await onVerifyPayment(activeOrder.id);
      setActiveOrder(result.order);
      setDownloadUrl(result.downloadUrl);
      setStep('verified');
      if (automation.autoDownloadOnPaid && autoDownloadedRef.current !== result.order.id) {
        autoDownloadedRef.current = result.order.id;
        triggerAutomaticDownload(result.downloadUrl, result.order.fileName);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Verifikasi pembayaran gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04121C]/65 p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <AppBrandLogo brand={product.brand} title={product.title} size="sm" />
            <div className="min-w-0">
              <h2
                id="checkout-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                {step === 'form' && 'Checkout Produk Digital'}
                {step === 'payment' && 'Instruksi Pembayaran Gateway Lokal'}
                {step === 'verified' && 'Pembayaran Terverifikasi & Unduhan Dimulai'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {product.title} · {product.fileFormat} ({product.fileSizeMb} MB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela checkout"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 text-sm text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg"
            >
              {errorMessage}
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* Pricing Tier Toggle: Reguler vs Reseller */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPricingTier('reguler')}
                  aria-pressed={pricingTier === 'reguler'}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    pricingTier === 'reguler'
                      ? 'border-cyan-600 bg-sky-50/80 dark:bg-sky-950/40'
                      : 'border-slate-200 dark:border-teal-950 bg-white dark:bg-[#04121C] hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Harga Reguler
                  </p>
                  <p className="mt-1 text-base font-extrabold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                    {formatIdr(product.priceIdr)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pembelian satuan / pribadi
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPricingTier('reseller')}
                  aria-pressed={pricingTier === 'reseller'}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    pricingTier === 'reseller'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/35'
                      : 'border-slate-200 dark:border-teal-950 bg-white dark:bg-[#04121C] hover:border-slate-300'
                  }`}
                >
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Crown className="w-3.5 h-3.5" />
                    Tarif Reseller
                  </p>
                  <p className="mt-1 text-base font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatIdr(product.resellerPriceIdr)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hemat {formatIdr(Math.max(0, product.priceIdr - product.resellerPriceIdr))}
                  </p>
                </button>
              </div>

              {/* Buyer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="checkout-buyer-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Nama Lengkap Pembeli
                  </label>
                  <input
                    id="checkout-buyer-name"
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Nadia Kusuma"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#070D19] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-buyer-email"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email Penerima File &amp; Faktur Otomatis
                  </label>
                  <input
                    id="checkout-buyer-email"
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="nama@domain.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#070D19] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Promo Voucher & Loyalty Points */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <label htmlFor="checkout-promo-code" className="sr-only">
                      Kode Promo
                    </label>
                    <input
                      id="checkout-promo-code"
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Kode voucher (mis. HEMAT15, RESELLER10)"
                      className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl whitespace-nowrap shrink-0"
                  >
                    Terapkan Voucher
                  </button>
                </div>

                {promos.filter((p) => p.active).length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>Voucher tersedia:</span>
                    {promos
                      .filter((p) => p.active)
                      .slice(0, 3)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPromoCodeInput(p.code);
                            setAppliedPromoCode(p.code);
                            setErrorMessage(null);
                          }}
                          className="font-mono font-semibold text-cyan-700 dark:text-teal-300 hover:underline"
                        >
                          {p.code}
                        </button>
                      ))}
                  </div>
                )}

                {loyaltyPoints > 0 && (
                  <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
                    <span className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={useLoyaltyPoints}
                        onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      Tukar Poin Loyalitas ({loyaltyPoints.toLocaleString('id-ID')} poin tersedia · maks. 25%)
                    </span>
                    <span className="text-xs font-mono tabular-nums text-cyan-700 dark:text-teal-300">
                      {useLoyaltyPoints ? `-${formatIdr(pricing.loyaltyDiscountIdr)}` : 'Opsional'}
                    </span>
                  </label>
                )}
              </div>

              {/* Indonesian Payment Gateway Selector */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Pilih Metode Pembayaran Lokal &amp; Fleksibel (IDR)
                  </h3>
                </div>

                <div className="space-y-4">
                  {GATEWAY_GROUPS.map((group) => {
                    const options = PAYMENT_GATEWAY_OPTIONS.filter((o) => o.group === group);
                    return (
                      <div key={group} className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {group}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {options.map((opt) => {
                            const selected = paymentMethod === opt.code;
                            return (
                              <button
                                key={opt.code}
                                type="button"
                                onClick={() => setPaymentMethod(opt.code)}
                                aria-pressed={selected}
                                className={`text-left p-3 rounded-xl border transition-colors ${
                                  selected
                                    ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40'
                                    : 'border-slate-200 dark:border-teal-950 hover:border-slate-300 dark:hover:border-teal-700 bg-white dark:bg-[#04121C]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 min-w-0">
                                    <AppBrandLogo brand={opt.label} size="xs" />
                                    <span className="truncate">{opt.label}</span>
                                  </span>
                                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                                    {opt.feeIdr === 0 ? 'Bebas Biaya' : `+${formatIdr(opt.feeIdr)}`}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  {opt.settlementNote}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Breakdown */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>
                    Harga Produk ({pricingTier === 'reseller' ? 'Tarif Reseller' : 'Reguler'})
                  </span>
                  <span className="font-mono tabular-nums">{formatIdr(pricing.subtotalIdr)}</span>
                </div>
                {pricing.promoDiscountIdr > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Diskon Voucher ({matchedPromo?.code})</span>
                    <span className="font-mono tabular-nums">
                      -{formatIdr(pricing.promoDiscountIdr)}
                    </span>
                  </div>
                )}
                {pricing.loyaltyDiscountIdr > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Potongan Poin Loyalitas ({pricing.loyaltyPointsUsed} poin)</span>
                    <span className="font-mono tabular-nums">
                      -{formatIdr(pricing.loyaltyDiscountIdr)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Biaya Gateway Lokal</span>
                  <span className="font-mono tabular-nums">{formatIdr(pricing.gatewayFeeIdr)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Total Pembayaran</p>
                    {pricing.installmentMonths > 1 && (
                      <p className="text-xs text-cyan-700 dark:text-teal-300 font-mono tabular-nums">
                        Cicilan {pricing.installmentMonths}x · {formatIdr(pricing.monthlyInstallmentIdr)}/bulan
                      </p>
                    )}
                  </div>
                  <span className="text-xl font-extrabold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                    {formatIdr(pricing.finalAmountIdr)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Memproses Pesanan...' : 'Lanjut ke Pembayaran'}
                </button>
              </div>
            </form>
          )}

          {step === 'payment' && activeOrder && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Kode Pesanan</p>
                    <p className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {activeOrder.orderCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Nominal Tagihan</p>
                    <p className="text-xl font-extrabold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                      {formatIdr(activeOrder.finalAmountIdr)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Metode Dipilih</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {activeOrder.paymentMethodLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nomor Referensi / Virtual Account
                    </p>
                    <p className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {activeOrder.paymentReference}
                    </p>
                  </div>
                </div>

                {activeOrder.paymentMethod === 'QRIS' && (
                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
                    <div
                      aria-label="Kode QRIS Nasional untuk pembayaran"
                      className="w-28 h-28 bg-white p-2 rounded-lg border border-slate-300 shrink-0 grid grid-cols-7 gap-0.5"
                    >
                      {Array.from({ length: 49 }).map((_, idx) => {
                        const row = Math.floor(idx / 7);
                        const col = idx % 7;
                        const corner =
                          (row < 2 && col < 2) ||
                          (row < 2 && col > 4) ||
                          (row > 4 && col < 2);
                        const filled = corner || (idx * 7 + activeOrder.orderCode.length) % 3 !== 0;
                        return (
                          <span
                            key={idx}
                            className={filled ? 'bg-slate-900 block rounded-[1px]' : 'bg-white block'}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Pindai kode QRIS melalui aplikasi mobile banking atau e-wallet (BCA Mobile, Livin&apos;,
                      GoPay, OVO, DANA, ShopeePay). Setelah pembayaran selesai, klik tombol verifikasi untuk
                      langsung memicu unduhan otomatis berkas digital Anda.
                    </p>
                  </div>
                )}
              </div>

              {automation.autoFulfillEnabled && (
                <div
                  data-testid="checkout-auto-listener"
                  className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/50 dark:to-emerald-950/50 border border-teal-200 dark:border-teal-800 flex items-center gap-3 text-xs text-cyan-950 dark:text-teal-100"
                >
                  <Loader2 className="w-4 h-4 text-teal-600 dark:text-emerald-400 animate-spin shrink-0" />
                  <div>
                    <p className="font-bold">
                      Mode Layanan Otomatis 24/7 Aktif — Memantau Pembayaran Real-Time
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      {automation.autoSandboxVerify
                        ? `Simulasi callback gateway otomatis akan memverifikasi & mengirimkan produk Anda dalam ±${automation.sandboxDelaySeconds} detik tanpa perlu klik manual.`
                        : 'Begitu pembayaran diterima oleh webhook gateway, akun/lisensi & file unduhan langsung muncul otomatis di layar ini.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Koneksi terenkripsi TLS · Unduh otomatis pasca verifikasi
                </span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleVerifyPaymentNow}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? 'Memverifikasi Gateway...'
                    : 'Verifikasi Sekarang (Instan)'}
                </button>
              </div>
            </div>
          )}

          {step === 'verified' && activeOrder && (
            <div className="space-y-5" data-testid="checkout-verified-step">
              <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Pembayaran {activeOrder.orderCode} Terverifikasi Otomatis
                    </h3>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      Produk digital dan berkas{' '}
                      <span className="font-mono font-medium px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 border border-emerald-200/80 dark:border-emerald-800/80">
                        {activeOrder.fileName}
                      </span>{' '}
                      langsung aktif untuk Anda. Salinan lengkap juga dikirim otomatis ke{' '}
                      <span className="font-medium">{activeOrder.buyerEmail}</span>.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-200/70 dark:border-emerald-900 flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Faktur Email Otomatis Terkirim
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Total: {formatIdr(activeOrder.finalAmountIdr)}
                  </span>
                </div>
              </div>

              {/* Instant Delivered Account / License / Access Box */}
              {activeOrder.deliveredPayload && (
                <div
                  data-testid="checkout-delivered-payload"
                  className="p-4 rounded-xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-300/80 dark:border-teal-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-900 dark:text-teal-200">
                      <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      {activeOrder.deliveredPayload.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyDelivered(activeOrder.deliveredPayload!.value)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 dark:text-teal-200 bg-white dark:bg-[#081E2C] border border-teal-200 dark:border-teal-800 rounded-lg hover:border-teal-500"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Disalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Salin Akses
                        </>
                      )}
                    </button>
                  </div>
                  <p className="p-3 rounded-lg bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-emerald-300 break-all select-all">
                    {activeOrder.deliveredPayload.value}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeOrder.deliveredPayload.instructions}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrderHistory();
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Lihat Riwayat Pesanan &amp; Email
                </button>
                <a
                  href={downloadUrl}
                  download={activeOrder.fileName}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  Unduh File &amp; Sertifikat ({activeOrder.fileSizeMb} MB)
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
