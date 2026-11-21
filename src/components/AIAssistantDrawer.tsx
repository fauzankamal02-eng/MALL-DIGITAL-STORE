import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Crown,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { AIAssistantMessage, DigitalProduct } from '../types';
import { formatIdr } from '../utils/commerce';
import { AppBrandLogo } from './AppBrandLogo';

interface AIAssistantDrawerProps {
  open: boolean;
  products: DigitalProduct[];
  onClose: () => void;
  onSelectProductForCheckout: (product: DigitalProduct, tier?: 'reguler' | 'reseller') => void;
}

const INITIAL_ASSISTANT_MESSAGE: AIAssistantMessage = {
  id: 'ai-welcome',
  role: 'assistant',
  text: 'Halo! Saya AI Assistant resmi MALL DIGITAL STORE. Tanyakan rekomendasi aplikasi premium, e-book, template, perbandingan harga Reguler vs Reseller, atau cara memakai voucher diskon HEMAT15.',
  createdAt: new Date().toISOString(),
};

const QUICK_PROMPTS = [
  'Rekomendasi aplikasi editing di bawah Rp 30.000',
  'Bandingkan harga Reguler vs Reseller Netflix & Canva',
  'Voucher diskon apa yang aktif saat ini?',
  'Rekomendasi E-Book pengembangan diri & keuangan terlaris',
];

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  open,
  products,
  onClose,
  onSelectProductForCheckout,
}) => {
  const [messages, setMessages] = useState<AIAssistantMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, loading]);

  if (!open) return null;

  const sendPrompt = async (promptText: string) => {
    const cleaned = promptText.trim();
    if (!cleaned || loading) return;

    setErrorMsg(null);
    const userMsg: AIAssistantMessage = {
      id: `ai-u-${Date.now()}`,
      role: 'user',
      text: cleaned,
      createdAt: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const apiHistory = nextHistory
        .filter((m) => m.id !== 'ai-welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiHistory }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error || `AI Assistant gagal merespons (${response.status})`
        );
      }

      const payload = data as { reply: string; recommendedProductIds?: string[] };
      const assistantMsg: AIAssistantMessage = {
        id: `ai-a-${Date.now()}`,
        role: 'assistant',
        text: payload.reply,
        recommendedProductIds: Array.isArray(payload.recommendedProductIds)
          ? payload.recommendedProductIds
          : [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal terhubung ke layanan AI Assistant.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  const handleReset = () => {
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setErrorMsg(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-assistant-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#04121C]/65"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#081E2C] border-l border-slate-200 dark:border-teal-950 h-full flex flex-col shadow-2xl">
        {/* Ocean Blue to Emerald Green Gradient Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#062442] via-[#0369A1] to-[#059669] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white/15 border border-emerald-200/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </span>
            <div className="min-w-0">
              <h2 id="ai-assistant-title" className="text-sm font-bold tracking-tight truncate">
                AI Assistant · MALL DIGITAL STORE
              </h2>
              <p className="text-[11px] text-cyan-100/90 truncate">
                Asisten Pintar Katalog, Harga &amp; Promo 24/7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              aria-label="Mulai percakapan baru"
              title="Percakapan baru"
              className="p-2 text-cyan-100 hover:text-white rounded-lg hover:bg-white/12 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel AI Assistant"
              className="p-2 text-cyan-100 hover:text-white rounded-lg hover:bg-white/12 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div
          ref={scrollRef}
          data-testid="ai-assistant-messages"
          className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F3FAFC] dark:bg-[#04121C]"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const recommendedProducts = (msg.recommendedProductIds ?? [])
              .map((id) => products.find((p) => p.id === id))
              .filter((p): p is DigitalProduct => Boolean(p && p.active && p.stock > 0));

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {!isUser && <Bot className="w-3.5 h-3.5 text-cyan-700 dark:text-teal-400" />}
                  <span className="font-medium">
                    {isUser ? 'Anda' : 'AI Assistant'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white rounded-tr-sm shadow-xs'
                      : 'bg-white dark:bg-[#081E2C] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-teal-950 rounded-tl-sm shadow-2xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Clickable Recommended Digital Product Cards */}
                {recommendedProducts.length > 0 && (
                  <div className="mt-2.5 w-full max-w-[92%] space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-teal-300">
                      Rekomendasi Siap Beli
                    </p>
                    {recommendedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        data-testid={`ai-recommended-${prod.id}`}
                        className="p-3 rounded-xl bg-white dark:bg-[#081E2C] border border-teal-200/80 dark:border-teal-900 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <AppBrandLogo brand={prod.brand} title={prod.title} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {prod.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums">
                              <span className="font-bold text-cyan-800 dark:text-teal-300">
                                {formatIdr(prod.priceIdr)}
                              </span>
                              <span className="text-slate-400" aria-hidden="true">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                                <Crown className="w-3 h-3" />
                                {formatIdr(prod.resellerPriceIdr)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProductForCheckout(prod, 'reguler');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          Beli
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-2 text-xs text-cyan-800 dark:text-teal-300">
              <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#081E2C] border border-teal-200/80 dark:border-teal-900 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>AI Assistant sedang menyiapkan rekomendasi...</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {messages.length <= 1 && !loading && (
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Pertanyaan Populer:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendPrompt(q)}
                    className="text-left px-3.5 py-2 text-xs font-medium text-cyan-900 dark:text-teal-100 bg-white dark:bg-[#081E2C] hover:bg-teal-50 dark:hover:bg-teal-950/70 border border-slate-200 dark:border-teal-900 rounded-xl transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-white dark:bg-[#081E2C] border-t border-slate-200 dark:border-teal-950 space-y-2"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="ai-assistant-input" className="sr-only">
              Tanyakan sesuatu ke AI Assistant MALL DIGITAL STORE
            </label>
            <input
              id="ai-assistant-input"
              type="text"
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya rekomendasi produk, promo, atau pembayaran..."
              className="flex-1 px-3.5 py-2.5 text-sm bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-300 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Kirim pertanyaan ke AI Assistant"
              className="p-2.5 text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Didukung data katalog, stok, dan voucher real-time MALL DIGITAL STORE.
          </p>
        </form>
      </div>
    </div>
  );
};
