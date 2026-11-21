import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  MessageSquare,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';
import type { FaqCategory, FaqItem } from '../types';
import { FAQ_CATEGORIES, filterPublicFaqs } from '../utils/faqUtils';

interface FaqSectionProps {
  faqs: FaqItem[];
  onOpenLiveChat: () => void;
  onOpenAIAssistant: () => void;
  onManageFaqs: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({
  faqs,
  onOpenLiveChat,
  onOpenAIAssistant,
  onManageFaqs,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | FaqCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(() => {
    const firstActive = filterPublicFaqs(faqs)[0];
    return firstActive ? firstActive.id : null;
  });

  const visibleFaqs = useMemo(
    () => filterPublicFaqs(faqs, selectedCategory, searchQuery),
    [faqs, selectedCategory, searchQuery]
  );

  const effectiveOpenId = useMemo(() => {
    if (openId && visibleFaqs.some((f) => f.id === openId)) {
      return openId;
    }
    return visibleFaqs[0]?.id ?? null;
  }, [openId, visibleFaqs]);

  return (
    <section
      id="faq-beranda"
      aria-labelledby="faq-section-heading"
      data-testid="home-faq-section"
      className="pt-2"
    >
      <div className="bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Intro, Instant Search, Category Tabs & CS Fallback */}
          <div className="lg:col-span-4 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-teal-300">
                <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pusat Bantuan Instan</span>
              </div>
              <h2
                id="faq-section-heading"
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 [text-wrap:balance]"
              >
                Pertanyaan Umum (FAQ)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Temukan jawaban cepat seputar pembayaran otomatis, pengiriman file &amp; akun, top up, hingga garansi sebelum menghubungi tim CS.
              </p>
            </div>

            {/* Instant FAQ Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="faq-search-input" className="sr-only">
                Cari pertanyaan FAQ
              </label>
              <input
                id="faq-search-input"
                data-testid="faq-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jawaban, mis. QRIS, garansi, token..."
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-200 dark:border-teal-900 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Interactive Category Filter Controls */}
            <div
              role="group"
              aria-label="Filter kategori FAQ"
              className="flex flex-wrap gap-1.5"
            >
              {(['Semua', ...FAQ_CATEGORIES] as const).map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white border-transparent'
                        : 'bg-white dark:bg-[#04121C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-900 hover:border-teal-400'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Escalation to AI Assistant / Live Chat + Admin Shortcut */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-teal-950 space-y-3">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Belum menemukan jawaban yang Anda cari?
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAIAssistant}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl whitespace-nowrap shrink-0 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  Tanya AI Assistant
                </button>
                <button
                  type="button"
                  onClick={onOpenLiveChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-cyan-800 dark:text-teal-200 bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-200 dark:border-teal-900 hover:border-teal-400 rounded-xl whitespace-nowrap shrink-0 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Hubungi CS
                </button>
              </div>
              <button
                type="button"
                onClick={onManageFaqs}
                data-testid="faq-manage-admin-btn"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-teal-300 transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Kelola daftar FAQ (Admin)
              </button>
            </div>
          </div>

          {/* Right Column: Accessible Hairline-Divided FAQ Accordion */}
          <div className="lg:col-span-8">
            {visibleFaqs.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-xl bg-[#F3FAFC] dark:bg-[#04121C] border border-slate-200/80 dark:border-teal-950 space-y-2.5">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tidak ada pertanyaan yang cocok dengan pencarian Anda
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Coba kata kunci lain atau tanyakan langsung melalui AI Assistant dan Live Chat CS.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Semua');
                    setSearchQuery('');
                  }}
                  className="mt-1 px-3.5 py-1.5 text-xs font-semibold text-cyan-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950"
                >
                  Tampilkan Semua FAQ
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-teal-950 border-t border-b border-slate-200/80 dark:border-teal-950">
                {visibleFaqs.map((item, idx) => {
                  const isOpen = effectiveOpenId === item.id;
                  const panelId = `faq-panel-${item.id}`;
                  return (
                    <div key={item.id} data-testid={`faq-item-${item.id}`}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="w-full py-4 px-1 flex items-start justify-between gap-4 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums text-cyan-700 dark:text-teal-400 font-semibold">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                          </div>
                          <h3 className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-700 dark:group-hover:text-teal-300 transition-colors leading-snug">
                            {item.question}
                          </h3>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 group-hover:text-cyan-700 dark:group-hover:text-teal-300 shrink-0 mt-1.5 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-cyan-700 dark:text-teal-300' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div
                          id={panelId}
                          data-testid={`faq-answer-${item.id}`}
                          className="pb-5 pl-1 pr-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line"
                        >
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
