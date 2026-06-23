// ============================================================
// Notifikasi presensi → wali.
// Dipanggil setelah dosen submit batch presensi atau setelah
// mahasiswa self check-in via PIN. Fire-and-forget.
// ============================================================

import { prisma } from '../db.js';

type Status = 'hadir' | 'izin' | 'sakit' | 'alpa';

const STATUS_LABEL: Record<Status, string> = {
  hadir: 'hadir',
  izin: 'izin',
  sakit: 'sakit',
  alpa: 'tidak hadir (alpa)',
};

function fmtTanggal(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Kirim notifikasi ke wali setiap mahasiswa pada items.
 * - Satu mahasiswa bisa punya banyak wali (ayah, ibu, dst) → satu notif per wali.
 * - Pesan menyebut nama mahasiswa, status, kode + nama MK, pertemuan ke-N, tanggal.
 */
export async function notifyWaliPresensi(
  pertemuanId: string,
  items: Array<{ mahasiswaId: string; status: Status }>,
): Promise<void> {
  if (items.length === 0) return;
  try {
    const pertemuan = await prisma.pertemuan.findUnique({
      where: { id: pertemuanId },
      include: { kelas: { include: { mataKuliah: { select: { kode: true, nama: true } } } } },
    });
    if (!pertemuan) return;

    const statusByMahasiswa = new Map<string, Status>(items.map((i) => [i.mahasiswaId, i.status]));
    const mahasiswaIds = Array.from(statusByMahasiswa.keys());

    const waliRows = await prisma.waliMahasiswa.findMany({
      where: { mahasiswaId: { in: mahasiswaIds } },
      include: {
        wali: { select: { userId: true } },
        mahasiswa: { select: { nama: true } },
      },
    });
    if (waliRows.length === 0) return;

    const mk = pertemuan.kelas.mataKuliah;
    const bodySuffix = `${mk.kode} ${mk.nama} · Pertemuan ke-${pertemuan.pertemuanKe} · ${fmtTanggal(pertemuan.tanggal)}`;

    const data = waliRows
      .map((row) => {
        const status = statusByMahasiswa.get(row.mahasiswaId);
        if (!status || !row.wali.userId) return null;
        return {
          userId: row.wali.userId,
          title: `Presensi ${row.mahasiswa.nama}: ${STATUS_LABEL[status]}`,
          body: bodySuffix,
          type: 'presensi',
          link: '/wali',
          entity: 'pertemuan',
          entityId: pertemuanId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (data.length === 0) return;
    await prisma.notifikasi.createMany({ data });
  } catch (e) {
    console.error('[notif-presensi] gagal:', e);
  }
}
