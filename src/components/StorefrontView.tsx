import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Crown,
  Flame,
  Headphones,
  Heart,
  Info,
  LayoutGrid,
  LogIn,
  Megaphone,
  PackageSearch,
  Search,
  Settings2,
  ShoppingCart,
  Sparkles,
  Store,
  UserCheck,
  Wrench,
} from 'lucide-react';
import type {
  DigitalProduct,
  FaqItem,
  MemberProfile,
  ProductCategory,
  PromoVoucher,
  StoreAnnouncement,
} from '../types';
import { formatIdr } from '../utils/commerce';
import { AppBrandLogo } from './AppBrandLogo';
import { FaqSection } from './FaqSection';

interface StorefrontViewProps {
  products: DigitalProduct[];
  promos: PromoVoucher[];
  faqs: FaqItem[];
  member: MemberProfile | null;
  loyaltyPoints: number;
  announcement: StoreAnnouncement;
  onSelectProductForCheckout: (product: DigitalProduct, defaultTier?: 'reguler' | 'reseller') => void;
  onAddToCart: (product: DigitalProduct) => void;
  onNavigateOrders: () => void;
  onNavigateSeller: () => void;
  onManageAnnouncement: () => void;
  onManageFaqs: () => void;
  onOpenMemberAuth: (mode?: 'login' | 'register', contextMessage?: string) => void;
  onOpenLiveChat: () => void;
  onOpenAIAssistant: () => void;
}

const HERO_SLIDES = [
  {
    kicker: 'MALL DIGITAL STORE · UNDUHAN OTOMATIS 24 JAM',
    title: 'Produk Digital & Aplikasi Premium Aktivasi Instan',
    subtitle:
      'Bayar aman pakai QRIS, Virtual Account Bank Lokal, atau E-Wallet — file lisensi, e-book, dan faktur email langsung terkirim otomatis.',
    badge: 'Kode: HEMAT15 · Diskon 15%',
  },
  {
    kicker: 'PROGRAM MITRA RESELLER VIP INDONESIA',
    title: 'Tarif Khusus Reseller Mulai Rp 3.500 / Produk',
    subtitle:
      'Nikmati margin lebih hemat dengan mode harga Reseller langsung di etalase & checkout, lengkap dengan stok real-time.',
    badge: 'Kode: RESELLER10 · Ekstra 10%',
  },
  {
    kicker: 'KOLEKSI E-BOOK, UI KIT & SOURCE CODE SIAP PRODUKSI',
    title: 'Tingkatkan Produktivitas Bisnis & Kreator Digital',
    subtitle:
      'Temukan aset digital berkualitas dengan bantuan AI Assistant 24/7, riwayat unduhan permanen, dan layanan CS responsif.',
    badge: 'Kode: LOYAL50K · Potongan Rp 50rb',
  },
];

const QUICK_SEARCH_TERMS = ['CapCut', 'Netflix', 'Canva', 'ChatGPT', 'E-Book', 'Figma'];

const TYPE_TABS: Array<{ id: 'Semua' | ProductCategory | 'Favorit'; label: string }> = [
  { id: 'Semua', label: 'Semua Tipe' },
  { id: 'Aplikasi Premium', label: 'Aplikasi Premium' },
  { id: 'E-Book', label: 'E-Book' },
  { id: 'Template & Kode', label: 'Template & Kode' },
];

const POPULAR_BRANDS = [
  { id: 'Semua', label: 'Semua Brand', bg: '#E6F7F5', fg: '#0369A1', glyph: 'ALL' },
  { id: 'CapCut', label: 'CapCut', bg: '#0B192C', fg: '#FFFFFF', glyph: 'CC' },
  { id: 'Netflix', label: 'Netflix', bg: '#141414', fg: '#E50914', glyph: 'N' },
  { id: 'ChatGPT', label: 'ChatGPT', bg: '#0F766E', fg: '#FFFFFF', glyph: 'AI' },
  { id: 'Canva', label: 'Canva', bg: '#0891B2', fg: '#FFFFFF', glyph: 'Ca' },
  { id: 'Adobe', label: 'Adobe', bg: '#075985', fg: '#67E8F9', glyph: 'Ae' },
  { id: 'Spotify', label: 'Spotify', bg: '#15803D', fg: '#FFFFFF', glyph: 'SP' },
  { id: 'E-Book', label: 'E-Book', bg: '#047857', fg: '#FFFFFF', glyph: 'EB' },
  { id: 'Prime Video', label: 'Prime', bg: '#0369A1', fg: '#FFFFFF', glyph: 'PV' },
  { id: 'Duolingo', label: 'Duolingo', bg: '#16A34A', fg: '#FFFFFF', glyph: 'DL' },
];

const NOTICE_STYLES = {
  normal: {
    badgeLabel: 'Layanan Normal',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    cardAccent: 'border-emerald-200/90 dark:border-emerald-900/80',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  info: {
    badgeLabel: 'Informasi Toko',
    badgeClass:
      'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    cardAccent: 'border-sky-200/90 dark:border-sky-900/80',
    icon: Info,
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  warning: {
    badgeLabel: 'Pemberitahuan Kendala',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    cardAccent: 'border-amber-300 dark:border-amber-800/90',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  maintenance: {
    badgeLabel: 'Gangguan / Pemeliharaan',
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    cardAccent: 'border-rose-300 dark:border-rose-800/90',
    icon: Wrench,
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
} as const;

function BrandArtwork({
  product,
  size = 'md',
}: {
  product: DigitalProduct;
  size?: 'sm' | 'md';
}) {
  if (product.imageUrl) {
    return (
      <div className="relative shrink-0">
        <img
          src={product.imageUrl}
          alt={product.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={
            size === 'sm'
              ? 'w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-teal-950 shrink-0'
              : 'w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover shadow-sm border border-slate-200/80 dark:border-teal-950'
          }
        />
        {size === 'md' && product.brand.toLowerCase() === 'figma' && (
          <div className="absolute -bottom-1.5 -right-1.5">
            <AppBrandLogo brand="Figma" title={product.title} size="xs" className="ring-2 ring-white dark:ring-[#081E2C]" />
          </div>
        )}
      </div>
    );
  }

  return (
    <AppBrandLogo
      brand={product.brand}
      title={product.title}
      size={size === 'sm' ? 'sm' : 'lg'}
    />
  );
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  products,
  promos,
  faqs,
  member,
  loyaltyPoints,
  announcement,
  onSelectProductForCheckout,
  onAddToCart,
  onNavigateOrders,
  onNavigateSeller,
  onManageAnnouncement,
  onManageFaqs,
  onOpenMemberAuth,
  onOpenLiveChat,
  onOpenAIAssistant,
}) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Semua');
  const [selectedType, setSelectedType] = useState<'Semua' | ProductCategory | 'Favorit'>('Semua');
  const [priceViewMode, setPriceViewMode] = useState<'reguler' | 'reseller'>('reguler');
  const [favorites, setFavorites] = useState<string[]>(['prod-netflix-1bln', 'prod-capcut-pro-1bln']);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

  const bestSellerScrollRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLElement | null>(null);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const bestSellers = useMemo(() => {
    return [...activeProducts]
      .filter((p) => p.stock > 0)
      .sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0) || b.soldCount - a.soldCount)
      .slice(0, 6);
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    return activeProducts.filter((product) => {
      if (selectedType === 'Favorit' && !favorites.includes(product.id)) return false;
      if (selectedType !== 'Semua' && selectedType !== 'Favorit' && product.category !== selectedType) {
        return false;
      }
      if (selectedBrand !== 'Semua' && product.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        product.title.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
      );
    });
  }, [activeProducts, selectedType, selectedBrand, activeSearch, favorites]);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleQuickKeyword = (term: string) => {
    setSearchInput(term);
    setActiveSearch(term);
    setSelectedBrand('Semua');
    setSelectedType('Semua');
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpToCategory = (category: 'Semua' | ProductCategory | 'Favorit') => {
    setSelectedBrand('Semua');
    setSelectedType(category);
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopyVoucher = (code: string) => {
    setCopiedVoucher(code);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code).catch(() => {});
    }
    window.setTimeout(() => {
      setCopiedVoucher((prev) => (prev === code ? null : prev));
    }, 1800);
  };

  const scrollBestSellers = (dir: 'left' | 'right') => {
    if (!bestSellerScrollRef.current) return;
    bestSellerScrollRef.current.scrollBy({
      left: dir === 'left' ? -270 : 270,
      behavior: 'smooth',
    });
  };

  const currentHero = HERO_SLIDES[heroIndex] ?? HERO_SLIDES[0];
  const activePromoList = promos.filter((p) => p.active).slice(0, 3);
  const noticeMeta = NOTICE_STYLES[announcement.level] ?? NOTICE_STYLES.normal;
  const NoticeIcon = noticeMeta.icon;

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Ocean Blue to Emerald Green Gradient Hero Promo Carousel Banner */}
      <section
        aria-label="Banner Promo Unggulan MALL DIGITAL STORE"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#062442] via-[#0369A1] to-[#0D9488] border border-cyan-700/50 px-6 py-7 sm:px-9 sm:py-9 text-white shadow-md shadow-cyan-950/15"
      >
        {/* Subtle Luminous Ocean & Emerald Auras */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-sky-300/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-0 w-96 h-96 rounded-full bg-emerald-300/25 blur-3xl"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              {currentHero.kicker}
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold tracking-tight text-white leading-[1.15] [text-wrap:balance]">
              {currentHero.title}
            </h1>
            <p className="text-xs sm:text-sm text-cyan-50/90 leading-relaxed max-w-xl">
              {currentHero.subtitle}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-emerald-200">
                <Crown className="w-3.5 h-3.5" />
                {currentHero.badge}
              </span>
              <span className="text-cyan-200/60" aria-hidden="true">·</span>
              <span className="font-mono text-cyan-50/90 tabular-nums">
                Poin Loyalitas Anda:{' '}
                <strong className="text-white">{loyaltyPoints.toLocaleString('id-ID')}</strong>
              </span>
              <span className="text-cyan-200/60" aria-hidden="true">·</span>
              <span className="font-mono text-emerald-100/90 tabular-nums">
                {activeProducts.length} Produk Aktif
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => jumpToCategory('Aplikasi Premium')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#05293D] bg-white hover:bg-emerald-50 rounded-xl transition-colors whitespace-nowrap shadow-xs"
            >
              Lihat Katalog
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={onOpenAIAssistant}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              AI Assistant
            </button>
            <button
              type="button"
              onClick={onNavigateOrders}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-cyan-50 hover:text-white bg-white/8 hover:bg-white/16 border border-white/20 rounded-xl transition-colors whitespace-nowrap"
            >
              Lacak Pesanan
            </button>
          </div>
        </div>

        {/* Slide Controls */}
        <div className="relative z-10 mt-6 flex items-center justify-between gap-4 pt-3 border-t border-white/15">
          <div className="flex items-center gap-1.5">
            {HERO_SLIDES.map((slide, idx) => (
              <button
                key={slide.kicker}
                type="button"
                onClick={() => setHeroIndex(idx)}
                aria-label={`Tampilkan slide promo ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  heroIndex === idx ? 'w-7 bg-emerald-300' : 'w-2 bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              aria-label="Slide sebelumnya"
              className="p-1.5 rounded-lg bg-white/12 hover:bg-white/22 text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
              aria-label="Slide berikutnya"
              className="p-1.5 rounded-lg bg-white/12 hover:bg-white/22 text-white transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Tactile Floating Search Command Bar + Quick Trending Keywords */}
      <div className="space-y-2">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 rounded-2xl shadow-sm focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-700 dark:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <label htmlFor="storefront-search-input" className="sr-only">
              Cari aplikasi premium, e-book, UI kit, template dan source code
            </label>
            <input
              id="storefront-search-input"
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === '') setActiveSearch('');
              }}
              placeholder="Cari aplikasi premium, e-book, UI kit, template & source code..."
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#0284C7] to-[#059669] hover:from-[#0369A1] hover:to-[#047857] rounded-xl transition-colors shrink-0"
          >
            Cari
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium">Pencarian populer:</span>
          {QUICK_SEARCH_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleQuickKeyword(term)}
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-teal-300 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Akses Cepat Layanan Digital + Papan Pemberitahuan Toko (Editable Format untuk Kendala/Info) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Akses Cepat & Kategori Digital (100% Fokus Produk Digital, Tanpa PPOB) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs">
                <LayoutGrid className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  Layanan &amp; Kategori Favorit
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Akses cepat katalog digital, bantuan AI, dan pengelolaan transaksi
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900 whitespace-nowrap">
              Unduh Otomatis 24/7
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {[
              {
                label: 'Aplikasi Premium',
                icon: Crown,
                bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300',
                highlight: false,
                onClick: () => jumpToCategory('Aplikasi Premium'),
              },
              {
                label: 'E-Book Digital',
                icon: BookOpen,
                bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
                highlight: false,
                onClick: () => jumpToCategory('E-Book'),
              },
              {
                label: 'Template & Kode',
                icon: Code2,
                bg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300',
                highlight: false,
                onClick: () => jumpToCategory('Template & Kode'),
              },
              {
                label: 'Favorit Saya',
                icon: Heart,
                bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
                highlight: false,
                onClick: () => jumpToCategory('Favorit'),
              },
              {
                label: 'Lacak Order',
                icon: PackageSearch,
                bg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300',
                highlight: false,
                onClick: onNavigateOrders,
              },
              {
                label: 'AI Assistant',
                icon: Sparkles,
                bg: 'bg-gradient-to-br from-[#0369A1] to-[#059669] text-white shadow-xs',
                highlight: true,
                onClick: onOpenAIAssistant,
              },
              {
                label: 'Bantuan CS',
                icon: Headphones,
                bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
                highlight: false,
                onClick: onOpenLiveChat,
              },
              {
                label: 'Dasbor Penjual',
                icon: Store,
                bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300',
                highlight: false,
                onClick: onNavigateSeller,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`group relative flex flex-col items-center justify-start gap-1.5 p-2.5 rounded-2xl transition-all hover:-translate-y-0.5 ${
                    item.highlight
                      ? 'bg-gradient-to-b from-sky-50/90 to-emerald-50/90 dark:from-sky-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-800/70'
                      : 'hover:bg-slate-50 dark:hover:bg-teal-950/35 border border-transparent'
                  }`}
                >
                  <span
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${item.bg}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span
                    className={`text-[11px] font-semibold text-center leading-tight ${
                      item.highlight
                        ? 'text-cyan-900 dark:text-teal-200'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Member Status / Login Strip */}
          {member ? (
            <div
              data-testid="home-member-active-strip"
              className="pt-3 border-t border-slate-100 dark:border-teal-950 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-900 dark:text-teal-200">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Member Aktif: {member.displayName}
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  ({member.memberCode})
                </span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                {member.tier === 'reseller' ? 'Tarif Reseller VIP Aktif' : 'Member Reguler'} ·{' '}
                {member.loyaltyPoints.toLocaleString('id-ID')} Poin
              </span>
            </div>
          ) : (
            <div
              data-testid="home-member-cta-strip"
              className="pt-3 border-t border-slate-100 dark:border-teal-950 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <LogIn className="w-3.5 h-3.5 text-cyan-700 dark:text-teal-400 shrink-0" />
                Masuk atau daftar Member gratis untuk isi otomatis checkout &amp; bonus +100 Poin.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="home-member-login-btn"
                  onClick={() => onOpenMemberAuth('login')}
                  className="text-xs font-semibold text-cyan-700 dark:text-teal-300 hover:underline whitespace-nowrap"
                >
                  Masuk
                </button>
                <span className="text-slate-300 dark:text-teal-900" aria-hidden="true">·</span>
                <button
                  type="button"
                  data-testid="home-member-register-btn"
                  onClick={() => onOpenMemberAuth('register')}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                >
                  Daftar Member
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Papan Pemberitahuan & Informasi Kendala untuk Pembeli (Editable oleh Penjual) */}
        <div
          data-testid="store-announcement-board"
          className={`lg:col-span-5 bg-white dark:bg-[#081E2C] border ${noticeMeta.cardAccent} rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-2xs`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Megaphone className="w-3.5 h-3.5 text-cyan-700 dark:text-teal-400" />
                    Papan Pemberitahuan Toko
                  </span>
                  <span
                    data-testid="announcement-level-badge"
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${noticeMeta.badgeClass}`}
                  >
                    <NoticeIcon className="w-3 h-3" />
                    {announcement.active ? noticeMeta.badgeLabel : 'Mode Senyap'}
                  </span>
                </div>
                <h2
                  data-testid="announcement-board-title"
                  className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug"
                >
                  {announcement.active
                    ? announcement.title
                    : 'Tidak ada kendala — seluruh transaksi berjalan normal'}
                </h2>
              </div>
              <NoticeIcon className={`w-4 h-4 shrink-0 mt-0.5 ${noticeMeta.iconColor}`} />
            </div>

            <p
              data-testid="announcement-board-message"
              className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
            >
              {announcement.active
                ? announcement.message
                : 'Semua layanan pembelian produk digital, verifikasi gateway lokal, dan unduhan otomatis beroperasi penuh 24 jam.'}
            </p>

            {announcement.active && announcement.estimatedResolution && (
              <div className="px-3 py-2 rounded-xl bg-[#F3FAFC] dark:bg-[#051621] border border-teal-200/70 dark:border-teal-900/70 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-cyan-900 dark:text-teal-200">
                  {announcement.estimatedResolution}
                </span>
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                  {new Date(announcement.updatedAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-teal-950">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Voucher aktif:</span>
              {activePromoList.map((pr) => {
                const isCopied = copiedVoucher === pr.code;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => handleCopyVoucher(pr.code)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-900 font-mono font-bold text-cyan-800 dark:text-teal-300 hover:border-teal-500 transition-colors"
                  >
                    <span>{isCopied ? 'Disalin!' : pr.code}</span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-70" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onOpenLiveChat}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-teal-300 hover:underline"
              >
                <Headphones className="w-3.5 h-3.5" />
                Hubungi CS
              </button>
              <button
                type="button"
                data-testid="manage-announcement-btn"
                onClick={onManageAnnouncement}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Atur Pemberitahuan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Elevated Terlaris Hari Ini Ranked Strip */}
      <section aria-label="Terlaris Hari Ini" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Terlaris Hari Ini
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBestSellers('left')}
              aria-label="Geser terlaris ke kiri"
              className="p-1.5 rounded-lg bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 text-slate-600 dark:text-slate-300 hover:border-teal-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBestSellers('right')}
              aria-label="Geser terlaris ke kanan"
              className="p-1.5 rounded-lg bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 text-slate-600 dark:text-slate-300 hover:border-teal-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={bestSellerScrollRef}
          className="flex items-stretch gap-3.5 overflow-x-auto pt-2.5 px-2 pb-1 -mx-2 scroll-smooth"
        >
          {bestSellers.map((prod, idx) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => onSelectProductForCheckout(prod, priceViewMode)}
              className="group relative flex items-center gap-3 min-w-[230px] sm:min-w-[255px] p-3.5 bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 hover:border-teal-500 dark:hover:border-teal-400 rounded-2xl text-left transition-all hover:-translate-y-0.5 shadow-2xs shrink-0"
            >
              <span
                className={`absolute -top-2 -left-1.5 w-6 h-6 rounded-full text-[10px] font-extrabold font-mono flex items-center justify-center shadow-xs ${
                  idx === 0
                    ? 'bg-gradient-to-r from-[#0284C7] to-[#10B981] text-white'
                    : 'bg-[#062442] dark:bg-teal-700 text-white'
                }`}
              >
                {idx + 1}
              </span>
              <BrandArtwork product={prod} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-cyan-700 dark:group-hover:text-teal-300">
                  {prod.title}
                </p>
                <p className="mt-0.5 text-xs font-extrabold font-mono tabular-nums text-cyan-700 dark:text-teal-300">
                  {formatIdr(priceViewMode === 'reseller' ? prod.resellerPriceIdr : prod.priceIdr)}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {prod.soldCount} terjual · Stok {prod.stock}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Elevated Kategori Premium Populer (Horizontal Brand Icon Cards) */}
      <section aria-label="Kategori Premium Populer" className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Kategori Premium Populer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilihan brand digital terlaris selama 30 hari terakhir
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('Semua');
              setSelectedType('Semua');
              setSearchInput('');
              setActiveSearch('');
            }}
            className="text-xs font-semibold text-cyan-700 dark:text-teal-300 hover:underline whitespace-nowrap shrink-0"
          >
            Lihat Semua
          </button>
        </div>

        <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1">
          {POPULAR_BRANDS.map((brand) => {
            const active = selectedBrand === brand.id;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => setSelectedBrand(brand.id)}
                aria-pressed={active}
                className={`flex flex-col items-center justify-center gap-2 min-w-[84px] sm:min-w-[94px] p-3 rounded-2xl border transition-all shrink-0 ${
                  active
                    ? 'bg-gradient-to-b from-sky-50 to-emerald-50 dark:from-sky-950/50 dark:to-emerald-950/50 border-teal-500 shadow-xs'
                    : 'bg-white dark:bg-[#081E2C] border-slate-200/90 dark:border-teal-950 hover:border-teal-400 dark:hover:border-teal-600'
                }`}
              >
                {brand.id === 'Semua' ? (
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-sky-950 dark:to-emerald-950 text-cyan-700 dark:text-teal-300 flex items-center justify-center shadow-xs"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </span>
                ) : (
                  <AppBrandLogo brand={brand.id} title={brand.label} size="sm" />
                )}
                <span
                  className={`text-[11px] font-semibold text-center whitespace-nowrap ${
                    active
                      ? 'text-cyan-800 dark:text-teal-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {brand.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Tipe Filter Tabs + Reguler/Reseller Toggle & Signature 4-Column Product Grid */}
      <section ref={catalogSectionRef} aria-label="Katalog Produk Digital" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {TYPE_TABS.map((tab) => {
              const active = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-gradient-to-r from-[#0369A1] to-[#059669] text-white border-transparent'
                      : 'bg-white dark:bg-[#081E2C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-950 hover:border-teal-400'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedType(selectedType === 'Favorit' ? 'Semua' : 'Favorit')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                selectedType === 'Favorit'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-[#081E2C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-teal-950 hover:border-rose-400'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Favorit ({favorites.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-0.5 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-xl">
              <button
                type="button"
                onClick={() => setPriceViewMode('reguler')}
                aria-pressed={priceViewMode === 'reguler'}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  priceViewMode === 'reguler'
                    ? 'bg-[#0369A1] text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Reguler
              </button>
              <button
                type="button"
                onClick={() => setPriceViewMode('reseller')}
                aria-pressed={priceViewMode === 'reseller'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  priceViewMode === 'reseller'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Crown className="w-3 h-3" />
                Reseller
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {filteredProducts.length} produk
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 rounded-2xl p-10 text-center space-y-2.5">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Produk tidak ditemukan
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coba pilih brand lain atau minta AI Assistant kami mencarikan produk sesuai kebutuhan Anda.
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('Semua');
                  setSelectedType('Semua');
                  setSearchInput('');
                  setActiveSearch('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={onOpenAIAssistant}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-cyan-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-xl"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tanya AI Assistant
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock <= 0;
              const isFav = favorites.includes(product.id);
              const displayedPrice =
                priceViewMode === 'reseller' ? product.resellerPriceIdr : product.priceIdr;

              return (
                <article
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="group bg-white dark:bg-[#081E2C] border border-slate-200/90 dark:border-teal-950 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-md hover:shadow-cyan-950/10"
                >
                  {/* Visual Stage with Favorite Heart + Diagonal Ocean-to-Emerald PROMO Ribbon */}
                  <div className="relative h-32 sm:h-36 bg-gradient-to-br from-[#EAF6FB] to-[#E5F7F2] dark:from-[#0A2537] dark:to-[#072128] border-b border-slate-200/70 dark:border-teal-950/80 flex items-center justify-center overflow-hidden p-3">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      aria-label={
                        isFav
                          ? `Hapus ${product.title} dari favorit`
                          : `Simpan ${product.title} ke favorit`
                      }
                      aria-pressed={isFav}
                      className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full bg-white/95 dark:bg-[#081E2C]/95 border border-slate-200/90 dark:border-teal-900 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-2xs"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                    </button>

                    {product.isPromo && !outOfStock && (
                      <span className="pointer-events-none absolute top-3 -right-7 z-10 w-24 py-0.5 bg-gradient-to-r from-[#0284C7] to-[#10B981] text-white text-[9px] font-extrabold uppercase tracking-wider text-center rotate-45 shadow-xs">
                        PROMO
                      </span>
                    )}

                    <div className="transition-transform duration-300 group-hover:scale-105">
                      <BrandArtwork product={product} size="md" />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5 text-[11px]">
                        <span
                          data-testid={`product-stock-${product.id}`}
                          className={`font-semibold font-mono tabular-nums ${
                            outOfStock
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          Stok: {product.stock}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-teal-300 truncate max-w-[115px]">
                          {product.category}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 min-h-[2.3rem]">
                        {product.title}
                      </h3>

                      <div className="pt-0.5 space-y-0.5">
                        {product.originalPriceIdr && product.originalPriceIdr > displayedPrice && (
                          <p className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 line-through">
                            {formatIdr(product.originalPriceIdr)}
                          </p>
                        )}
                        <p className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                          {formatIdr(displayedPrice)}
                        </p>
                        <p className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          <Crown className="w-3 h-3 shrink-0" />
                          {priceViewMode === 'reseller'
                            ? `Reguler: ${formatIdr(product.priceIdr)}`
                            : `Reseller: ${formatIdr(product.resellerPriceIdr)}`}
                        </p>
                      </div>
                    </div>

                    {/* Ocean-to-Emerald Gradient CTA ("Beli Sekarang" / "Stok Habis") */}
                    <div className="pt-1 flex items-center gap-1.5">
                      {outOfStock ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 rounded-xl cursor-not-allowed"
                        >
                          Stok Habis
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectProductForCheckout(product, priceViewMode)}
                            className="flex-1 py-2 px-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors whitespace-nowrap"
                          >
                            Beli Sekarang
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToCart(product)}
                            aria-label={`Tambah ${product.title} ke keranjang`}
                            className="p-2 text-cyan-800 dark:text-teal-300 bg-[#EAF6FB] dark:bg-[#051621] hover:bg-teal-100 dark:hover:bg-teal-950/70 rounded-xl transition-colors shrink-0"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. FAQ Pelanggan (Dikelola Admin secara Real-Time) */}
      <FaqSection
        faqs={faqs}
        onOpenLiveChat={onOpenLiveChat}
        onOpenAIAssistant={onOpenAIAssistant}
        onManageFaqs={onManageFaqs}
      />
    </div>
  );
};
