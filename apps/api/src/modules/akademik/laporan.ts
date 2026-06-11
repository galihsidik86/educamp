import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester } from '../../lib/context.js';

export const laporanRouter = Router();

/**
 * Laporan singkat — counter per prodi/angkatan/status, untuk pelaporan PDDikti.
 */
laporanRouter.get('/laporan', async (_req, res) => {
  const semester = await getActiveSemester();

  // Mahasiswa per prodi × status
  const mhsRows = await prisma.mahasiswa.groupBy({
    by: ['prodiId', 'status'],
    _count: { _all: true },
  });

  // Mahasiswa per prodi × angkatan
  const angkatanRows = await prisma.mahasiswa.groupBy({
    by: ['prodiId', 'angkatan'],
    _count: { _all: true },
    orderBy: { angkatan: 'desc' },
  });

  // Dosen per prodi × jabatan
  const dosenRows = await prisma.dosen.groupBy({
    by: ['prodiId', 'jabatanFungsional'],
    _count: { _all: true },
  });

  const prodi = await prisma.prodi.findMany({
    include: { fakultas: { select: { kode: true, nama: true } } },
  });
  const prodiMap = new Map(prodi.map((p) => [p.id, p]));

  // KRS aktivitas semester aktif
  const krsStat = await prisma.krs.groupBy({
    by: ['status'],
    where: { semesterId: semester.id },
    _count: { _all: true },
  });

  // Nilai finalized semester aktif (per kelas)
  const nilaiSelesai = await prisma.nilai.count({
    where: { status: 'finalized', krs: { semesterId: semester.id } },
  });

  res.json({
    semester: { kode: semester.kode, nama: `${semester.jenis} ${semester.tahunAjaran.kode}` },
    prodi: prodi.map((p) => ({
      id: p.id, kode: p.kode, nama: p.nama, jenjang: p.jenjang,
      fakultas: p.fakultas.nama,
    })),
    mahasiswaPerProdi: prodi.map((p) => {
      const rows = mhsRows.filter((r) => r.prodiId === p.id);
      return {
        prodi: p.nama, kode: p.kode,
        aktif: rows.find((r) => r.status === 'aktif')?._count._all ?? 0,
        cuti: rows.find((r) => r.status === 'cuti')?._count._all ?? 0,
        lulus: rows.find((r) => r.status === 'lulus')?._count._all ?? 0,
        drop_out: rows.find((r) => r.status === 'drop_out')?._count._all ?? 0,
        total: rows.reduce((s, r) => s + r._count._all, 0),
      };
    }),
    mahasiswaPerAngkatan: angkatanRows.map((r) => ({
      prodi: prodiMap.get(r.prodiId)?.nama ?? '—',
      angkatan: r.angkatan,
      jumlah: r._count._all,
    })),
    dosenPerProdi: prodi.map((p) => {
      const rows = dosenRows.filter((r) => r.prodiId === p.id);
      return {
        prodi: p.nama, kode: p.kode,
        asisten_ahli: rows.find((r) => r.jabatanFungsional === 'asisten_ahli')?._count._all ?? 0,
        lektor: rows.find((r) => r.jabatanFungsional === 'lektor')?._count._all ?? 0,
        lektor_kepala: rows.find((r) => r.jabatanFungsional === 'lektor_kepala')?._count._all ?? 0,
        guru_besar: rows.find((r) => r.jabatanFungsional === 'guru_besar')?._count._all ?? 0,
        tenaga_pengajar: rows.find((r) => r.jabatanFungsional === 'tenaga_pengajar')?._count._all ?? 0,
        total: rows.reduce((s, r) => s + r._count._all, 0),
      };
    }),
    krsSemester: Object.fromEntries(krsStat.map((s) => [s.status, s._count._all])),
    nilaiSelesai,
  });
});
