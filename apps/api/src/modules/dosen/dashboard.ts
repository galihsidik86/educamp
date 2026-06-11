import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser } from '../../lib/context.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const [kelasAktif, totalBimbingan, penelitianAktif, pengabdianAktif, pengumuman] = await Promise.all([
    prisma.kelas.findMany({
      where: { dosenId: d.id, semesterId: semester.id },
      include: {
        mataKuliah: true,
        ruangan: { select: { kode: true } },
        _count: { select: { krs: { where: { status: { in: ['diajukan', 'disetujui'] } } } } },
      },
      orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
    }),
    prisma.mahasiswa.count({ where: { dpaId: d.id } }),
    prisma.penelitian.count({ where: { ketuaDosenId: d.id, status: { in: ['disetujui', 'berjalan'] } } }),
    prisma.pengabdian.count({ where: { ketuaDosenId: d.id, status: { in: ['disetujui', 'berjalan'] } } }),
    prisma.pengumuman.findMany({
      where: { OR: [{ target: 'all' }, { target: 'dosen' }, { target: `prodi:${d.prodiId}` }] },
      orderBy: [{ isPenting: 'desc' }, { tanggal: 'desc' }],
      take: 5,
    }),
  ]);

  const totalSks = kelasAktif.reduce((s, k) => s + k.mataKuliah.sks, 0);
  const totalMahasiswa = kelasAktif.reduce((s, k) => s + k._count.krs, 0);

  const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const;
  const today = HARI[new Date().getDay()]!;
  const jadwalHariIni = kelasAktif
    .filter((k) => k.hari === today)
    .map((k) => ({
      kode: k.mataKuliah.kode,
      nama: k.mataKuliah.nama,
      kodeKelas: k.kodeKelas,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai,
      ruangan: k.ruangan?.kode ?? null,
    }))
    .sort((a, b) => (a.jamMulai ?? '').localeCompare(b.jamMulai ?? ''));

  res.json({
    semester: { kode: semester.kode, nama: `${semester.jenis} ${semester.tahunAjaran.kode}` },
    kelasCount: kelasAktif.length,
    totalSks,
    totalMahasiswa,
    totalBimbingan,
    penelitianAktif,
    pengabdianAktif,
    jadwalHariIni,
    pengumuman,
    today,
  });
});
