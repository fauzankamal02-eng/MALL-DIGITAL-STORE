import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { DigitalProduct, PromoVoucher } from '../src/types';
import { formatIdr } from '../src/utils/commerce';

export interface AssistantTurnInput {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReplyResult {
  reply: string;
  recommendedProductIds: string[];
  model: string;
}

const MODEL_ID = 'gemini-4-hydrogen';

export function buildStoreCatalogContext(
  products: DigitalProduct[],
  promos: PromoVoucher[]
): string {
  const activeProducts = products.filter((p) => p.active);
  const catalogLines = activeProducts.map((p) => {
    const stockNote = p.stock > 0 ? `Stok ${p.stock}` : 'STOK HABIS';
    return `- [ID:${p.id}] ${p.title} | Brand: ${p.brand} | Kategori: ${p.category} | Reguler: ${formatIdr(p.priceIdr)} | Reseller: ${formatIdr(p.resellerPriceIdr)} | ${stockNote} | Terjual: ${p.soldCount} | Format: ${p.fileFormat} (${p.fileSizeMb} MB) | Keunggulan: ${p.highlights.join(', ')}`;
  });

  const activePromos = promos.filter((pr) => pr.active);
  const promoLines = activePromos.map((pr) => {
    const valueText =
      pr.discountType === 'percent' ? `${pr.discountValue}%` : formatIdr(pr.discountValue);
    return `- Kode ${pr.code}: Diskon ${valueText}, min. belanja ${formatIdr(pr.minPurchaseIdr)} (${pr.description})`;
  });

  return [
    'KATALOG PRODUK DIGITAL AKTIF (MALL DIGITAL STORE):',
    ...catalogLines,
    '',
    'VOUCHER PROMO AKTIF:',
    ...(promoLines.length > 0 ? promoLines : ['- Tidak ada voucher aktif saat ini']),
    '',
    'METODE PEMBAYARAN LOKAL (IDR):',
    '- QRIS Nasional (biaya Rp 1.500, instan), Virtual Account BCA/Mandiri/BNI/BRI (Rp 4.000), E-Wallet GoPay/OVO/DANA/ShopeePay (Rp 2.000), Cicilan 0% 3x & 6x.',
    '- Pengiriman: File digital & lisensi otomatis terunduh + salinan dikirim via email segera setelah pembayaran terverifikasi.',
    '- Poin Loyalitas: Dapat ditukar hingga 25% nilai produk saat checkout; setiap belanja Rp 10.000 mendapat +1 poin.',
  ].join('\n');
}

export function extractRecommendedProductIds(
  rawText: string,
  products: DigitalProduct[]
): { cleanText: string; recommendedProductIds: string[] } {
  const validIds = new Set(products.filter((p) => p.active && p.stock > 0).map((p) => p.id));
  const picked: string[] = [];

  const tagRegex = /\[\[PRODUCT:([a-zA-Z0-9_-]+)\]\]/g;
  let match: RegExpExecArray | null = tagRegex.exec(rawText);
  while (match !== null) {
    const id = match[1];
    if (validIds.has(id) && !picked.includes(id)) {
      picked.push(id);
    }
    match = tagRegex.exec(rawText);
  }

  const cleanText = rawText
    .replace(tagRegex, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (picked.length === 0) {
    const lower = cleanText.toLowerCase();
    for (const prod of products) {
      if (!prod.active || prod.stock <= 0) continue;
      const titleLower = prod.title.toLowerCase();
      const brandLower = prod.brand.toLowerCase();
      if (
        lower.includes(titleLower) ||
        (brandLower.length >= 4 && lower.includes(brandLower) && picked.length < 3)
      ) {
        if (!picked.includes(prod.id)) {
          picked.push(prod.id);
        }
      }
      if (picked.length >= 3) break;
    }
  }

  return {
    cleanText,
    recommendedProductIds: picked.slice(0, 3),
  };
}

export async function askMallDigitalAssistant(
  history: AssistantTurnInput[],
  products: DigitalProduct[],
  promos: PromoVoucher[]
): Promise<AssistantReplyResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum terkonfigurasi di server. Mohon tambahkan kunci API Gemini pada panel Secrets.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 20000,
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });

  const catalogContext = buildStoreCatalogContext(products, promos);
  const systemInstruction = [
    'Anda adalah AI Assistant resmi untuk "MALL DIGITAL STORE", toko produk digital, aplikasi premium, e-book, template, dan source code terpercaya di Indonesia.',
    'Gunakan bahasa Indonesia yang ramah, ringkas, profesional, dan langsung membantu.',
    'Selalu gunakan data harga Rupiah (IDR), stok, promo, dan metode pembayaran secara akurat berdasarkan data katalog di bawah ini. Jangan mengarang produk atau harga di luar katalog.',
    'Bantu pelanggan memilih produk sesuai anggaran/kebutuhan, jelaskan perbandingan harga Reguler vs Reseller, arahkan penggunaan voucher yang memenuhi syarat minimal belanja, dan jelaskan cara unduh otomatis pasca verifikasi pembayaran.',
    'Jika Anda merekomendasikan 1 hingga 3 produk yang stoknya tersedia, sertakan tag penanda persis seperti [[PRODUCT:id_produk]] di akhir jawaban Anda (maksimal 3 tag) agar aplikasi dapat menampilkan kartu beli cepat.',
    'Jangan menulis tabel Markdown yang panjang atau blok kode mentah; gunakan paragraf singkat atau daftar poin ringkas.',
    '',
    catalogContext,
  ].join('\n');

  const recentTurns = history.slice(-12);
  const contents = recentTurns.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.text }],
  }));

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents,
    config: {
      systemInstruction,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('AI Assistant tidak mengembalikan teks jawaban. Silakan coba kirim ulang pertanyaan Anda.');
  }

  const { cleanText, recommendedProductIds } = extractRecommendedProductIds(rawText, products);
  return {
    reply: cleanText,
    recommendedProductIds,
    model: MODEL_ID,
  };
}
