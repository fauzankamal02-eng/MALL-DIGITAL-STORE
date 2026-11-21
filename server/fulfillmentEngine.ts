import crypto from 'node:crypto';
import type { DeliveredPayload, OrderRecord } from '../src/types';

export function signWebhookPayload(rawPayload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawPayload, 'utf8').digest('hex');
}

export function verifyWebhookSignature(
  rawPayload: string,
  signatureHex: string,
  secret: string
): boolean {
  if (!signatureHex || !secret || !/^[a-fA-F0-9]{64}$/.test(signatureHex.trim())) {
    return false;
  }
  const expected = signWebhookPayload(rawPayload, secret);
  const providedBuf = Buffer.from(signatureHex.trim().toLowerCase(), 'utf8');
  const expectedBuf = Buffer.from(expected.toLowerCase(), 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function parseBulkVaultLines(rawText: string): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.replace(/\0/g, '').trim().slice(0, 240);
    if (trimmed.length >= 4 && !seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(trimmed);
      if (cleaned.length >= 200) break;
    }
  }
  return cleaned;
}

export function maskCredentialPreview(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 8) return '••••••••';
  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-3);
  return `${start}••••••${end}`;
}

export function generateDeterministicTokenSn(orderId: string): string {
  const hashHex = crypto.createHash('sha256').update(orderId).digest('hex').toUpperCase();
  return Array.from(hashHex.slice(0, 20))
    .map((ch) => parseInt(ch, 16) % 10)
    .join('')
    .replace(/(.{4})/g, '$1-')
    .slice(0, 24);
}

export function buildDeliveredPayload(
  order: Pick<OrderRecord, 'id' | 'orderCode' | 'productId' | 'productTitle' | 'fileName'>,
  poppedVaultItem: string | null,
  deliveredAt: string,
  supplierLive: boolean
): DeliveredPayload {
  const isTopUp = order.productId.startsWith('topup-');

  if (isTopUp) {
    const snToken = generateDeterministicTokenSn(order.id);
    const isPln = order.productId.startsWith('topup-pln');
    return {
      type: 'topup_sn',
      label: isPln ? 'Nomor Token PLN (20 Digit SN)' : 'Nomor Referensi / SN Transaksi',
      value: snToken,
      instructions: isPln
        ? 'Masukkan 20 digit angka token di atas pada meteran listrik PLN Anda lalu tekan Enter.'
        : 'Top up / pembayaran tagihan telah diproses otomatis ke nomor tujuan. Simpan kode SN ini sebagai bukti resmi.',
      deliveredAt,
      source: supplierLive ? 'supplier_live' : 'supplier_sandbox',
    };
  }

  if (poppedVaultItem) {
    return {
      type: 'account_license',
      label: 'Akses Akun / Kode Lisensi Otomatis',
      value: poppedVaultItem,
      instructions:
        'Gunakan detail akun atau tautan aktivasi di atas sesuai panduan produk. File sertifikat resmi juga dapat diunduh otomatis kapan saja.',
      deliveredAt,
      source: 'vault',
    };
  }

  const licenseCode = `MDS-LIC-${crypto
    .createHash('sha256')
    .update(`${order.id}:${order.orderCode}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()}`;

  return {
    type: 'digital_file',
    label: 'Kode Lisensi & Akses Unduhan Otomatis',
    value: `${licenseCode} · ${order.fileName}`,
    instructions:
      'File digital Anda sudah terbuka otomatis. Klik tombol Unduh File Digital di bawah atau buka tautan dari email faktur.',
    deliveredAt,
    source: 'auto_license',
  };
}
