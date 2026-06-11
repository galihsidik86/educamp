import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester } from '../../lib/context.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', async (_req, res) => {
  const semester = await getActiveSemester();

  const [
    mhsAktif, mhsLulus, mhsCuti,
    totalDosen, totalProdi, totalMK, totalKelas,
    krsPending, tagihanBelumLunas, sumBelum,
    pengumuman,
  ] = await Promise.all([
    prisma.mahasiswa.count({ where: { status: 'aktif' } }),
    prisma.mahasiswa.count({ where: { status: 'lulus' } }),
    prisma.mahasiswa.count({ where: { status: 'cuti' } }),
    prisma.dosen.count(),
    prisma.prodi.count(),
    prisma.mataKuliah.count(),
    prisma.kelas.count({ where: { semesterId: semester.id } }),
    prisma.krs.count({ where: { semesterId: semester.id, status: 'diajukan' } }),
    prisma.tagihan.count({ where: { status: { in: ['belum_bayar', 'cicil', 'jatuh_tempo'] } } }),
    prisma.tagihan.aggregate({
      _sum: { jumlah: true },
      where: { status: { in: ['belum_bayar', 'cicil', 'jatuh_tempo'] } },
    }),
    prisma.pengumuman.findMany({
      orderBy: [{ isPenting: 'desc' }, { tanggal: 'desc' }],
      take: 5,
    }),
  ]);

  res.json({
    semester: { kode: semester.kode, nama: `${semester.jenis} ${semester.tahunAjaran.kode}` },
    mahasiswa: { aktif: mhsAktif, lulus: mhsLulus, cuti: mhsCuti, total: mhsAktif + mhsLulus + mhsCuti },
    totalDosen,
    totalProdi,
    totalMK,
    totalKelasSemester: totalKelas,
    krsPending,
    tagihanBelumLunas,
    totalTagihanBelum: Number(sumBelum._sum.jumlah ?? 0),
    pengumuman,
  });
});
