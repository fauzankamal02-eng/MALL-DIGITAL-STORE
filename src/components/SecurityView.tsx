import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import type { SecurityProfile } from '../types';

interface SecurityViewProps {
  security: SecurityProfile;
  firebaseUser: {
    uid: string;
    displayName: string | null;
    email: string | null;
  } | null;
  browserPushPermission: NotificationPermission | 'unsupported';
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSetupMfa: () => Promise<{
    secretForEnrollment: string;
    otpAuthUri: string;
    currentCodePreview: string;
  }>;
  onVerifyMfa: (code: string) => Promise<void>;
  onDisableMfa: () => Promise<void>;
  onRegisterBiometric: (deviceLabel: string) => Promise<void>;
  onVerifyBiometric: (deviceId: string) => Promise<void>;
  onRequestBrowserPush: () => Promise<void>;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  security,
  firebaseUser,
  browserPushPermission,
  onSignInGoogle,
  onSignOut,
  onSetupMfa,
  onVerifyMfa,
  onDisableMfa,
  onRegisterBiometric,
  onVerifyBiometric,
  onRequestBrowserPush,
}) => {
  const [mfaEnrollment, setMfaEnrollment] = useState<{
    secretForEnrollment: string;
    otpAuthUri: string;
    currentCodePreview: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('Perangkat Utama — Sidik Jari / Face ID');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStartMfa = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const data = await onSetupMfa();
      setMfaEnrollment(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memulai pengaturan MFA.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      await onVerifyMfa(otpInput.trim());
      setOtpInput('');
      setMfaEnrollment(null);
      setStatusMsg('Login Multi-Faktor (TOTP 6-digit) berhasil diverifikasi dan aktif.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verifikasi kode OTP gagal.');
    } finally {
      setBusy(false);
    }
  };

  const handleBiometricRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      await onRegisterBiometric(deviceLabel.trim() || 'Passkey Perangkat Ini');
      setStatusMsg('Kunci otentikasi biometrik (WebAuthn Passkey) berhasil didaftarkan dan terverifikasi.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran biometrik gagal.');
    } finally {
      setBusy(false);
    }
  };

  const handleBiometricTest = async (deviceId: string) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      await onVerifyBiometric(deviceId);
      setStatusMsg('Verifikasi biometrik berhasil. Sesi akses sensitif dikonfirmasi.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verifikasi biometrik gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Keamanan Akun, MFA &amp; Otentikasi Biometrik
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Lindungi akses akun, riwayat unduhan, dan penarikan dana bank lokal dengan Login Multi-Faktor (TOTP) serta Passkey Biometrik.
        </p>
      </div>

      {statusMsg && (
        <div
          role="status"
          className="p-3.5 text-sm text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg"
        >
          {statusMsg}
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

      {/* Firebase Account Sync Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sinkronisasi Akun Cloud (Firebase Authentication)
            </h2>
          </div>
          {firebaseUser ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Masuk sebagai <span className="font-semibold text-slate-900 dark:text-slate-100">{firebaseUser.displayName || firebaseUser.email}</span> ({firebaseUser.email})
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Hubungkan akun Google Anda untuk menyinkronkan profil, riwayat pesanan, dan hak akses admin secara permanen di Firestore.
            </p>
          )}
        </div>

        <div className="shrink-0">
          {firebaseUser ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Keluar Akun
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignInGoogle}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg"
            >
              <LogIn className="w-4 h-4" />
              Masuk dengan Google
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Factor Authentication (TOTP 2FA) */}
        <section className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Login Multi-Faktor (MFA / TOTP 2FA)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Standar RFC 6238 (kompatibel dengan Google Authenticator &amp; Authy).
              </p>
            </div>
            <span
              data-testid="mfa-status-label"
              className={`text-xs font-semibold ${
                security.mfaEnabled
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {security.mfaEnabled ? 'Aktif' : 'Belum Aktif'}
            </span>
          </div>

          {security.mfaEnabled ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs space-y-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Proteksi 2-Faktor Aktif
                </p>
                <p className="text-emerald-800 dark:text-emerald-300 font-mono">
                  Kunci Rahasia: {security.mfaSecretMasked}
                </p>
                {security.mfaVerifiedAt && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    Diverifikasi: {new Date(security.mfaVerifiedAt).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onDisableMfa}
                className="px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
              >
                Nonaktifkan MFA
              </button>
            </div>
          ) : !mfaEnrollment ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tambahkan lapisan verifikasi 6-digit sekali pakai setiap kali masuk dari perangkat baru atau mengajukan penarikan dana.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handleStartMfa}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-50"
              >
                Mulai Pengaturan MFA
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  1. Simpan Kunci Rahasia ke Aplikasi Authenticator:
                </p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 break-all">
                  {mfaEnrollment.secretForEnrollment}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Kode TOTP aktif saat ini (30 detik):{' '}
                  <span
                    data-testid="mfa-live-code"
                    className="font-mono font-bold text-cyan-700 dark:text-teal-300"
                  >
                    {mfaEnrollment.currentCodePreview}
                  </span>
                </p>
              </div>

              <div>
                <label
                  htmlFor="mfa-otp-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  2. Masukkan Kode Verifikasi 6 Digit
                </label>
                <input
                  id="mfa-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-full px-3.5 py-2 text-base font-mono tracking-widest bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-50"
                >
                  Verifikasi &amp; Aktifkan MFA
                </button>
                <button
                  type="button"
                  onClick={() => setMfaEnrollment(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Biometric Authentication (WebAuthn Passkey) */}
        <section className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Otentikasi Biometrik (WebAuthn Passkey)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gunakan sidik jari (Touch ID), Face ID, atau Windows Hello untuk akses instan bebas kata sandi.
              </p>
            </div>
            <span
              data-testid="biometric-status-label"
              className={`text-xs font-semibold ${
                security.biometricEnabled
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {security.biometricEnabled ? 'Terdaftar' : 'Belum Terdaftar'}
            </span>
          </div>

          <form onSubmit={handleBiometricRegister} className="space-y-3">
            <div>
              <label
                htmlFor="biometric-device-label"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Label Perangkat Biometrik
              </label>
              <input
                id="biometric-device-label"
                type="text"
                required
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-50"
            >
              <Fingerprint className="w-4 h-4" />
              Daftarkan Kunci Biometrik
            </button>
          </form>

          {security.biometricDevices.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Perangkat Biometrik Aktif ({security.biometricDevices.length})
              </p>
              {security.biometricDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Smartphone className="w-4 h-4 text-cyan-700 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {dev.label}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Verifikasi terakhir: {new Date(dev.lastVerifiedAt).toLocaleTimeString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleBiometricTest(dev.id)}
                    className="px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-md whitespace-nowrap shrink-0"
                  >
                    Uji Verifikasi
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Browser Push Notification Preferences */}
      <section className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Notifikasi Push Real-Time Peramban
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Terima pembaruan status pembayaran, pengiriman berkas digital, dan penarikan dana secara instan bahkan saat tab diminimalkan.
          </p>
        </div>

        <div className="shrink-0">
          {browserPushPermission === 'granted' ? (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Notifikasi Push Diizinkan
            </span>
          ) : browserPushPermission === 'unsupported' ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Mode Notifikasi Dalam Aplikasi Aktif
            </span>
          ) : (
            <button
              type="button"
              onClick={onRequestBrowserPush}
              className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Aktifkan Notifikasi Peramban
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
