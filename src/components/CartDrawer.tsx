import React from 'react';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import type { DigitalProduct } from '../types';
import { formatIdr } from '../utils/commerce';
import { AppBrandLogo } from './AppBrandLogo';

interface CartDrawerProps {
  open: boolean;
  items: DigitalProduct[];
  onClose: () => void;
  onRemoveItem: (productId: string) => void;
  onCheckoutProduct: (product: DigitalProduct) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  onClose,
  onRemoveItem,
  onCheckoutProduct,
}) => {
  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.priceIdr, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#04121C]/55"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#081E2C] border-l border-slate-200 dark:border-teal-950 h-full flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-teal-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
            <h2 id="cart-drawer-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Keranjang Belanja ({items.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang belanja"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Keranjang Anda masih kosong
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih produk digital dari etalase untuk melanjutkan ke pembayaran lokal Indonesia.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <AppBrandLogo brand={item.brand} title={item.title} size="sm" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {item.fileFormat} · {item.fileSizeMb} MB
                    </p>
                    <p className="text-sm font-bold font-mono tabular-nums text-cyan-800 dark:text-teal-300">
                      {formatIdr(item.priceIdr)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Hapus ${item.title} dari keranjang`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCheckoutProduct(item);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-lg whitespace-nowrap"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Estimasi Subtotal</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {formatIdr(subtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const first = items[0];
                if (first) {
                  onClose();
                  onCheckoutProduct(first);
                }
              }}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl"
            >
              Lanjut Pembayaran Produk Pertama
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
