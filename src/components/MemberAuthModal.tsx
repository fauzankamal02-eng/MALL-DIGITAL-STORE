import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Gift,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react';

interface MemberAuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'register';
  contextMessage?: string;
  onClose: () => void;
  onLoginWithEmail: (input: { email: string; password: string }) => Promise<void>;
  onRegisterWithEmail: (input: {
    displayName: string;
    email: string;
    phone: string;
    password: string;
    tier: 'reguler' | 'reseller';
  }) => Promise<void>;
  onLoginWithGoogle: () => Promise<void>;
}

export const MemberAuthModal: React.FC<MemberAuthModalProps> = ({
  open,
  initialMode = 'login',
  contextMessage,
  onClose,
  onLoginWithEmail,
  onRegisterWithEmail,
  onLoginWithGoogle,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<'reguler' | 'reseller'>('reguler');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLoginWithEmail({ email, password });
      } else {
        await onRegisterWithEmail({
          displayName,
          email,
          phone,
          password,
          tier,
        });
      }
      setPassword('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses akun member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await onLoginWithGoogle();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login Google dibatalkan atau gagal. Anda juga dapat masuk dengan email.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-auth-title"
      data-testid="member-auth-modal"
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto tab-fade-in">
        {/* Ocean-to-Emerald Header */}
        <div className="bg-gradient-to-r from-[#062442] via-[#0369A1] to-[#059669] px-5 py-4 text-white flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
              Keanggotaan Resmi MALL DIGITAL STORE
            </p>
            <h2 id="member-auth-title" className="text-base font-extrabold leading-snug">
              {mode === 'login' ? 'Masuk Akun Member' : 'Daftar Member Baru Gratis'}
            </h2>
            <p className="text-[11px] text-cyan-50/90">
              {contextMessage ||
                'Otomatis terdaftar sebagai member untuk checkout otomatis, akses tarif Reseller VIP, dan kumpulkan poin.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela login member"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-950">
            <button
              type="button"
              data-testid="member-auth-tab-login"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Masuk Member
            </button>
            <button
              type="button"
              data-testid="member-auth-tab-register"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Daftar Member
            </button>
          </div>

          {/* Instant Google Sign-in -> Auto-Member Registration */}
          <button
            type="button"
            disabled={googleLoading || submitting}
            onClick={() => void handleGoogleClick()}
            data-testid="member-google-signin-btn"
            className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-[#051621] border border-slate-300 dark:border-teal-900 hover:border-teal-500 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
            )}
            <span>Lanjutkan dengan Google (Otomatis Jadi Member)</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-teal-950 w-full" />
            <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-white dark:bg-[#081E2C] shrink-0">
              atau dengan email member
            </span>
            <div className="border-t border-slate-200 dark:border-teal-950 w-full" />
          </div>

          {error && (
            <div
              role="alert"
              data-testid="member-auth-error"
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" data-testid="member-auth-form">
            {mode === 'register' && (
              <>
                <div className="space-y-1">
                  <label
                    htmlFor="member-name-input"
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="member-name-input"
                      data-testid="member-name-input"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Contoh: Dita Anggraini"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="member-phone-input"
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Nomor WhatsApp (Opsional untuk Info Pesanan)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="member-phone-input"
                      data-testid="member-phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-mono bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label
                htmlFor="member-email-input"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
              >
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="member-email-input"
                  data-testid="member-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="member-password-input"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="member-password-input"
                  data-testid="member-password-input"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F3FAFC] dark:bg-[#051621] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Level Keanggotaan
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTier('reguler')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      tier === 'reguler'
                        ? 'bg-sky-50/90 dark:bg-sky-950/50 border-cyan-600 text-cyan-900 dark:text-teal-200'
                        : 'bg-white dark:bg-[#051621] border-slate-200 dark:border-teal-950 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold">Member Reguler</p>
                    <p className="text-[10px] opacity-80">Gratis +100 Poin &amp; Isi Otomatis</p>
                  </button>
                  <button
                    type="button"
                    data-testid="member-tier-reseller-btn"
                    onClick={() => setTier('reseller')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      tier === 'reseller'
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-600 text-emerald-900 dark:text-emerald-200'
                        : 'bg-white dark:bg-[#051621] border-slate-200 dark:border-teal-950 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p className="inline-flex items-center gap-1 text-xs font-bold">
                      <Crown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Reseller VIP
                    </p>
                    <p className="text-[10px] opacity-80">Otomatis Harga Grosir Katalog</p>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || googleLoading}
              data-testid="member-auth-submit-btn"
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'login' ? 'Masuk ke Akun Member' : 'Daftar & Aktifkan Member'}</span>
            </button>
          </form>

          {/* Compact Member Benefits */}
          <div className="pt-3 border-t border-slate-100 dark:border-teal-950 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Data nama &amp; email terisi otomatis saat checkout produk digital &amp; unduhan instan.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-cyan-700 dark:text-teal-400 shrink-0" />
              <span>Bonus +100 Poin Loyalitas langsung masuk saat pendaftaran member baru.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 dark:text-teal-400 shrink-0" />
              <span>Kata sandi terenkripsi scrypt &amp; sesi aman dengan token server.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
