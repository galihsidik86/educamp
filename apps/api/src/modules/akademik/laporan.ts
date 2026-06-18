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

/**
 * Laporan honor mengajar dosen per periode tanggal — untuk pengajuan ke SDM.
 * Group per dosen × kelas, hitung jumlah pertemuan yang sudah dilaksanakan
 * (= ada absensi tercatat) dalam rentang tanggalMulai..tanggalSelesai.
 *
 * Query: ?tanggalMulai=YYYY-MM-DD&tanggalSelesai=YYYY-MM-DD&dosenId=<opt>&prodiId=<opt>
 */
laporanRouter.get('/laporan/honor-dosen', async (req, res) => {
  const tanggalMulaiStr = (req.query.tanggalMulai as string | undefined)?.trim();
  const tanggalSelesaiStr = (req.query.tanggalSelesai as string | undefined)?.trim();
  if (!tanggalMulaiStr || !tanggalSelesaiStr) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Parameter tanggalMulai dan tanggalSelesai wajib (format YYYY-MM-DD)' },
    });
  }
  const tanggalMulai = new Date(tanggalMulaiStr);
  const tanggalSelesai = new Date(tanggalSelesaiStr);
  // Selesai inklusif sampai akhir hari
  tanggalSelesai.setHours(23, 59, 59, 999);
  if (isNaN(tanggalMulai.getTime()) || isNaN(tanggalSelesai.getTime())) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Format tanggal tidak valid' },
    });
  }

  const dosenIdFilter = req.query.dosenId as string | undefined;
  const prodiIdFilter = req.query.prodiId as string | undefined;

  // Ambil semua pertemuan dalam range yang sudah terlaksana (punya absensi)
  const pertemuan = await prisma.pertemuan.findMany({
    where: {
      tanggal: { gte: tanggalMulai, lte: tanggalSelesai },
      absensi: { some: {} },
      ...(dosenIdFilter && { kelas: { dosenId: dosenIdFilter } }),
      ...(prodiIdFilter && { kelas: { mataKuliah: { prodiId: prodiIdFilter } } }),
    },
    include: {
      kelas: {
        include: {
          dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true, jabatanFungsional: true } },
          mataKuliah: { select: { kode: true, nama: true, sks: true, prodiId: true, prodi: { select: { kode: true, nama: true } } } },
          semester: { select: { kode: true } },
        },
      },
      _count: { select: { absensi: true } },
    },
    orderBy: { tanggal: 'asc' },
  });

  // Group per dosen → list kelas → pertemuan
  type KelasRow = {
    kelasId: string;
    kodeMK: string;
    namaMK: string;
    kodeKelas: string;
    sks: number;
    semesterKode: string;
    prodi: { kode: string; nama: string };
    pertemuan: Array<{ id: string; pertemuanKe: number; tanggal: Date; topik: string | null; jumlahPeserta: number }>;
  };
  type DosenRow = {
    dosen: { id: string; nidn: string; nama: string; gelarLengkap: string; jabatan: string | null };
    kelas: Map<string, KelasRow>;
  };
  const byDosen = new Map<string, DosenRow>();

  for (const p of pertemuan) {
    const d = p.kelas.dosen;
    const gelarLengkap = [d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ');
    if (!byDosen.has(d.id)) {
      byDosen.set(d.id, {
        dosen: {
          id: d.id, nidn: d.nidn, nama: d.nama,
          gelarLengkap,
          jabatan: d.jabatanFungsional ?? null,
        },
        kelas: new Map(),
      });
    }
    const dr = byDosen.get(d.id)!;
    if (!dr.kelas.has(p.kelas.id)) {
      dr.kelas.set(p.kelas.id, {
        kelasId: p.kelas.id,
        kodeMK: p.kelas.mataKuliah.kode,
        namaMK: p.kelas.mataKuliah.nama,
        kodeKelas: p.kelas.kodeKelas,
        sks: p.kelas.mataKuliah.sks,
        semesterKode: p.kelas.semester.kode,
        prodi: p.kelas.mataKuliah.prodi,
        pertemuan: [],
      });
    }
    dr.kelas.get(p.kelas.id)!.pertemuan.push({
      id: p.id,
      pertemuanKe: p.pertemuanKe,
      tanggal: p.tanggal,
      topik: p.topik,
      jumlahPeserta: p._count.absensi,
    });
  }

  const items = Array.from(byDosen.values()).map((dr) => {
    const kelasList = Array.from(dr.kelas.values());
    const totalPertemuan = kelasList.reduce((s, k) => s + k.pertemuan.length, 0);
    // Ekuivalen SKS pertemuan: sks MK × jumlah pertemuan (1 pertemuan ≈ 1 SKS-jam tergantung kebijakan PT)
    const totalSksPertemuan = kelasList.reduce((s, k) => s + (k.sks * k.pertemuan.length), 0);
    return {
      dosen: dr.dosen,
      totalKelas: kelasList.length,
      totalPertemuan,
      totalSksPertemuan,
      kelas: kelasList.sort((a, b) => a.kodeMK.localeCompare(b.kodeMK)),
    };
  }).sort((a, b) => a.dosen.gelarLengkap.localeCompare(b.dosen.gelarLengkap));

  res.json({
    periode: {
      tanggalMulai: tanggalMulai.toISOString(),
      tanggalSelesai: tanggalSelesai.toISOString(),
    },
    ringkasan: {
      totalDosen: items.length,
      totalKelas: items.reduce((s, i) => s + i.totalKelas, 0),
      totalPertemuan: items.reduce((s, i) => s + i.totalPertemuan, 0),
      totalSksPertemuan: items.reduce((s, i) => s + i.totalSksPertemuan, 0),
    },
    items,
  });
});
