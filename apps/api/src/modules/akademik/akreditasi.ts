import { Router } from 'express';
import { prisma } from '../../db.js';

export const akreditasiRouter = Router();

/**
 * Endpoint agregat untuk dashboard akreditasi BAN-PT.
 * Mengembalikan beberapa KPI utama: rasio dosen-mahasiswa,
 * IPK rata-rata, masa studi rata-rata, tingkat kelulusan,
 * EDOM rata-rata, distribusi mahasiswa per status.
 *
 * Query optional: ?prodiId=<id> untuk filter ke satu prodi.
 */
akreditasiRouter.get('/akreditasi', async (req, res) => {
  const prodiId = req.query.prodiId as string | undefined;
  const prodiFilter = prodiId ? { prodiId } : undefined;

  const [prodiList, mahasiswaCount, mahasiswaByStatus, dosenCountByProdi, nilaiFinalized, yudisiumList, edomResponses] = await Promise.all([
    prisma.prodi.findMany({
      where: prodiId ? { id: prodiId } : undefined,
      include: { fakultas: { select: { kode: true, nama: true } } },
      orderBy: { kode: 'asc' },
    }),
    prisma.mahasiswa.count({ where: prodiFilter }),
    prisma.mahasiswa.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: prodiFilter,
    }),
    prisma.dosen.groupBy({
      by: ['prodiId'],
      _count: { _all: true },
      where: prodiFilter,
    }),
    prisma.nilai.findMany({
      where: {
        status: 'finalized',
        mahasiswa: prodiFilter,
      },
      include: {
        krs: {
          include: {
            kelas: {
              include: {
                mataKuliah: { select: { sks: true, prodiId: true } },
                semester: { select: { kode: true } },
              },
            },
          },
        },
        mahasiswa: { select: { id: true, prodiId: true, angkatan: true } },
      },
    }),
    prisma.yudisium.findMany({
      where: { mahasiswa: prodiFilter },
      include: {
        mahasiswa: { select: { id: true, prodiId: true, angkatan: true } },
        periodeWisuda: true,
      },
    }),
    prisma.edomJawaban.findMany({
      where: {
        response: { kelas: { mataKuliah: prodiFilter } },
      },
      select: { nilai: true, response: { select: { kelas: { select: { mataKuliah: { select: { prodiId: true } } } } } } },
    }),
  ]);

  // ----- Per-prodi metrics
  const perProdiMap = new Map<string, {
    prodi: { id: string; kode: string; nama: string; fakultas: { kode: string; nama: string } };
    totalMhs: number;
    totalDosen: number;
    rasioDosenMhs: number | null;
    ipkRataRata: number | null;
    masaStudiRataRataBulan: number | null;
    edomRataRata: number | null;
    statusBreakdown: Record<string, number>;
  }>();

  for (const p of prodiList) {
    perProdiMap.set(p.id, {
      prodi: { id: p.id, kode: p.kode, nama: p.nama, fakultas: p.fakultas },
      totalMhs: 0, totalDosen: 0,
      rasioDosenMhs: null, ipkRataRata: null,
      masaStudiRataRataBulan: null, edomRataRata: null,
      statusBreakdown: {},
    });
  }

  // total mahasiswa + status per prodi
  const mhsByProdi = await prisma.mahasiswa.groupBy({
    by: ['prodiId', 'status'],
    _count: { _all: true },
    where: prodiFilter,
  });
  for (const row of mhsByProdi) {
    const p = perProdiMap.get(row.prodiId);
    if (!p) continue;
    p.totalMhs += row._count._all;
    p.statusBreakdown[row.status] = (p.statusBreakdown[row.status] ?? 0) + row._count._all;
  }

  // total dosen per prodi
  for (const row of dosenCountByProdi) {
    const p = perProdiMap.get(row.prodiId);
    if (!p) continue;
    p.totalDosen = row._count._all;
  }

  // rasio dosen-mahasiswa
  for (const p of perProdiMap.values()) {
    if (p.totalDosen > 0) p.rasioDosenMhs = Math.round((p.totalMhs / p.totalDosen) * 10) / 10;
  }

  // IPK per mahasiswa, lalu rata-rata per prodi
  const mhsBobot = new Map<string, { prodiId: string; totalBobot: number; totalSks: number }>();
  for (const n of nilaiFinalized) {
    const sks = n.krs.kelas.mataKuliah.sks;
    if (n.bobot == null || sks == null) continue;
    const key = n.mahasiswaId;
    const cur = mhsBobot.get(key) ?? { prodiId: n.mahasiswa.prodiId, totalBobot: 0, totalSks: 0 };
    cur.totalBobot += n.bobot * sks;
    cur.totalSks += sks;
    mhsBobot.set(key, cur);
  }
  const ipkPerProdi = new Map<string, { totalIpk: number; jumlahMhs: number }>();
  for (const v of mhsBobot.values()) {
    if (v.totalSks === 0) continue;
    const ipk = v.totalBobot / v.totalSks;
    const cur = ipkPerProdi.get(v.prodiId) ?? { totalIpk: 0, jumlahMhs: 0 };
    cur.totalIpk += ipk; cur.jumlahMhs += 1;
    ipkPerProdi.set(v.prodiId, cur);
  }
  for (const [prodiId2, agg] of ipkPerProdi) {
    const p = perProdiMap.get(prodiId2);
    if (!p || agg.jumlahMhs === 0) continue;
    p.ipkRataRata = Math.round((agg.totalIpk / agg.jumlahMhs) * 100) / 100;
  }

  // Masa studi rata-rata (bulan) dari yudisium tahunLulus - angkatan
  const masaStudiPerProdi = new Map<string, { totalBulan: number; jumlah: number }>();
  for (const y of yudisiumList) {
    const tahunLulus = y.tanggalLulus
      ? new Date(y.tanggalLulus).getFullYear()
      : y.periodeWisuda?.tanggal
        ? new Date(y.periodeWisuda.tanggal).getFullYear()
        : null;
    if (!tahunLulus || !y.mahasiswa.angkatan) continue;
    const bulan = (tahunLulus - y.mahasiswa.angkatan) * 12;
    const cur = masaStudiPerProdi.get(y.mahasiswa.prodiId) ?? { totalBulan: 0, jumlah: 0 };
    cur.totalBulan += bulan; cur.jumlah += 1;
    masaStudiPerProdi.set(y.mahasiswa.prodiId, cur);
  }
  for (const [prodiId2, agg] of masaStudiPerProdi) {
    const p = perProdiMap.get(prodiId2);
    if (!p || agg.jumlah === 0) continue;
    p.masaStudiRataRataBulan = Math.round(agg.totalBulan / agg.jumlah);
  }

  // EDOM rata-rata per prodi
  const edomPerProdi = new Map<string, { total: number; count: number }>();
  for (const e of edomResponses) {
    const pId = e.response.kelas.mataKuliah.prodiId;
    const cur = edomPerProdi.get(pId) ?? { total: 0, count: 0 };
    cur.total += e.nilai; cur.count += 1;
    edomPerProdi.set(pId, cur);
  }
  for (const [pId, agg] of edomPerProdi) {
    const p = perProdiMap.get(pId);
    if (!p || agg.count === 0) continue;
    p.edomRataRata = Math.round((agg.total / agg.count) * 100) / 100;
  }

  // ----- Aggregate (lintas-prodi)
  const totalDosen = Array.from(perProdiMap.values()).reduce((s, p) => s + p.totalDosen, 0);
  const rasioGlobal = totalDosen > 0 ? Math.round((mahasiswaCount / totalDosen) * 10) / 10 : null;

  let ipkTotal = 0; let ipkCount = 0;
  for (const v of mhsBobot.values()) {
    if (v.totalSks === 0) continue;
    ipkTotal += v.totalBobot / v.totalSks; ipkCount += 1;
  }
  const ipkGlobal = ipkCount > 0 ? Math.round((ipkTotal / ipkCount) * 100) / 100 : null;

  let masaTotal = 0; let masaCount = 0;
  for (const a of masaStudiPerProdi.values()) { masaTotal += a.totalBulan; masaCount += a.jumlah; }
  const masaStudiGlobal = masaCount > 0 ? Math.round(masaTotal / masaCount) : null;

  let edomTotal = 0; let edomCount = 0;
  for (const a of edomPerProdi.values()) { edomTotal += a.total; edomCount += a.count; }
  const edomGlobal = edomCount > 0 ? Math.round((edomTotal / edomCount) * 100) / 100 : null;

  // Distribusi global per status
  const statusGlobal: Record<string, number> = {};
  for (const row of mahasiswaByStatus) {
    statusGlobal[row.status] = row._count._all;
  }

  // Tingkat kelulusan: lulus / total (snapshot)
  const tingkatKelulusan = mahasiswaCount > 0 ? Math.round(((statusGlobal['lulus'] ?? 0) / mahasiswaCount) * 10000) / 100 : 0;

  res.json({
    ringkasan: {
      totalMahasiswa: mahasiswaCount,
      totalDosen,
      totalProdi: prodiList.length,
      rasioDosenMahasiswa: rasioGlobal,
      ipkRataRata: ipkGlobal,
      masaStudiRataRataBulan: masaStudiGlobal,
      edomRataRata: edomGlobal,
      tingkatKelulusanPersen: tingkatKelulusan,
    },
    statusBreakdown: statusGlobal,
    perProdi: Array.from(perProdiMap.values()),
  });
});
