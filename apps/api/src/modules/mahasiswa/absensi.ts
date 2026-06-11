import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';

export const absensiRouter = Router();

/**
 * Rekap absensi mahasiswa per kelas pada semester aktif (atau ?semesterId).
 * Per kelas: jumlah pertemuan, jumlah hadir/izin/sakit/alpa, persentase kehadiran,
 * dan detail per-pertemuan.
 */
absensiRouter.get('/absensi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;

  // Kelas yang mahasiswa ambil di semester ini (status disetujui)
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId, status: 'disetujui' },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          pertemuan: {
            orderBy: { pertemuanKe: 'asc' },
            include: {
              absensi: { where: { mahasiswaId: m.id }, select: { status: true, catatan: true } },
            },
          },
        },
      },
    },
  });

  const items = krs.map((k) => {
    const totalPertemuan = k.kelas.pertemuan.length;
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    let totalDinilai = 0;
    const detail: Array<{
      pertemuanKe: number;
      tanggal: string;
      topik: string | null;
      status: string | null;
      catatan: string | null;
    }> = [];
    for (const p of k.kelas.pertemuan) {
      const a = p.absensi[0];
      const status = a?.status ?? null;
      if (status) {
        c[status]++;
        totalDinilai++;
      }
      detail.push({
        pertemuanKe: p.pertemuanKe,
        tanggal: p.tanggal.toISOString(),
        topik: p.topik,
        status,
        catatan: a?.catatan ?? null,
      });
    }
    const persentaseHadir = totalDinilai > 0 ? Math.round((c.hadir / totalDinilai) * 100) : null;
    return {
      kelasId: k.kelas.id,
      kodeMK: k.kelas.mataKuliah.kode,
      namaMK: k.kelas.mataKuliah.nama,
      sks: k.kelas.mataKuliah.sks,
      kodeKelas: k.kelas.kodeKelas,
      dosen: [k.kelas.dosen.gelarDepan, k.kelas.dosen.nama, k.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      totalPertemuan,
      totalDinilai,
      ringkasan: c,
      persentaseHadir,
      detail,
    };
  });

  res.json({ items });
});
