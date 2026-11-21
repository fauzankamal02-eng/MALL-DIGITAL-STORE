import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  Droplets,
  Gamepad2,
  Gift,
  HeartPulse,
  KeyRound,
  Loader2,
  LogIn,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Wallet,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import type { AutomationSettings, MemberProfile, OrderRecord, PaymentMethodCode } from '../types';
import { formatIdr, PAYMENT_GATEWAY_OPTIONS } from '../utils/commerce';
import {
  calculateTopUpPricing,
  TOPUP_SERVICES,
  type TopUpServiceId,
  validateTopUpTarget,
} from '../utils/topupCatalog';
import { AppBrandLogo } from './AppBrandLogo';

interface TopUpPaymentModalProps {
  initialServiceId: TopUpServiceId;
  initialProvider?: string;
  initialTargetNumber?: string;
  member: MemberProfile | null;
  orders: OrderRecord[];
  automation: AutomationSettings;
  defaultBuyerName: string;
  defaultBuyerEmail: string;
  onClose: () => void;
  onOpenMemberAuth: (mode?: 'login' | 'register', contextMessage?: string) => void;
  onSaveMemberTarget?: (input: {
    serviceId: TopUpServiceId;
    provider: string;
    targetNumber: string;
    label: string;
  }) => Promise<void>;
  onCreateTopUpOrder: (input: {
    serviceId: TopUpServiceId;
    provider: string;
    nominalId: string;
    targetNumber: string;
    buyerName: string;
    buyerEmail: string;
    paymentMethod: PaymentMethodCode;
    pricingTier: 'reguler' | 'reseller';
  }) => Promise<OrderRecord>;
  onVerifyPayment: (orderId: string) => Promise<{ order: OrderRecord; downloadUrl: string }>;
  onOpenOrderHistory: () => void;
}

const SERVICE_ICONS: Record<TopUpServiceId, React.ComponentType<{ className?: string }>> = {
  pulsa: Smartphone,
  pln: Zap,
  ewallet: Wallet,
  game: Gamepad2,
  pdam: Droplets,
  internet: Wifi,
  bpjs: HeartPulse,
  voucher: Gift,
};

const TOPUP_GATEWAYS = PAYMENT_GATEWAY_OPTIONS.filter(
  (g) => g.code !== 'CICILAN_3X' && g.code !== 'CICILAN_6X'
);

export const TopUpPaymentModal: React.FC<TopUpPaymentModalProps> = ({
  initialServiceId,
  initialProvider,
  initialTargetNumber,
  member,
  orders,
  automation,
  defaultBuyerName,
  defaultBuyerEmail,
  onClose,
  onOpenMemberAuth,
  onSaveMemberTarget,
  onCreateTopUpOrder,
  onVerifyPayment,
  onOpenOrderHistory,
}) => {
  const [serviceId, setServiceId] = useState<TopUpServiceId>(initialServiceId);
  const currentService = useMemo(
    () => TOPUP_SERVICES.find((s) => s.id === serviceId) ?? TOPUP_SERVICES[0],
    [serviceId]
  );

  const [provider, setProvider] = useState<string>(
    initialProvider && currentService.providers.includes(initialProvider)
      ? initialProvider
      : currentService.providers[0]
  );
  const [nominalId, setNominalId] = useState<string>(
    currentService.nominals.find((n) => n.popular)?.id ?? currentService.nominals[0].id
  );
  const [targetNumber, setTargetNumber] = useState(initialTargetNumber ?? '');
  const [saveTargetForMember, setSaveTargetForMember] = useState(true);
  const [pricingTier, setPricingTier] = useState<'reguler' | 'reseller'>(
    member?.tier === 'reseller' ? 'reseller' : 'reguler'
  );
  const [buyerName, setBuyerName] = useState(member?.displayName || defaultBuyerName);
  const [buyerEmail, setBuyerEmail] = useState(member?.email || defaultBuyerEmail);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('QRIS');

  const [step, setStep] = useState<'form' | 'payment' | 'verified'>('form');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copiedSn, setCopiedSn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setBuyerName(member.displayName);
      setBuyerEmail(member.email);
      if (member.tier === 'reseller') {
        setPricingTier('reseller');
      }
    }
  }, [member]);

  const matchingSavedTargets = useMemo(() => {
    if (!member) return [];
    return member.savedTargets.filter((t) => t.serviceId === serviceId);
  }, [member, serviceId]);

  useEffect(() => {
    if (step !== 'payment' || !activeOrder) return;
    const synced = orders.find((o) => o.id === activeOrder.id);
    if (synced && synced.paymentStatus === 'verified' && synced.downloadToken) {
      setActiveOrder(synced);
      setDownloadUrl(`/api/downloads/${synced.downloadToken}`);
      setStep('verified');
    }
  }, [orders, step, activeOrder]);

  const handleCopySn = (val: string) => {
    setCopiedSn(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(val).catch(() => {});
    }
    window.setTimeout(() => setCopiedSn(false), 1800);
  };

  const handleSwitchService = (nextId: TopUpServiceId) => {
    const nextSvc = TOPUP_SERVICES.find((s) => s.id === nextId);
    if (!nextSvc) return;
    setServiceId(nextId);
    setProvider(nextSvc.providers[0]);
    setNominalId(nextSvc.nominals.find((n) => n.popular)?.id ?? nextSvc.nominals[0].id);
    setTargetNumber('');
    setError(null);
    setStep('form');
    setActiveOrder(null);
  };

  const selectedNominal =
    currentService.nominals.find((n) => n.id === nominalId) ?? currentService.nominals[0];

  const pricing = useMemo(
    () => calculateTopUpPricing(selectedNominal, pricingTier, paymentMethod),
    [selectedNominal, pricingTier, paymentMethod]
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const check = validateTopUpTarget(serviceId, targetNumber);
    if (!check.valid) {
      setError(check.error || 'Nomor tujuan belum valid.');
      return;
    }

    if (buyerName.trim().length < 2 || !buyerEmail.includes('@')) {
      setError('Mohon isi nama pembeli dan alamat email valid untuk pengiriman struk otomatis.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await onCreateTopUpOrder({
        serviceId,
        provider,
        nominalId: selectedNominal.id,
        targetNumber: check.cleaned,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        paymentMethod,
        pricingTier,
      });
      if (member && saveTargetForMember && onSaveMemberTarget) {
        void onSaveMemberTarget({
          serviceId,
          provider,
          targetNumber: check.cleaned,
          label: `${provider} · ${check.cleaned}`,
        }).catch(() => {});
      }
      setActiveOrder(created);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pesanan top up.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmVerify = async () => {
    if (!activeOrder) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await onVerifyPayment(activeOrder.id);
      setActiveOrder(res.order);
      setDownloadUrl(res.downloadUrl);
      setStep('verified');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi pembayaran gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const ActiveIcon = SERVICE_ICONS[serviceId];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="topup-modal-title"
      data-testid="topup-payment-modal"
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-900 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl my-auto">
        {/* Ocean-to-Emerald Header */}
        <div className="bg-gradient-to-r from-[#062442] via-[#0369A1] to-[#059669] px-5 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5 text-emerald-200" />
            </span>
            <div className="min-w-0">
              <h2 id="topup-modal-title" className="text-sm sm:text-base font-extrabold truncate">
                Pembayaran &amp; Top Up — {currentService.label}
              </h2>
              <p className="text-[11px] text-cyan-100/90 truncate">
                Proses otomatis 24 jam · Bukti struk &amp; SN terkirim instan ke email
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela pembayaran dan top up"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Service Switcher Strip */}
        <div className="px-4 py-2.5 bg-[#F3FAFC] dark:bg-[#051621] border-b border-slate-200 dark:border-teal-950 flex items-center gap-1.5 overflow-x-auto">
          {TOPUP_SERVICES.map((svc) => {
            const Icon = SERVICE_ICONS[svc.id];
            const active = svc.id === serviceId;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => handleSwitchService(svc.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white border-transparent shadow-2xs'
                    : 'bg-white dark:bg-[#081E2C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-950 hover:border-teal-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {svc.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {step === 'form' && (
            <form onSubmit={handleSubmitOrder} className="space-y-5" data-testid="topup-order-form">
              {/* Member Status & Quick-Fill Strip */}
              {member ? (
                <div
                  data-testid="topup-member-status-bar"
                  className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50/90 to-emerald-50/90 dark:from-sky-950/45 dark:to-emerald-950/45 border border-teal-200/90 dark:border-teal-800/80 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-cyan-900 dark:text-teal-200">
                      <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Member Aktif: {member.displayName}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-cyan-800 dark:text-teal-300 tabular-nums">
                      {member.memberCode} · {member.loyaltyPoints.toLocaleString('id-ID')} Poin
                    </span>
                  </div>
                  {matchingSavedTargets.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-teal-200/60 dark:border-teal-900/70">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        <Bookmark className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        Nomor Tersimpan:
                      </span>
                      {matchingSavedTargets.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (currentService.providers.includes(item.provider)) {
                              setProvider(item.provider);
                            }
                            setTargetNumber(item.targetNumber);
                          }}
                          className="px-2 py-0.5 text-[11px] font-mono font-semibold text-cyan-900 dark:text-teal-200 bg-white dark:bg-[#081E2C] border border-teal-200 dark:border-teal-800 hover:border-teal-500 rounded-lg transition-colors"
                        >
                          {item.targetNumber} ({item.provider})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  data-testid="topup-guest-member-banner"
                  className="p-3.5 rounded-xl bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-slate-100">Login Member:</strong>{' '}
                    Masuk atau daftar gratis agar nomor tagihan tersimpan otomatis &amp; nikmati bonus +100 Poin.
                  </p>
                  <button
                    type="button"
                    data-testid="topup-member-login-btn"
                    onClick={() =>
                      onOpenMemberAuth(
                        'register',
                        `Daftar atau masuk Member untuk transaksi cepat ${currentService.label} dan simpan nomor tujuan favorit Anda.`
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg whitespace-nowrap shrink-0 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Masuk / Daftar Member
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentService.description}
              </p>

              {/* 1. Provider Selection */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  1. Pilih Penyedia / Operator
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentService.providers.map((item) => {
                    const selected = provider === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setProvider(item)}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                          selected
                            ? 'bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/60 dark:to-emerald-950/60 text-cyan-800 dark:text-teal-200 border-teal-500'
                            : 'bg-white dark:bg-[#051621] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-teal-950 hover:border-teal-400'
                        }`}
                      >
                        <AppBrandLogo brand={item} size="xs" />
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="topup-target-input"
                  className="block text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  2. {currentService.targetLabel}
                </label>
                <input
                  id="topup-target-input"
                  data-testid="topup-target-input"
                  type="text"
                  value={targetNumber}
                  onChange={(e) => {
                    setTargetNumber(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={currentService.targetPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentService.targetHelper}
                </p>
                {member && (
                  <label className="pt-1 flex items-center gap-2 text-[11px] font-medium text-cyan-900 dark:text-teal-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      data-testid="topup-save-target-checkbox"
                      checked={saveTargetForMember}
                      onChange={(e) => setSaveTargetForMember(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Simpan nomor tujuan ini ke akun Member untuk transaksi berikutnya</span>
                  </label>
                )}
              </div>

              {/* 3. Nominal Grid + Reguler/Reseller toggle */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Pilih Nominal / Paket
                  </span>
                  <div className="inline-flex items-center p-0.5 bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-950 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPricingTier('reguler')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                        pricingTier === 'reguler'
                          ? 'bg-[#0369A1] text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Reguler
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingTier('reseller')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                        pricingTier === 'reseller'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Crown className="w-3 h-3" />
                      Reseller
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {currentService.nominals.map((opt) => {
                    const active = opt.id === selectedNominal.id;
                    const displayPrice =
                      pricingTier === 'reseller' ? opt.resellerPriceIdr : opt.priceIdr;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`topup-nominal-${opt.id}`}
                        onClick={() => setNominalId(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-sky-950/60 dark:to-emerald-950/60 border-teal-500 ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-[#051621] border-slate-200 dark:border-teal-950 hover:border-teal-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {opt.label}
                          </span>
                          {opt.popular && (
                            <span className="text-[9px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 shrink-0">
                              Populer
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {opt.sublabel}
                        </p>
                        <p className="mt-1.5 text-xs sm:text-sm font-extrabold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                          {formatIdr(displayPrice)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Local Gateway Payment Method */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  4. Metode Pembayaran Lokal
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOPUP_GATEWAYS.map((gw) => {
                    const selected = paymentMethod === gw.code;
                    return (
                      <button
                        key={gw.code}
                        type="button"
                        onClick={() => setPaymentMethod(gw.code)}
                        className={`p-2.5 rounded-xl border text-left transition-colors flex items-center gap-2.5 ${
                          selected
                            ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-500 text-cyan-900 dark:text-teal-200'
                            : 'bg-white dark:bg-[#051621] border-slate-200 dark:border-teal-950 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                        }`}
                      >
                        <AppBrandLogo brand={gw.label} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{gw.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            Admin: {gw.feeIdr === 0 ? 'Gratis' : formatIdr(gw.feeIdr)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Buyer Contact for Automated Receipt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="topup-buyer-name" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Nama Pembeli
                  </label>
                  <input
                    id="topup-buyer-name"
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="topup-buyer-email" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Email Bukti Struk &amp; SN
                  </label>
                  <input
                    id="topup-buyer-email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  data-testid="topup-error-alert"
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {error}
                </div>
              )}

              {/* Summary & Submit */}
              <div className="p-4 rounded-2xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-200/80 dark:border-teal-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {provider} · {selectedNominal.label} (Admin {formatIdr(pricing.gatewayFeeIdr)})
                  </p>
                  <p className="text-lg font-extrabold font-mono tabular-nums text-cyan-900 dark:text-teal-200">
                    Total: {formatIdr(pricing.finalAmountIdr)}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="topup-submit-btn"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lanjut ke Pembayaran
                </button>
              </div>
            </form>
          )}

          {step === 'payment' && activeOrder && (
            <div className="space-y-4" data-testid="topup-payment-step">
              <div className="p-4 rounded-2xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-200 dark:border-teal-900 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Kode Transaksi</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {activeOrder.orderCode}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Layanan &amp; Tujuan</span>
                  <span className="font-semibold text-right text-slate-900 dark:text-slate-100">
                    {activeOrder.productTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Metode Gateway</span>
                  <span className="font-semibold text-cyan-800 dark:text-teal-300">
                    {activeOrder.paymentMethodLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Kode Referensi / VA</span>
                  <span className="font-mono font-bold text-cyan-700 dark:text-emerald-300">
                    {activeOrder.paymentReference}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-teal-200/70 dark:border-teal-900 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Total Tagihan
                  </span>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                    {formatIdr(activeOrder.finalAmountIdr)}
                  </span>
                </div>
              </div>

              {automation.autoFulfillEnabled ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/50 dark:to-emerald-950/50 border border-teal-200 dark:border-teal-800 flex items-start gap-2.5 text-xs text-cyan-950 dark:text-teal-100">
                  <Loader2 className="w-4 h-4 text-teal-600 dark:text-emerald-400 animate-spin shrink-0 mt-0.5" />
                  <p>
                    <strong>Mode Otomatisasi Penuh Aktif:</strong>{' '}
                    {automation.autoSandboxVerify
                      ? `Sistem sedang memverifikasi pembayaran & memproses top up secara otomatis (±${automation.sandboxDelaySeconds} detik) tanpa klik manual.`
                      : 'Menunggu callback otomatis dari gateway pembayaran — SN/Token akan langsung tampil begitu lunas.'}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    Setelah Anda menyelesaikan transfer melalui <strong>{activeOrder.paymentMethodLabel}</strong>,
                    klik tombol verifikasi di bawah untuk memproses top up/tagihan secara instan dan
                    mencetak struk resmi beserta kode SN/Token.
                  </p>
                </div>
              )}

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-teal-900 rounded-xl hover:border-teal-400"
                >
                  Ubah Data
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  data-testid="topup-verify-btn"
                  onClick={() => void handleConfirmVerify()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verifikasi &amp; Proses Instan
                </button>
              </div>
            </div>
          )}

          {step === 'verified' && activeOrder && (
            <div className="space-y-4 text-center py-2" data-testid="topup-verified-step">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#059669] text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Pembayaran &amp; Top Up Berhasil Otomatis!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Transaksi <strong>{activeOrder.orderCode}</strong> ({activeOrder.productTitle})
                  telah lunas dan diproses otomatis. Salinan struk &amp; SN telah dikirim ke{' '}
                  <strong>{activeOrder.buyerEmail}</strong>.
                </p>
              </div>

              {activeOrder.deliveredPayload && (
                <div className="p-4 rounded-2xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-300 dark:border-teal-800 text-left space-y-2 max-w-lg mx-auto">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-900 dark:text-teal-200">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {activeOrder.deliveredPayload.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySn(activeOrder.deliveredPayload!.value)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 dark:text-teal-200 bg-white dark:bg-[#081E2C] border border-teal-200 dark:border-teal-800 rounded-lg"
                    >
                      {copiedSn ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedSn ? 'Disalin!' : 'Salin SN'}
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 font-mono text-sm font-extrabold text-slate-900 dark:text-emerald-300 tracking-wider text-center select-all">
                    {activeOrder.deliveredPayload.value}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {activeOrder.deliveredPayload.instructions}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-200 dark:border-teal-900 text-left space-y-2 max-w-lg mx-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Nominal Terbayar</span>
                  <span className="font-mono font-bold text-cyan-800 dark:text-teal-300 tabular-nums">
                    {formatIdr(activeOrder.finalAmountIdr)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Status Pengiriman</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    Lunas · Terproses Otomatis
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Struk &amp; SN
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrderHistory();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-cyan-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-xl hover:border-teal-500"
                >
                  <ReceiptText className="w-4 h-4" />
                  Lihat di Riwayat Pesanan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
