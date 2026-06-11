import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester } from '../../lib/context.js';

export const laporanRouter = Router();

const KRITIS_THRESHOLD = 75; // persentase kehadiran minimal untuk lolos UAS

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

/**
 * Laporan rekap kehadiran per kelas pada satu semester.
 * Filter opsional: ?prodiId=, ?semesterId=. Default = semester aktif.
 */
laporanRouter.get('/laporan/kehadiran', async (req, res) => {
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;
  const prodiId = req.query.prodiId as string | undefined;

  const kelas = await prisma.kelas.findMany({
    where: {
      semesterId,
      ...(prodiId && { mataKuliah: { prodiId } }),
    },
    include: {
      mataKuliah: { include: { prodi: { select: { kode: true, nama: true } } } },
      dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
      pertemuan: {
        select: {
          id: true,
          absensi: { select: { mahasiswaId: true, status: true } },
        },
      },
      krs: {
        where: { status: 'disetujui' },
        select: { mahasiswaId: true },
      },
    },
    orderBy: [{ mataKuliah: { kode: 'asc' } }, { kodeKelas: 'asc' }],
  });

  const items = kelas.map((k) => {
    const totalPertemuan = k.pertemuan.length;
    const totalPeserta = k.krs.length;
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    // map mahasiswaId -> {hadir, total}
    const perMhs = new Map<string, { hadir: number; total: number }>();
    for (const p of k.pertemuan) {
      for (const a of p.absensi) {
        c[a.status]++;
        const cur = perMhs.get(a.mahasiswaId) ?? { hadir: 0, total: 0 };
        cur.total++;
        if (a.status === 'hadir') cur.hadir++;
        perMhs.set(a.mahasiswaId, cur);
      }
    }
    const totalAbsensiTerisi = c.hadir + c.izin + c.sakit + c.alpa;
    const persentaseRata = totalAbsensiTerisi > 0
      ? Math.round((c.hadir / totalAbsensiTerisi) * 100)
      : null;
    let kritis = 0;
    for (const v of perMhs.values()) {
      if (v.total === 0) continue;
      if ((v.hadir / v.total) * 100 < KRITIS_THRESHOLD) kritis++;
    }
    return {
      kelasId: k.id,
      kodeMK: k.mataKuliah.kode,
      namaMK: k.mataKuliah.nama,
      kodeKelas: k.kodeKelas,
      prodi: k.mataKuliah.prodi,
      dosen: [k.dosen.gelarDepan, k.dosen.nama, k.dosen.gelarBelakang].filter(Boolean).join(' '),
      totalPertemuan,
      totalPeserta,
      totalAbsensiTerisi,
      ringkasan: c,
      persentaseRata,
      kritis,
    };
  });

  // Ringkasan global
  const totalKelas = items.length;
  const totalPertemuan = items.reduce((s, i) => s + i.totalPertemuan, 0);
  const totalKritis = items.reduce((s, i) => s + i.kritis, 0);
  const totalAbsensiHadir = items.reduce((s, i) => s + i.ringkasan.hadir, 0);
  const totalAbsensiSemua = items.reduce((s, i) => s + i.totalAbsensiTerisi, 0);
  const persentaseGlobal = totalAbsensiSemua > 0
    ? Math.round((totalAbsensiHadir / totalAbsensiSemua) * 100)
    : null;

  res.json({
    semester: { id: semesterId },
    threshold: KRITIS_THRESHOLD,
    ringkasan: {
      totalKelas,
      totalPertemuan,
      totalAbsensiSemua,
      persentaseGlobal,
      totalKritis,
    },
    items,
  });
});
