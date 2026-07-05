// Format helpers — Indonesian locale.

export const formatRupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function formatTanggal(input: string | Date | null | undefined, opts: { long?: boolean } = {}): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '—';
  const bulan = (opts.long ? BULAN_LONG : BULAN)[d.getMonth()];
  return `${d.getDate()} ${bulan} ${d.getFullYear()}`;
}

export function formatTanggalWaktu(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '—';
  const tgl = formatTanggal(d);
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${tgl}, ${jam}:${menit} WIB`;
}

export const capitalize = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export const formatStatus = (s: string): string =>
  capitalize(s.replace(/_/g, ' '));

export const formatIp = (n: number | null | undefined): string =>
  n == null ? '—' : n.toFixed(2);

/**
 * Sanitasi href untuk data URL yang berasal dari input pengguna (mis.
 * buktiUrl pembayaran). Hanya http/https yang diizinkan — skema lain
 * (javascript:, data:, vbscript:) dikembalikan sebagai null agar link
 * tidak dirender sama sekali. Lapisan kedua setelah validasi server;
 * tetap perlu karena data lama di DB bisa lolos sebelum validasi ada.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
