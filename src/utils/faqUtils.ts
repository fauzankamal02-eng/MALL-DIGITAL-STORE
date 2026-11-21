import type { FaqCategory, FaqItem } from '../types';

export const FAQ_CATEGORIES: FaqCategory[] = [
  'Pembayaran',
  'Pengiriman Otomatis',
  'Akun & Garansi',
  'Top Up & Tagihan',
  'Reseller & Promo',
];

export interface FaqValidationResult {
  valid: boolean;
  error?: string;
  cleaned?: {
    question: string;
    answer: string;
    category: FaqCategory;
    active: boolean;
  };
}

export function validateFaqInput(input: {
  question?: unknown;
  answer?: unknown;
  category?: unknown;
  active?: unknown;
}): FaqValidationResult {
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const answer = typeof input.answer === 'string' ? input.answer.trim() : '';
  const rawCategory = typeof input.category === 'string' ? input.category.trim() : '';
  const category = FAQ_CATEGORIES.includes(rawCategory as FaqCategory)
    ? (rawCategory as FaqCategory)
    : null;

  if (question.length < 8 || question.length > 240) {
    return {
      valid: false,
      error: 'Pertanyaan FAQ minimal 8 karakter dan maksimal 240 karakter.',
    };
  }
  if (answer.length < 12 || answer.length > 1600) {
    return {
      valid: false,
      error: 'Jawaban FAQ minimal 12 karakter dan maksimal 1.600 karakter.',
    };
  }
  if (!category) {
    return {
      valid: false,
      error: 'Pilih kategori FAQ yang valid.',
    };
  }

  return {
    valid: true,
    cleaned: {
      question,
      answer,
      category,
      active: input.active !== false,
    },
  };
}

export function filterPublicFaqs(
  faqs: FaqItem[],
  category: 'Semua' | FaqCategory = 'Semua',
  query = ''
): FaqItem[] {
  const q = query.trim().toLowerCase();
  return [...faqs]
    .filter((item) => item.active)
    .filter((item) => (category === 'Semua' ? true : item.category === category))
    .filter((item) => {
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}
