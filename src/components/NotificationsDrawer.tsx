import React from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import type { PushNotificationItem } from '../types';

interface NotificationsDrawerProps {
  open: boolean;
  notifications: PushNotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => Promise<void>;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  notifications,
  onClose,
  onMarkAllRead,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#04121C]/55"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#081E2C] border-l border-slate-200 dark:border-teal-950 h-full flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-teal-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-700 dark:text-teal-400" />
            <h2
              id="notifications-drawer-title"
              className="text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              Notifikasi Push Real-Time
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-md"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai Dibaca
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel notifikasi"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Belum ada notifikasi transaksi.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 space-y-1.5 ${
                  notif.read ? 'bg-white dark:bg-[#081E2C]' : 'bg-teal-50/50 dark:bg-teal-950/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-cyan-700 dark:text-teal-300">
                    Untuk {notif.recipientName}
                  </span>
                  <span className="font-mono tabular-nums">
                    {new Date(notif.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {notif.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
