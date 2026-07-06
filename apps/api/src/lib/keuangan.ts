// ============================================================
// Perhitungan status tagihan & pembayaran.
//
// MASALAH yang dicegah: sebelumnya sisi akademik menjumlahkan SEMUA baris
// Pembayaran tanpa memandang status untuk menentukan lunas/sisa. Akibatnya
// bukti yang masih `menunggu` (belum diverifikasi) — bahkan yang `ditolak` —
// ikut terhitung sebagai "sudah dibayar", sehingga tagihan bisa keliru
// berstatus `lunas`/`cicil` dan dashboard keuangan melaporkan uang masuk yang
// belum benar-benar ada. Semantik yang benar (sudah dipakai di sisi mahasiswa):
// hanya pembayaran `disetujui` yang dihitung sebagai uang masuk.
// ============================================================

type PembayaranLike = { status: string; jumlah: unknown };

/**
 * Total nominal pembayaran yang SUDAH disetujui. Hanya inilah "uang masuk"
 * yang sah untuk menentukan lunas/sisa tagihan.
 */
export function totalDisetujui(pembayaran: PembayaranLike[]): number {
  return pembayaran
    .filter((p) => p.status === 'disetujui')
    .reduce((s, p) => s + Number(p.jumlah), 0);
}

/**
 * Total nominal yang "memesan kuota tagihan": disetujui + menunggu (TIDAK
 * termasuk yang ditolak). Dipakai sebagai batas anti over-payment saat mencatat
 * pembayaran baru — bukti ditolak tak boleh menahan sisa tagihan.
 */
export function totalTerpakai(pembayaran: PembayaranLike[]): number {
  return pembayaran
    .filter((p) => p.status !== 'ditolak')
    .reduce((s, p) => s + Number(p.jumlah), 0);
}

/**
 * Status tagihan dihitung HANYA dari total pembayaran disetujui.
 * (Status `jatuh_tempo` ditentukan terpisah berdasarkan tanggal, bukan di sini.)
 */
export function hitungStatusTagihan(
  jumlahTagihan: number,
  totalDisetujuiNominal: number,
): 'lunas' | 'cicil' | 'belum_bayar' {
  if (totalDisetujuiNominal >= jumlahTagihan) return 'lunas';
  if (totalDisetujuiNominal > 0) return 'cicil';
  return 'belum_bayar';
}
