import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MonthlyFinancialRow, OrderRecord } from '../types';
import { formatIdr } from './commerce';

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildSalesCsvContent(orders: OrderRecord[]): string {
  const header = [
    'Kode Pesanan',
    'Tanggal',
    'Pembeli',
    'Email',
    'Produk Digital',
    'Metode Pembayaran',
    'Status',
    'Subtotal (IDR)',
    'Diskon (IDR)',
    'Biaya Gateway (IDR)',
    'Total Akhir (IDR)',
    'Jumlah Unduhan',
  ];
  const rows = orders.map((o) => [
    o.orderCode,
    new Date(o.createdAt).toLocaleString('id-ID'),
    o.buyerName,
    o.buyerEmail,
    o.productTitle,
    o.paymentMethodLabel,
    o.paymentStatus === 'verified' ? 'Terverifikasi' : o.paymentStatus === 'pending' ? 'Menunggu' : 'Refund',
    o.amountIdr,
    o.discountIdr + o.loyaltyDiscountIdr,
    o.gatewayFeeIdr,
    o.finalAmountIdr,
    o.downloadCount,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function buildMonthlyFinancialCsvContent(rows: MonthlyFinancialRow[]): string {
  const header = [
    'Bulan',
    'Total Pesanan',
    'Omzet Kotor (IDR)',
    'Biaya Gateway (IDR)',
    'Penarikan Penjual (IDR)',
    'Pendapatan Bersih Platform (IDR)',
  ];
  const dataRows = rows.map((r) => [
    r.month,
    r.orderCount,
    r.grossRevenueIdr,
    r.gatewayFeesIdr,
    r.sellerPayoutsIdr,
    r.platformNetIdr,
  ]);
  return [header, ...dataRows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSalesCsv(orders: OrderRecord[]): void {
  const csv = buildSalesCsvContent(orders);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `mall-digital-store-laporan-penjualan-${Date.now()}.csv`);
}

export function downloadMonthlyFinancialCsv(rows: MonthlyFinancialRow[]): void {
  const csv = buildMonthlyFinancialCsvContent(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `mall-digital-store-laporan-keuangan-bulanan-${Date.now()}.csv`);
}

export function downloadSalesPdf(orders: OrderRecord[], totalRevenueIdr: number): void {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  pdf.setFontSize(16);
  pdf.text('MALL DIGITAL STORE — Laporan Penjualan & Transaksi Produk Digital', 40, 44);
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text(
    `Dicetak pada: ${new Date().toLocaleString('id-ID')}  |  Total Omzet Terverifikasi: ${formatIdr(totalRevenueIdr)}`,
    40,
    64
  );

  autoTable(pdf, {
    startY: 82,
    head: [['Kode', 'Pembeli', 'Produk Digital', 'Metode', 'Status', 'Total Akhir', 'Unduhan']],
    body: orders.map((o) => [
      o.orderCode,
      o.buyerName,
      o.productTitle,
      o.paymentMethodLabel,
      o.paymentStatus === 'verified' ? 'Terverifikasi' : 'Menunggu',
      formatIdr(o.finalAmountIdr),
      `${o.downloadCount}x`,
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [3, 105, 161] },
  });

  pdf.save(`mall-digital-store-laporan-penjualan-${Date.now()}.pdf`);
}

export function downloadMonthlyFinancialPdf(rows: MonthlyFinancialRow[]): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  pdf.setFontSize(16);
  pdf.text('MALL DIGITAL STORE — Laporan Keuangan Bulanan Admin', 40, 44);
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text(`Periode 2026  |  Mata Uang: Rupiah (IDR)  |  Dicetak: ${new Date().toLocaleString('id-ID')}`, 40, 64);

  autoTable(pdf, {
    startY: 82,
    head: [['Bulan', 'Pesanan', 'Omzet Kotor', 'Biaya Gateway', 'Penarikan', 'Bersih Platform']],
    body: rows.map((r) => [
      r.month,
      String(r.orderCount),
      formatIdr(r.grossRevenueIdr),
      formatIdr(r.gatewayFeesIdr),
      formatIdr(r.sellerPayoutsIdr),
      formatIdr(r.platformNetIdr),
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [6, 95, 70] },
  });

  pdf.save(`mall-digital-store-laporan-keuangan-bulanan-${Date.now()}.pdf`);
}
