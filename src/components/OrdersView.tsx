import React, { useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, Download, KeyRound, Mail, MessageSquare, Search } from 'lucide-react';
import type { AutomatedEmailLog, OrderRecord } from '../types';
import { formatIdr } from '../utils/commerce';
import { AppBrandLogo } from './AppBrandLogo';

interface OrdersViewProps {
  orders: OrderRecord[];
  emails: AutomatedEmailLog[];
  onVerifyPendingOrder: (orderId: string) => Promise<void>;
  onOpenChatWithOrder: (orderCode: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  emails,
  onVerifyPendingOrder,
  onOpenChatWithOrder,
}) => {
  const [subTab, setSubTab] = useState<'orders' | 'emails'>('orders');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [query, setQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyDelivered = (orderId: string, val: string) => {
    setCopiedOrderId(orderId);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(val).catch(() => {});
    }
    window.setTimeout(() => {
      setCopiedOrderId((prev) => (prev === orderId ? null : prev));
    }, 1800);
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.paymentStatus !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      order.orderCode.toLowerCase().includes(q) ||
      order.productTitle.toLowerCase().includes(q) ||
      order.buyerName.toLowerCase().includes(q) ||
      order.paymentMethodLabel.toLowerCase().includes(q)
    );
  });

  const handleVerify = async (orderId: string) => {
    setVerifyingId(orderId);
    try {
      await onVerifyPendingOrder(orderId);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Riwayat Pesanan &amp; Kotak Email Otomatis
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Lacak setiap tahapan transaksi, unduh ulang file terverifikasi, dan tinjau email faktur otomatis.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSubTab('orders')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daftar Pesanan ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('emails')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'emails'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Log Email Otomatis ({emails.length})
          </button>
        </div>
      </div>

      {subTab === 'orders' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', 'Semua'],
                  ['verified', 'Terverifikasi'],
                  ['pending', 'Menunggu Bayar'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === key
                      ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white border-transparent'
                      : 'bg-white dark:bg-[#081E2C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-950'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <label htmlFor="cari-pesanan" className="sr-only">
                Cari kode atau produk pesanan
              </label>
              <input
                id="cari-pesanan"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kode pesanan atau produk..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Belum ada pesanan yang cocok
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pesanan produk digital Anda akan tercatat lengkap di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isVerified = order.paymentStatus === 'verified';
                return (
                  <article
                    key={order.id}
                    data-testid={`order-item-${order.orderCode}`}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <AppBrandLogo brand={order.productTitle} title={order.productTitle} size="sm" className="mt-0.5" />
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {order.orderCode}
                            </span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isVerified
                                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                                : 'font-semibold text-amber-700 dark:text-amber-400'
                            }
                          >
                            {isVerified ? 'Pembayaran Terverifikasi' : 'Menunggu Pembayaran'}
                          </span>
                        </div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {order.productTitle}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Pembeli: {order.buyerName} ({order.buyerEmail}) · {order.paymentMethodLabel} · Ref:{' '}
                          <span className="font-mono">{order.paymentReference}</span>
                        </p>
                        </div>
                      </div>

                      <div className="lg:text-right shrink-0">
                        <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                          {formatIdr(order.finalAmountIdr)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {order.installmentMonths > 1
                            ? `Cicilan ${order.installmentMonths}x (${formatIdr(order.monthlyInstallmentIdr)}/bln)`
                            : order.promoCode
                              ? `Promo ${order.promoCode} (-${formatIdr(order.discountIdr)})`
                              : `Unduhan: ${order.downloadCount}x`}
                        </p>
                      </div>
                    </div>

                    {/* Step-by-Step Delivery Status Timeline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {order.timeline.map((step, index) => (
                        <div key={index} className="flex items-start gap-2.5">
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                              {step.label}
                            </p>
                            {step.timestamp && (
                              <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {new Date(step.timestamp).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Auto-Delivered Account / License / SN Token Box */}
                    {isVerified && order.deliveredPayload && (
                      <div
                        data-testid={`order-delivered-${order.orderCode}`}
                        className="p-4 rounded-xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-200 dark:border-teal-900 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-900 dark:text-teal-200">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {order.deliveredPayload.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyDelivered(order.id, order.deliveredPayload!.value)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 dark:text-teal-200 bg-white dark:bg-[#081E2C] border border-teal-200 dark:border-teal-800 rounded-lg hover:border-teal-500"
                          >
                            {copiedOrderId === order.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                Disalin!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Salin
                              </>
                            )}
                          </button>
                        </div>
                        <p className="p-2.5 rounded-lg bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 font-mono text-xs font-bold text-slate-900 dark:text-emerald-300 break-all select-all">
                          {order.deliveredPayload.value}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {order.deliveredPayload.instructions}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Berkas: {order.fileName} ({order.fileSizeMb} MB) · Diunduh {order.downloadCount}x
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenChatWithOrder(order.orderCode)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Bantuan Pesanan
                        </button>

                        {isVerified && order.downloadToken ? (
                          <a
                            href={`/api/downloads/${order.downloadToken}`}
                            download={order.fileName}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh File Digital
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled={verifyingId === order.id}
                            onClick={() => handleVerify(order.id)}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                          >
                            {verifyingId === order.id
                              ? 'Memverifikasi...'
                              : 'Verifikasi Pembayaran'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'emails' && (
        <div className="space-y-4">
          {emails.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500">
              Belum ada email otomatis yang terkirim.
            </div>
          ) : (
            emails.map((email) => (
              <article
                key={email.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Kepada: {email.recipientName} &lt;{email.toEmail}&gt;
                    </span>
                  </div>
                  <span className="font-mono tabular-nums">
                    Terkirim · {new Date(email.sentAt).toLocaleString('id-ID')}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {email.subject}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {email.bodyPreview}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-slate-800">
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Nominal Faktur: {formatIdr(email.amountIdr)}
                  </span>
                  <a
                    href={email.downloadUrl}
                    className="font-medium text-cyan-700 dark:text-teal-300 hover:underline"
                  >
                    Buka Tautan Unduhan Resmi
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
};
