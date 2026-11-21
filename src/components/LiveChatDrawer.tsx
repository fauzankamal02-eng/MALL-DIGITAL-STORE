import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import type { OrderRecord, SupportMessage } from '../types';

interface LiveChatDrawerProps {
  open: boolean;
  messages: SupportMessage[];
  orders: OrderRecord[];
  initialOrderRef?: string;
  defaultSenderName: string;
  onClose: () => void;
  onSendMessage: (input: {
    text: string;
    senderName: string;
    senderRole: 'customer' | 'support';
    orderRef?: string;
  }) => Promise<void>;
}

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({
  open,
  messages,
  orders,
  initialOrderRef = '',
  defaultSenderName,
  onClose,
  onSendMessage,
}) => {
  const [text, setText] = useState('');
  const [senderRole, setSenderRole] = useState<'customer' | 'support'>('customer');
  const [orderRef, setOrderRef] = useState(initialOrderRef);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialOrderRef) {
      setOrderRef(initialOrderRef);
    }
  }, [initialOrderRef]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = text.trim();
    if (!cleaned) return;
    setSending(true);
    try {
      await onSendMessage({
        text: cleaned,
        senderName:
          senderRole === 'support'
            ? 'Rina — Agen Dukungan'
            : defaultSenderName || 'Pelanggan MALL DIGITAL STORE',
        senderRole,
        orderRef: orderRef || undefined,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-chat-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#04121C]/55"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#081E2C] border-l border-slate-200 dark:border-teal-950 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-teal-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
            <div>
              <h2 id="live-chat-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Chat Dukungan Pelanggan Langsung
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Terhubung WebSocket Real-Time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel chat langsung"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Switch for Testing Two-Way Real-Time Support */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Kirim sebagai:</span>
          <div className="inline-flex p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-md">
            <button
              type="button"
              onClick={() => setSenderRole('customer')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                senderRole === 'customer'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pelanggan
            </button>
            <button
              type="button"
              onClick={() => setSenderRole('support')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                senderRole === 'support'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Agen Dukungan
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const isSupport = msg.senderRole === 'support';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSupport ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span className="font-medium">{msg.senderName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isSupport
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white'
                  }`}
                >
                  {msg.orderRef && (
                    <p className="text-[11px] font-mono opacity-85 mb-1">
                      Referensi: {msg.orderRef}
                    </p>
                  )}
                  <p>{msg.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5"
        >
          {orders.length > 0 && (
            <div>
              <label htmlFor="chat-order-ref" className="sr-only">
                Lampirkan kode pesanan
              </label>
              <select
                id="chat-order-ref"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value="">Tanpa lampiran pesanan (opsional)</option>
                {orders.slice(0, 8).map((o) => (
                  <option key={o.id} value={o.orderCode}>
                    Lampirkan {o.orderCode} — {o.productTitle}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="chat-message-input" className="sr-only">
              Tulis pesan dukungan
            </label>
            <input
              id="chat-message-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tulis pesan bantuan Anda di sini..."
              className="flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-[#04121C] border border-slate-300 dark:border-teal-950 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Kirim pesan chat"
              className="p-2.5 text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
