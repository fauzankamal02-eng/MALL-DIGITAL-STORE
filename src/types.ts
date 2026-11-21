export type UserRole = 'customer' | 'seller' | 'admin';

export type ProductCategory =
  | 'Aplikasi Premium'
  | 'E-Book'
  | 'Template & Kode'
  | 'UI Kit'
  | 'Template'
  | 'Source Code'
  | 'Tipografi'
  | 'Preset';

export type PaymentMethodCode =
  | 'QRIS'
  | 'VA_BCA'
  | 'VA_MANDIRI'
  | 'VA_BNI'
  | 'VA_BRI'
  | 'GOPAY'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY'
  | 'CICILAN_3X'
  | 'CICILAN_6X';

export type PaymentStatus = 'pending' | 'verified' | 'refunded';

export type IndonesianBankCode =
  | 'BCA'
  | 'MANDIRI'
  | 'BNI'
  | 'BRI'
  | 'BSI'
  | 'JAGO'
  | 'SEABANK';

export interface DigitalProduct {
  id: string;
  title: string;
  brand: string;
  category: ProductCategory;
  description: string;
  highlights: string[];
  originalPriceIdr?: number;
  priceIdr: number;
  resellerPriceIdr: number;
  stock: number;
  soldCount: number;
  fileName: string;
  fileFormat: string;
  fileSizeMb: number;
  version: string;
  imageUrl: string;
  brandColor: string;
  brandTextColor?: string;
  brandGlyph: string;
  isPromo?: boolean;
  isBestSeller?: boolean;
  sellerId: string;
  sellerName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoVoucher {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minPurchaseIdr: number;
  usageCount: number;
  maxUsage: number;
  active: boolean;
  createdAt: string;
}

export interface OrderTimelineStep {
  label: string;
  timestamp: string;
  completed: boolean;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  productId: string;
  productTitle: string;
  fileName: string;
  fileFormat: string;
  fileSizeMb: number;
  pricingTier?: 'reguler' | 'reseller';
  amountIdr: number;
  discountIdr: number;
  loyaltyDiscountIdr: number;
  gatewayFeeIdr: number;
  finalAmountIdr: number;
  paymentMethod: PaymentMethodCode;
  paymentMethodLabel: string;
  paymentReference: string;
  paymentStatus: PaymentStatus;
  downloadToken: string | null;
  downloadCount: number;
  promoCode: string | null;
  installmentMonths: number;
  monthlyInstallmentIdr: number;
  emailSent: boolean;
  deliveredPayload?: DeliveredPayload | null;
  timeline: OrderTimelineStep[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveredPayload {
  type: 'account_license' | 'topup_sn' | 'digital_file';
  label: string;
  value: string;
  instructions: string;
  deliveredAt: string;
  source: 'vault' | 'auto_license' | 'supplier_sandbox' | 'supplier_live';
}

export interface AutomatedEmailLog {
  id: string;
  orderCode: string;
  toEmail: string;
  recipientName: string;
  subject: string;
  bodyPreview: string;
  downloadUrl: string;
  amountIdr: number;
  status: 'terkirim';
  sentAt: string;
}

export interface PushNotificationItem {
  id: string;
  recipientName: string;
  title: string;
  message: string;
  orderCode?: string;
  category: 'payment' | 'delivery' | 'payout' | 'security' | 'backup' | 'chat';
  read: boolean;
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  payoutCode: string;
  sellerId: string;
  bankCode: IndonesianBankCode;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amountIdr: number;
  feeIdr: number;
  netAmountIdr: number;
  status: 'processing' | 'completed' | 'rejected';
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'support' | 'seller';
  text: string;
  orderRef?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  category: 'auth' | 'order' | 'inventory' | 'payout' | 'backup' | 'promo';
  summary: string;
  createdAt: string;
}

export interface CloudBackupRecord {
  id: string;
  backupCode: string;
  algorithm: 'AES-256-GCM';
  checksumSha256: string;
  ivHex: string;
  recordCount: number;
  sizeBytes: number;
  scheduleMode: 'manual' | 'daily' | 'weekly';
  status: 'encrypted_synced' | 'verified';
  createdAt: string;
}

export interface SecurityProfile {
  mfaEnabled: boolean;
  mfaSetupPending: boolean;
  mfaSecretMasked: string | null;
  mfaOtpAuthUri: string | null;
  mfaVerifiedAt: string | null;
  biometricEnabled: boolean;
  biometricDevices: {
    id: string;
    label: string;
    registeredAt: string;
    lastVerifiedAt: string;
  }[];
  loyaltyPoints: number;
}

export interface MonthlyFinancialRow {
  month: string;
  grossRevenueIdr: number;
  gatewayFeesIdr: number;
  sellerPayoutsIdr: number;
  platformNetIdr: number;
  orderCount: number;
}

export type StoreAnnouncementLevel = 'normal' | 'info' | 'warning' | 'maintenance';

export interface StoreAnnouncement {
  active: boolean;
  level: StoreAnnouncementLevel;
  title: string;
  message: string;
  estimatedResolution: string;
  showTopBanner: boolean;
  updatedAt: string;
}

export interface AutomationSettings {
  autoFulfillEnabled: boolean;
  autoSandboxVerify: boolean;
  sandboxDelaySeconds: number;
  autoDownloadOnPaid: boolean;
  autoEmailOnPaid: boolean;
  webhookEndpointPath: string;
  integrations: {
    paymentGatewayConfigured: boolean;
    webhookSecretConfigured: boolean;
    supplierApiConfigured: boolean;
    emailServiceConfigured: boolean;
  };
}

export interface VaultProductSummary {
  productId: string;
  availableCount: number;
  usedCount: number;
  maskedSamples: string[];
}

export type FaqCategory =
  | 'Pembayaran'
  | 'Pengiriman Otomatis'
  | 'Akun & Garansi'
  | 'Top Up & Tagihan'
  | 'Reseller & Promo';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemberSavedTarget {
  id: string;
  serviceId: 'pulsa' | 'pln' | 'ewallet' | 'game' | 'pdam' | 'internet' | 'bpjs' | 'voucher';
  provider: string;
  targetNumber: string;
  label: string;
  updatedAt: string;
}

export interface MemberProfile {
  id: string;
  memberCode: string;
  displayName: string;
  email: string;
  phone: string;
  tier: 'reguler' | 'reseller';
  authProvider: 'email' | 'google';
  loyaltyPoints: number;
  savedTargets: MemberSavedTarget[];
  joinedAt: string;
  lastLoginAt: string;
}

export interface BootstrapPayload {
  products: DigitalProduct[];
  orders: OrderRecord[];
  promos: PromoVoucher[];
  payouts: PayoutRecord[];
  emails: AutomatedEmailLog[];
  notifications: PushNotificationItem[];
  messages: SupportMessage[];
  activityLogs: ActivityLog[];
  backups: CloudBackupRecord[];
  backupSchedule: 'daily' | 'weekly';
  security: SecurityProfile;
  announcement: StoreAnnouncement;
  automation: AutomationSettings;
  vaultSummaries: VaultProductSummary[];
  faqs: FaqItem[];
  membersCount?: number;
}

export interface AIAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendedProductIds?: string[];
  createdAt: string;
}

