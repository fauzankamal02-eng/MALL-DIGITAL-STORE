import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  Bell,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGooglePopup,
  signOutFirebase,
  testFirestoreConnection,
} from './firebase';
import type {
  ActivityLog,
  AutomatedEmailLog,
  AutomationSettings,
  BootstrapPayload,
  CloudBackupRecord,
  DigitalProduct,
  FaqCategory,
  FaqItem,
  IndonesianBankCode,
  MemberProfile,
  OrderRecord,
  PaymentMethodCode,
  PayoutRecord,
  ProductCategory,
  PromoVoucher,
  PushNotificationItem,
  SecurityProfile,
  StoreAnnouncement,
  StoreAnnouncementLevel,
  SupportMessage,
  VaultProductSummary,
} from './types';
import { StorefrontView } from './components/StorefrontView';
import { OrdersView } from './components/OrdersView';
import { SellerDashboardView } from './components/SellerDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SecurityView } from './components/SecurityView';
import { CheckoutModal } from './components/CheckoutModal';
import { LiveChatDrawer } from './components/LiveChatDrawer';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { CartDrawer } from './components/CartDrawer';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { MemberAuthModal } from './components/MemberAuthModal';

type NavTab = 'etalase' | 'pesanan' | 'penjual' | 'admin' | 'keamanan';

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'etalase', label: 'Beranda', icon: Home },
  { id: 'pesanan', label: 'Pesanan', icon: PackageSearch },
  { id: 'penjual', label: 'Penjual', icon: Store },
  { id: 'admin', label: 'Admin', icon: LayoutDashboard },
  { id: 'keamanan', label: 'Keamanan', icon: ShieldCheck },
];

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const { headers, ...rest } = init ?? {};
  const response = await fetch(url, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Permintaan gagal (${response.status})`);
  }
  return data as T;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('etalase');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('malldigital_theme') === 'dark';
  });
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [promos, setPromos] = useState<PromoVoucher[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [emails, setEmails] = useState<AutomatedEmailLog[]>([]);
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [backups, setBackups] = useState<CloudBackupRecord[]>([]);
  const [backupSchedule, setBackupSchedule] = useState<'daily' | 'weekly'>('daily');
  const [security, setSecurity] = useState<SecurityProfile>({
    mfaEnabled: false,
    mfaSetupPending: false,
    mfaSecretMasked: null,
    mfaOtpAuthUri: null,
    mfaVerifiedAt: null,
    biometricEnabled: false,
    biometricDevices: [],
    loyaltyPoints: 450,
  });
  const [announcement, setAnnouncement] = useState<StoreAnnouncement>({
    active: true,
    level: 'normal',
    title: 'Semua Layanan Digital Aktif & Normal 24 Jam',
    message:
      'Seluruh katalog Aplikasi Premium, E-Book, Template & Source Code, pembayaran lokal, dan unduhan otomatis berjalan lancar tanpa kendala.',
    estimatedResolution: 'Respon CS rata-rata < 5 menit',
    showTopBanner: false,
    updatedAt: new Date().toISOString(),
  });
  const [sellerFocusSection, setSellerFocusSection] = useState<
    'analytics' | 'inventory' | 'payouts' | 'promos' | 'announcement' | 'automation'
  >('analytics');
  const [automation, setAutomation] = useState<AutomationSettings>({
    autoFulfillEnabled: true,
    autoSandboxVerify: true,
    sandboxDelaySeconds: 3,
    autoDownloadOnPaid: true,
    autoEmailOnPaid: true,
    webhookEndpointPath: '/api/webhooks/payment',
    integrations: {
      paymentGatewayConfigured: false,
      webhookSecretConfigured: false,
      supplierApiConfigured: false,
      emailServiceConfigured: false,
    },
  });
  const [vaultSummaries, setVaultSummaries] = useState<VaultProductSummary[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [adminFocusSection, setAdminFocusSection] = useState<'overview' | 'faq'>('overview');

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [memberAuthModal, setMemberAuthModal] = useState<{
    open: boolean;
    mode: 'login' | 'register';
    contextMessage?: string;
  }>({ open: false, mode: 'login' });

  const [cart, setCart] = useState<DigitalProduct[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<DigitalProduct | null>(null);
  const [checkoutTier, setCheckoutTier] = useState<'reguler' | 'reseller'>('reguler');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatOrderRef, setChatOrderRef] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<PushNotificationItem | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<{
    uid: string;
    displayName: string | null;
    email: string | null;
  } | null>(null);

  const [browserPushPermission, setBrowserPushPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });

  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      window.localStorage.setItem('malldigital_theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('malldigital_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  useEffect(() => {
    void testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        });
        if (user.email) {
          try {
            const idToken = await user.getIdToken();
            const synced = await apiJson<{
              member: MemberProfile;
              token: string;
              isNewMember: boolean;
            }>('/api/members/sync-google', {
              method: 'POST',
              headers: { Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({
                displayName: user.displayName || 'Member MALL DIGITAL STORE',
              }),
            });
            setMember(synced.member);
            setMemberToken(synced.token);
          } catch {
            // Keep Firebase session active even if backend sync is temporarily unavailable
          }
        }
        if (user.emailVerified && user.email) {
          try {
            await setDoc(
              doc(db, 'users', user.uid),
              {
                uid: user.uid,
                displayName: (user.displayName || 'Pelanggan MALL DIGITAL STORE').slice(0, 100),
                email: user.email.slice(0, 160),
                role: 'customer',
                loyaltyPoints: 450,
                mfaEnabled: false,
                biometricEnabled: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (err) {
            if (err instanceof Error && !err.message.includes('Missing or insufficient permissions')) {
              console.warn('Firestore profile sync note:', err.message);
            }
          }
        }
      } else {
        setFirebaseUser(null);
      }
    });
    return () => unsub();
  }, []);

  const showToastNotification = useCallback((item: PushNotificationItem) => {
    setLiveToast(item);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setLiveToast(null);
    }, 5500);

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(item.title, { body: item.message });
      } catch {
        // Ignore browser notification errors inside sandboxed iframes
      }
    }
  }, []);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiJson<BootstrapPayload>('/api/bootstrap');
      setProducts(data.products);
      setOrders(data.orders);
      setPromos(data.promos);
      setPayouts(data.payouts);
      setEmails(data.emails);
      setNotifications(data.notifications);
      setMessages(data.messages);
      setActivityLogs(data.activityLogs);
      setBackups(data.backups);
      setBackupSchedule(data.backupSchedule);
      setSecurity(data.security);
      if (data.announcement) {
        setAnnouncement(data.announcement);
      }
      if (data.automation) {
        setAutomation(data.automation);
      }
      if (data.vaultSummaries) {
        setVaultSummaries(data.vaultSummaries);
      }
      if (data.faqs) {
        setFaqs(data.faqs);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data aplikasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data) as { event: string; payload: unknown };
          switch (packet.event) {
            case 'product:created': {
              const p = packet.payload as DigitalProduct;
              setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
              break;
            }
            case 'product:updated': {
              const p = packet.payload as DigitalProduct;
              setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
              break;
            }
            case 'order:created': {
              const o = packet.payload as OrderRecord;
              setOrders((prev) => (prev.some((x) => x.id === o.id) ? prev : [o, ...prev]));
              break;
            }
            case 'order:verified': {
              const { order, email, loyaltyPoints } = packet.payload as {
                order: OrderRecord;
                email: AutomatedEmailLog;
                loyaltyPoints: number;
              };
              setOrders((prev) =>
                prev.some((x) => x.id === order.id)
                  ? prev.map((x) => (x.id === order.id ? order : x))
                  : [order, ...prev]
              );
              setEmails((prev) => (prev.some((x) => x.id === email.id) ? prev : [email, ...prev]));
              setSecurity((prev) => ({ ...prev, loyaltyPoints }));
              break;
            }
            case 'order:downloaded': {
              const { orderId, downloadCount } = packet.payload as {
                orderId: string;
                downloadCount: number;
              };
              setOrders((prev) =>
                prev.map((x) => (x.id === orderId ? { ...x, downloadCount } : x))
              );
              break;
            }
            case 'payout:created': {
              const po = packet.payload as PayoutRecord;
              setPayouts((prev) => (prev.some((x) => x.id === po.id) ? prev : [po, ...prev]));
              break;
            }
            case 'promo:created': {
              const pr = packet.payload as PromoVoucher;
              setPromos((prev) => (prev.some((x) => x.id === pr.id) ? prev : [pr, ...prev]));
              break;
            }
            case 'promo:updated': {
              const pr = packet.payload as PromoVoucher;
              setPromos((prev) => prev.map((x) => (x.id === pr.id ? pr : x)));
              break;
            }
            case 'chat:message': {
              const msg = packet.payload as SupportMessage;
              setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
              break;
            }
            case 'backup:created': {
              const bkp = packet.payload as CloudBackupRecord;
              setBackups((prev) => (prev.some((x) => x.id === bkp.id) ? prev : [bkp, ...prev]));
              break;
            }
            case 'backup:verified': {
              const bkp = packet.payload as CloudBackupRecord;
              setBackups((prev) => prev.map((x) => (x.id === bkp.id ? bkp : x)));
              break;
            }
            case 'backup:schedule': {
              const { backupSchedule: next } = packet.payload as {
                backupSchedule: 'daily' | 'weekly';
              };
              setBackupSchedule(next);
              break;
            }
            case 'activity:logged': {
              const log = packet.payload as ActivityLog;
              setActivityLogs((prev) => (prev.some((x) => x.id === log.id) ? prev : [log, ...prev]));
              break;
            }
            case 'notification:push': {
              const notif = packet.payload as PushNotificationItem;
              setNotifications((prev) =>
                prev.some((x) => x.id === notif.id) ? prev : [notif, ...prev]
              );
              showToastNotification(notif);
              break;
            }
            case 'announcement:updated': {
              const nextAnn = packet.payload as StoreAnnouncement;
              setAnnouncement(nextAnn);
              if (nextAnn.active && nextAnn.showTopBanner) {
                setShowAnnouncement(true);
              }
              break;
            }
            case 'automation:updated': {
              const nextAuto = packet.payload as AutomationSettings;
              setAutomation(nextAuto);
              break;
            }
            case 'vault:updated': {
              const nextVaults = packet.payload as VaultProductSummary[];
              setVaultSummaries(nextVaults);
              break;
            }
            case 'faq:created': {
              const createdFaq = packet.payload as FaqItem;
              setFaqs((prev) =>
                prev.some((item) => item.id === createdFaq.id) ? prev : [...prev, createdFaq]
              );
              break;
            }
            case 'faq:updated': {
              const updatedFaq = packet.payload as FaqItem;
              setFaqs((prev) =>
                prev.map((item) => (item.id === updatedFaq.id ? updatedFaq : item))
              );
              break;
            }
            case 'faq:deleted': {
              const { id: deletedFaqId } = packet.payload as { id: string };
              setFaqs((prev) => prev.filter((item) => item.id !== deletedFaqId));
              break;
            }
          }
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = () => {
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [showToastNotification]);

  const handleAddToCart = (product: DigitalProduct) => {
    setCart((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
    setCartOpen(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleCreateOrder = async (input: {
    productId: string;
    buyerName: string;
    buyerEmail: string;
    paymentMethod: PaymentMethodCode;
    promoCode: string;
    loyaltyPointsToUse: number;
    pricingTier: 'reguler' | 'reseller';
  }) => {
    const res = await apiJson<{ order: OrderRecord; loyaltyPoints: number }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        buyerId: member?.id || firebaseUser?.uid || 'user-demo-01',
      }),
    });
    setOrders((prev) => (prev.some((o) => o.id === res.order.id) ? prev : [res.order, ...prev]));
    setSecurity((prev) => ({ ...prev, loyaltyPoints: res.loyaltyPoints }));
    setCart((prev) => prev.filter((item) => item.id !== input.productId));
    return res.order;
  };

  const handleVerifyPayment = async (orderId: string) => {
    const res = await apiJson<{
      order: OrderRecord;
      product: DigitalProduct;
      email: AutomatedEmailLog;
      loyaltyPoints: number;
      downloadUrl: string;
    }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
    setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
    if (res.product) {
      setProducts((prev) => prev.map((p) => (p.id === res.product.id ? res.product : p)));
    }
    if (res.email) {
      setEmails((prev) => (prev.some((e) => e.id === res.email.id) ? prev : [res.email, ...prev]));
    }
    setSecurity((prev) => ({ ...prev, loyaltyPoints: res.loyaltyPoints }));
    return { order: res.order, downloadUrl: res.downloadUrl };
  };

  const handleCreateProduct = async (input: {
    title: string;
    brand?: string;
    category: ProductCategory;
    description: string;
    priceIdr: number;
    resellerPriceIdr?: number;
    stock: number;
    fileName: string;
    fileFormat: string;
    fileSizeMb: number;
    version: string;
  }) => {
    const created = await apiJson<DigitalProduct>('/api/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setProducts((prev) => (prev.some((p) => p.id === created.id) ? prev : [created, ...prev]));
  };

  const handleUpdateProduct = async (
    id: string,
    patch: { stock?: number; priceIdr?: number; active?: boolean }
  ) => {
    const updated = await apiJson<DigitalProduct>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleRequestPayout = async (input: {
    bankCode: IndonesianBankCode;
    accountNumber: string;
    accountHolder: string;
    amountIdr: number;
  }) => {
    const created = await apiJson<PayoutRecord>('/api/payouts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setPayouts((prev) => (prev.some((p) => p.id === created.id) ? prev : [created, ...prev]));
  };

  const handleCreatePromo = async (input: {
    code: string;
    description: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minPurchaseIdr: number;
    maxUsage: number;
  }) => {
    const created = await apiJson<PromoVoucher>('/api/promos', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setPromos((prev) => (prev.some((p) => p.id === created.id) ? prev : [created, ...prev]));
  };

  const handleTogglePromo = async (id: string, active: boolean) => {
    const updated = await apiJson<PromoVoucher>(`/api/promos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleUpdateAnnouncement = async (input: {
    active: boolean;
    level: StoreAnnouncementLevel;
    title: string;
    message: string;
    estimatedResolution: string;
    showTopBanner: boolean;
  }) => {
    const updated = await apiJson<StoreAnnouncement>('/api/announcement', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    setAnnouncement(updated);
    if (updated.active && updated.showTopBanner) {
      setShowAnnouncement(true);
    }
  };

  const handleUpdateAutomation = async (input: {
    autoFulfillEnabled: boolean;
    autoSandboxVerify: boolean;
    sandboxDelaySeconds: number;
    autoDownloadOnPaid: boolean;
    autoEmailOnPaid: boolean;
  }) => {
    const updated = await apiJson<AutomationSettings>('/api/automation/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    setAutomation(updated);
  };

  const handleAddVaultStock = async (productId: string, rawLines: string) => {
    const res = await apiJson<{
      addedCount: number;
      product: DigitalProduct;
      vaultSummaries: VaultProductSummary[];
    }>('/api/automation/vault', {
      method: 'POST',
      body: JSON.stringify({ productId, rawLines }),
    });
    setProducts((prev) => prev.map((p) => (p.id === res.product.id ? res.product : p)));
    setVaultSummaries(res.vaultSummaries);
    return { addedCount: res.addedCount };
  };

  const handleTestWebhook = async () => {
    return apiJson<{
      ok: boolean;
      signatureVerified: boolean;
      fulfilledOrderCode: string | null;
      message: string;
    }>('/api/automation/test-webhook', {
      method: 'POST',
    });
  };

  const handleCreateFaq = async (input: {
    category: FaqCategory;
    question: string;
    answer: string;
    active: boolean;
  }) => {
    const created = await apiJson<FaqItem>('/api/faqs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setFaqs((prev) => (prev.some((item) => item.id === created.id) ? prev : [...prev, created]));
  };

  const handleUpdateFaq = async (
    id: string,
    patch: {
      category?: FaqCategory;
      question?: string;
      answer?: string;
      active?: boolean;
    }
  ) => {
    const updated = await apiJson<FaqItem>(`/api/faqs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setFaqs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteFaq = async (id: string) => {
    await apiJson<{ deleted: boolean; id: string }>(`/api/faqs/${id}`, {
      method: 'DELETE',
    });
    setFaqs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSendMessage = async (input: {
    text: string;
    senderName: string;
    senderRole: 'customer' | 'support';
    orderRef?: string;
  }) => {
    const msg = await apiJson<SupportMessage>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        senderId: firebaseUser?.uid || 'user-demo-01',
      }),
    });
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const handleTriggerBackup = async () => {
    const created = await apiJson<CloudBackupRecord>('/api/backups', {
      method: 'POST',
      body: JSON.stringify({ mode: 'manual' }),
    });
    setBackups((prev) => (prev.some((b) => b.id === created.id) ? prev : [created, ...prev]));
  };

  const handleChangeBackupSchedule = async (schedule: 'daily' | 'weekly') => {
    const res = await apiJson<{ backupSchedule: 'daily' | 'weekly' }>('/api/backups/schedule', {
      method: 'PATCH',
      body: JSON.stringify({ schedule }),
    });
    setBackupSchedule(res.backupSchedule);
  };

  const handleVerifyBackup = async (id: string) => {
    const res = await apiJson<{
      verified: boolean;
      backup: CloudBackupRecord;
      summary: { exportedAt: string; productsCount: number; ordersCount: number };
    }>(`/api/backups/${id}/verify`, { method: 'POST' });
    setBackups((prev) => prev.map((b) => (b.id === res.backup.id ? res.backup : b)));
    return res;
  };

  const handleSetupMfa = async () => {
    const res = await apiJson<{
      security: SecurityProfile;
      secretForEnrollment: string;
      otpAuthUri: string;
      currentCodePreview: string;
    }>('/api/auth/mfa/setup', {
      method: 'POST',
      body: JSON.stringify({ email: firebaseUser?.email || 'fauzankamal02@gmail.com' }),
    });
    setSecurity(res.security);
    return {
      secretForEnrollment: res.secretForEnrollment,
      otpAuthUri: res.otpAuthUri,
      currentCodePreview: res.currentCodePreview,
    };
  };

  const handleVerifyMfa = async (code: string) => {
    const res = await apiJson<{ verified: boolean; security: SecurityProfile }>(
      '/api/auth/mfa/verify',
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      }
    );
    setSecurity(res.security);
  };

  const handleDisableMfa = async () => {
    const res = await apiJson<{ security: SecurityProfile }>('/api/auth/mfa/disable', {
      method: 'POST',
    });
    setSecurity(res.security);
  };

  const handleRegisterBiometric = async (deviceLabel: string) => {
    const { challenge } = await apiJson<{ challenge: string }>('/api/auth/webauthn/challenge', {
      method: 'POST',
    });

    let credentialId = '';
    if (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
      navigator.credentials &&
      typeof navigator.credentials.create === 'function'
    ) {
      try {
        const hasPlatformAuth =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (hasPlatformAuth) {
          const controller = new AbortController();
          const abortTimer = window.setTimeout(() => controller.abort(), 3000);
          try {
            const challengeBytes = Uint8Array.from(challenge, (c) => c.charCodeAt(0));
            const userIdBytes = Uint8Array.from(firebaseUser?.uid || 'malldigital-user', (c) =>
              c.charCodeAt(0)
            );
            const cred = (await navigator.credentials.create({
              signal: controller.signal,
              publicKey: {
                challenge: challengeBytes,
                rp: { name: 'MALL DIGITAL STORE', id: window.location.hostname },
                user: {
                  id: userIdBytes,
                  name: firebaseUser?.email || 'pelanggan@malldigitalstore.id',
                  displayName: firebaseUser?.displayName || 'Pelanggan MALL DIGITAL STORE',
                },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                authenticatorSelection: {
                  authenticatorAttachment: 'platform',
                  userVerification: 'preferred',
                },
                timeout: 3000,
              },
            })) as PublicKeyCredential | null;
            if (cred?.id) {
              credentialId = cred.id;
            }
          } finally {
            window.clearTimeout(abortTimer);
          }
        }
      } catch {
        // Fallback cleanly to server-verified passkey challenge registration when hardware sensor is unavailable
      }
    }

    const res = await apiJson<{ registered: boolean; security: SecurityProfile }>(
      '/api/auth/webauthn/register',
      {
        method: 'POST',
        body: JSON.stringify({ challenge, deviceLabel, credentialId }),
      }
    );
    setSecurity(res.security);
  };

  const handleVerifyBiometric = async (deviceId: string) => {
    const { challenge } = await apiJson<{ challenge: string }>('/api/auth/webauthn/challenge', {
      method: 'POST',
    });
    const res = await apiJson<{ verified: boolean; security: SecurityProfile }>(
      '/api/auth/webauthn/verify',
      {
        method: 'POST',
        body: JSON.stringify({ challenge, deviceId }),
      }
    );
    setSecurity(res.security);
  };

  const handleMarkNotificationsRead = async () => {
    await apiJson('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleRequestBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPushPermission('unsupported');
      return;
    }
    const perm = await window.Notification.requestPermission();
    setBrowserPushPermission(perm);
  };

  const handleSignInGoogle = async () => {
    try {
      await signInWithGooglePopup();
    } catch (err) {
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      }
      throw err;
    }
  };

  const handleMemberRegister = async (input: {
    displayName: string;
    email: string;
    phone: string;
    password: string;
    tier: 'reguler' | 'reseller';
  }) => {
    const res = await apiJson<{ member: MemberProfile; token: string }>('/api/members/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setMember(res.member);
    setMemberToken(res.token);
  };

  const handleMemberLogin = async (input: { email: string; password: string }) => {
    const res = await apiJson<{ member: MemberProfile; token: string }>('/api/members/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setMember(res.member);
    setMemberToken(res.token);
  };

  const handleMemberLogout = async () => {
    if (memberToken) {
      await apiJson('/api/members/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${memberToken}` },
      }).catch(() => {});
    }
    if (firebaseUser) {
      await signOutFirebase().catch(() => {});
    }
    setMember(null);
    setMemberToken(null);
  };

  const openMemberAuth = (mode: 'login' | 'register' = 'login', contextMessage?: string) => {
    setMemberAuthModal({ open: true, mode, contextMessage });
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const useCustomTopNotice = announcement.active && announcement.showTopBanner;
  const topBarClass = useCustomTopNotice
    ? announcement.level === 'maintenance'
      ? 'bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700 text-rose-50 border-b border-rose-700/70'
      : announcement.level === 'warning'
        ? 'bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700 text-amber-50 border-b border-amber-700/70'
        : 'bg-gradient-to-r from-[#062442] via-[#0369A1] to-[#059669] text-cyan-50 border-b border-teal-800/70'
    : 'bg-gradient-to-r from-[#062442] via-[#074B66] to-[#065F46] text-cyan-50 border-b border-teal-900/70';

  return (
    <div className="min-h-screen bg-[#F3FAFC] dark:bg-[#04121C] text-slate-900 dark:text-slate-100 transition-colors pb-16 md:pb-0">
      {/* Slim Dismissible Top Announcement Bar (Ocean Blue to Emerald Green or Live Incident Notice) */}
      {showAnnouncement && (
        <div className={topBarClass} data-testid="top-announcement-bar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-[#041D28] font-extrabold text-[10px] tracking-wider uppercase shrink-0">
                {useCustomTopNotice
                  ? announcement.level === 'maintenance'
                    ? 'GANGGUAN'
                    : announcement.level === 'warning'
                      ? 'KENDALA'
                      : 'INFO'
                  : 'BARU'}
              </span>
              <p className="truncate font-medium">
                {useCustomTopNotice
                  ? `${announcement.title} — ${announcement.message}`
                  : 'MALL DIGITAL STORE · UNDUHAN OTOMATIS 24 JAM · KINI DILENGKAPI AI ASSISTANT PINTAR & VOUCHER HEMAT15'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              aria-label="Tutup bilah pengumuman"
              className="text-cyan-200 hover:text-white p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clean Single-Row 3-Zone Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#061A29]/95 backdrop-blur-sm border-b border-slate-200/90 dark:border-teal-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('etalase')}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-extrabold tracking-tight text-[#062442] dark:text-slate-50 whitespace-nowrap shrink-0"
          >
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0284C7] via-[#0891B2] to-[#059669] text-white flex items-center justify-center text-xs font-black tracking-tight shadow-xs"
            >
              MD
            </span>
            <span>MALL DIGITAL STORE</span>
          </button>

          {/* Zone 2: Desktop 5-Link Navigation */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isCurrent = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => {
                    if (item.id === 'admin') setAdminFocusSection('overview');
                    setActiveTab(item.id);
                  }}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isCurrent
                      ? 'text-cyan-700 dark:text-teal-300 border-teal-600 dark:border-teal-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-cyan-800 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action (Cart) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Buka keranjang belanja (${cart.length} item)`}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-200" />
              <span className="font-mono tabular-nums">
                Keranjang{cart.length > 0 ? ` (${cart.length})` : ''}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        {/* Compact Utility Bar (Currency, Member Login/Account, AI Assistant, Notifications, Dark Mode) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Mata uang <span className="font-mono font-bold text-cyan-800 dark:text-teal-200">IDR (Rp)</span>
            <span aria-hidden="true"> · </span>
            <span>
              {member
                ? `Member ${member.memberCode}: ${member.displayName}`
                : firebaseUser
                  ? `Akun: ${firebaseUser.displayName || firebaseUser.email}`
                  : 'MALL DIGITAL STORE · Produk Digital & Aplikasi Premium'}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {member ? (
              <div
                data-testid="utility-member-badge"
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-xs font-semibold text-cyan-900 dark:text-teal-200 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/60 dark:to-emerald-950/60 border border-teal-200 dark:border-teal-800/80 rounded-xl whitespace-nowrap shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="max-w-[140px] truncate">{member.displayName}</span>
                <span className="font-mono text-[10px] text-cyan-700 dark:text-teal-300">
                  ({member.memberCode})
                </span>
                <button
                  type="button"
                  data-testid="utility-member-logout-btn"
                  onClick={() => void handleMemberLogout()}
                  aria-label="Keluar dari akun member"
                  title="Keluar Member"
                  className="ml-0.5 p-1 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-white/70 dark:hover:bg-[#081E2C] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openMemberAuth('login')}
                data-testid="utility-member-login-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] hover:from-[#075985] hover:to-[#047857] rounded-xl whitespace-nowrap shrink-0 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk / Member</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAiOpen(true)}
              data-testid="utility-ai-assistant-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-900 dark:text-teal-200 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/60 dark:to-emerald-950/60 border border-teal-200 dark:border-teal-800/80 hover:border-teal-400 rounded-xl whitespace-nowrap shrink-0 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>AI Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label={`Buka notifikasi (${unreadNotifCount} belum dibaca)`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 hover:border-teal-400 rounded-xl whitespace-nowrap shrink-0 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-cyan-700 dark:text-teal-400" />
              <span>Notifikasi</span>
              {unreadNotifCount > 0 && (
                <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  ({unreadNotifCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              aria-pressed={darkMode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950 hover:border-teal-400 rounded-xl whitespace-nowrap shrink-0 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-cyan-800" />
              )}
              <span>{darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
            </button>
          </div>
        </div>

        {/* Loading / Error / Active View */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 py-6" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-teal-100/50 dark:bg-[#081E2C] border border-slate-200 dark:border-teal-950"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-white dark:bg-[#081E2C] border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center space-y-3">
            <p className="text-base font-semibold text-rose-700 dark:text-rose-400">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadBootstrap()}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0369A1] to-[#059669] rounded-xl"
            >
              Coba Muat Ulang
            </button>
          </div>
        ) : (
          <div key={activeTab} data-testid="tab-transition-stage" className="tab-fade-in">
            {activeTab === 'etalase' && (
              <StorefrontView
                products={products}
                promos={promos}
                faqs={faqs}
                member={member}
                loyaltyPoints={member?.loyaltyPoints ?? security.loyaltyPoints}
                announcement={announcement}
                onSelectProductForCheckout={(product, tier = 'reguler') => {
                  setCheckoutTier(member?.tier === 'reseller' ? 'reseller' : tier);
                  setCheckoutProduct(product);
                }}
                onAddToCart={handleAddToCart}
                onNavigateOrders={() => setActiveTab('pesanan')}
                onNavigateSeller={() => {
                  setSellerFocusSection('analytics');
                  setActiveTab('penjual');
                }}
                onManageAnnouncement={() => {
                  setSellerFocusSection('announcement');
                  setActiveTab('penjual');
                }}
                onManageFaqs={() => {
                  setAdminFocusSection('faq');
                  setActiveTab('admin');
                }}
                onOpenMemberAuth={openMemberAuth}
                onOpenLiveChat={() => {
                  setChatOrderRef('');
                  setChatOpen(true);
                }}
                onOpenAIAssistant={() => setAiOpen(true)}
              />
            )}

            {activeTab === 'pesanan' && (
              <OrdersView
                orders={orders}
                emails={emails}
                onVerifyPendingOrder={async (orderId) => {
                  await handleVerifyPayment(orderId);
                }}
                onOpenChatWithOrder={(code) => {
                  setChatOrderRef(code);
                  setChatOpen(true);
                }}
              />
            )}

            {activeTab === 'penjual' && (
              <SellerDashboardView
                products={products}
                orders={orders}
                payouts={payouts}
                promos={promos}
                announcement={announcement}
                automation={automation}
                vaultSummaries={vaultSummaries}
                initialSection={sellerFocusSection}
                darkMode={darkMode}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onRequestPayout={handleRequestPayout}
                onCreatePromo={handleCreatePromo}
                onTogglePromo={handleTogglePromo}
                onUpdateAnnouncement={handleUpdateAnnouncement}
                onUpdateAutomation={handleUpdateAutomation}
                onAddVaultStock={handleAddVaultStock}
                onTestWebhook={handleTestWebhook}
              />
            )}

            {activeTab === 'admin' && (
              <AdminDashboardView
                orders={orders}
                payouts={payouts}
                products={products}
                faqs={faqs}
                activityLogs={activityLogs}
                backups={backups}
                backupSchedule={backupSchedule}
                initialSection={adminFocusSection}
                darkMode={darkMode}
                onTriggerBackup={handleTriggerBackup}
                onChangeBackupSchedule={handleChangeBackupSchedule}
                onVerifyBackup={handleVerifyBackup}
                onCreateFaq={handleCreateFaq}
                onUpdateFaq={handleUpdateFaq}
                onDeleteFaq={handleDeleteFaq}
              />
            )}

            {activeTab === 'keamanan' && (
              <SecurityView
                security={security}
                firebaseUser={firebaseUser}
                browserPushPermission={browserPushPermission}
                onSignInGoogle={handleSignInGoogle}
                onSignOut={handleMemberLogout}
                onSetupMfa={handleSetupMfa}
                onVerifyMfa={handleVerifyMfa}
                onDisableMfa={handleDisableMfa}
                onRegisterBiometric={handleRegisterBiometric}
                onVerifyBiometric={handleVerifyBiometric}
                onRequestBrowserPush={handleRequestBrowserPush}
              />
            )}
          </div>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="mt-12 border-t border-slate-200/90 dark:border-teal-950 bg-white dark:bg-[#061A29]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 MALL DIGITAL STORE · Toko Produk Digital, Aplikasi Premium &amp; AI Assistant</p>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('etalase')}
              className="hover:text-cyan-700 dark:hover:text-teal-300"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pesanan')}
              className="hover:text-cyan-700 dark:hover:text-teal-300"
            >
              Riwayat Pesanan
            </button>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="hover:text-cyan-700 dark:hover:text-emerald-300"
            >
              AI Assistant
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('keamanan')}
              className="hover:text-cyan-700 dark:hover:text-teal-300"
            >
              MFA &amp; Biometrik
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('etalase');
                window.setTimeout(() => {
                  document.getElementById('faq-beranda')?.scrollIntoView({ behavior: 'smooth' });
                }, 60);
              }}
              className="hover:text-cyan-700 dark:hover:text-teal-300"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="hover:text-cyan-700 dark:hover:text-teal-300"
            >
              Bantuan CS
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Compact Ocean-to-Emerald Action Dock: Live CS + AI Assistant (Desktop) */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setChatOrderRef('');
            setChatOpen(true);
          }}
          aria-label="Buka Chat Dukungan Langsung"
          title="Live Chat CS"
          className="w-11 h-11 rounded-2xl bg-white dark:bg-[#081E2C] border border-slate-200 dark:border-teal-900 text-cyan-800 dark:text-teal-300 shadow-lg hover:border-teal-500 flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          aria-label="Buka AI Assistant MALL DIGITAL STORE"
          data-testid="floating-ai-assistant-btn"
          className="h-11 px-4 rounded-2xl bg-gradient-to-r from-[#062442] via-[#0369A1] to-[#059669] hover:from-[#07335C] hover:to-[#047857] text-white shadow-lg shadow-cyan-950/30 flex items-center gap-2 text-xs font-semibold transition-transform hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Bawah Seluler"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#061A29]/95 backdrop-blur-sm border-t border-slate-200 dark:border-teal-950 px-2 py-1"
      >
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => {
                  if (item.id === 'admin') setAdminFocusSection('overview');
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-[10px] font-semibold transition-colors ${
                  isCurrent
                    ? 'text-cyan-700 dark:text-teal-300 bg-teal-50/90 dark:bg-teal-950/60'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Personalized Real-Time Push Notification Toast */}
      {liveToast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="push-notification-toast"
          className="fixed bottom-32 md:bottom-20 right-4 md:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white dark:bg-[#081E2C] border border-teal-200 dark:border-teal-800 rounded-2xl shadow-xl p-4 flex items-start gap-3"
        >
          <Bell className="w-4 h-4 text-cyan-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {liveToast.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {liveToast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            aria-label="Tutup notifikasi"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals & Slide-Over Drawers */}
      <MemberAuthModal
        open={memberAuthModal.open}
        initialMode={memberAuthModal.mode}
        contextMessage={memberAuthModal.contextMessage}
        onClose={() => setMemberAuthModal((prev) => ({ ...prev, open: false }))}
        onLoginWithEmail={handleMemberLogin}
        onRegisterWithEmail={handleMemberRegister}
        onLoginWithGoogle={handleSignInGoogle}
      />

      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          defaultTier={checkoutTier}
          promos={promos}
          orders={orders}
          automation={automation}
          loyaltyPoints={member?.loyaltyPoints ?? security.loyaltyPoints}
          defaultBuyerName={member?.displayName || firebaseUser?.displayName || 'Budi Santoso'}
          defaultBuyerEmail={member?.email || firebaseUser?.email || 'budi.santoso@malldigitalstore.id'}
          onClose={() => setCheckoutProduct(null)}
          onCreateOrder={handleCreateOrder}
          onVerifyPayment={handleVerifyPayment}
          onOpenOrderHistory={() => setActiveTab('pesanan')}
        />
      )}

      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onRemoveItem={handleRemoveFromCart}
        onCheckoutProduct={(prod) => {
          setCheckoutTier('reguler');
          setCheckoutProduct(prod);
        }}
      />

      <AIAssistantDrawer
        open={aiOpen}
        products={products}
        onClose={() => setAiOpen(false)}
        onSelectProductForCheckout={(prod, tier = 'reguler') => {
          setCheckoutTier(tier);
          setCheckoutProduct(prod);
        }}
      />

      <LiveChatDrawer
        open={chatOpen}
        messages={messages}
        orders={orders}
        initialOrderRef={chatOrderRef}
        defaultSenderName={member?.displayName || firebaseUser?.displayName || 'Pelanggan MALL DIGITAL STORE'}
        onClose={() => setChatOpen(false)}
        onSendMessage={handleSendMessage}
      />

      <NotificationsDrawer
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkAllRead={handleMarkNotificationsRead}
      />
    </div>
  );
}
