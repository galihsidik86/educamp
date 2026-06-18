// ============================================================
// Wali Mahasiswa — portal read-only orang tua/wali untuk
// melihat data akademik anak (IPK, KRS, absensi, tagihan).
// ============================================================

import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { calculateIp } from '../../lib/grade.js';

export const waliRouter = Router();

waliRouter.use(requireAuth, requireRole('wali'));

/** Resolve wali record dari userId. */
async function getWaliForUser(userId: string) {
  const w = await prisma.wali.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });
  if (!w) throw Forbidden('Akun ini bukan wali');
  return w;
}

/** Pastikan mahasiswaId memang anak dari wali ini. */
async function ensureLinked(waliId: string, mahasiswaId: string) {
  const link = await prisma.waliMahasiswa.findUnique({
    where: { waliId_mahasiswaId: { waliId, mahasiswaId } },
  });
  if (!link) throw Forbidden('Mahasiswa ini bukan anak/wali Anda');
}

/** Profil wali + list anak. */
waliRouter.get('/profil', async (req, res) => {
  const w = await getWaliForUser(req.user!.sub);
  const mahasiswa = await prisma.waliMahasiswa.findMany({
    where: { waliId: w.id },
    include: {
      mahasiswa: {
        select: {
          id: true, nim: true, nama: true, angkatan: true, status: true,
          prodi: { select: { kode: true, nama: true, fakultas: { select: { nama: true } } } },
        },
      },
    },
  });
  res.json({
    id: w.id,
    nama: w.nama,
    email: w.user.email,
    telepon: w.telepon,
    alamat: w.alamat,
    pekerjaan: w.pekerjaan,
    anak: mahasiswa.map((m) => ({
      ...m.mahasiswa,
      hubungan: m.hubungan,
    })),
  });
});

/** Dashboard ringkasan akademik anak. */
waliRouter.get('/mahasiswa/:mahasiswaId/dashboard', async (req, res) => {
  const w = await getWaliForUser(req.user!.sub);
  await ensureLinked(w.id, req.params.mahasiswaId);

  const m = await prisma.mahasiswa.findUnique({
    where: { id: req.params.mahasiswaId },
    include: {
      prodi: { include: { fakultas: true } },
      dpa: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
    },
  });
  if (!m) throw NotFound('Mahasiswa tidak ditemukan');

  const semesterAktif = await prisma.semester.findFirst({
    where: { isAktif: true },
    include: { tahunAjaran: true },
  });

  const [krsAktif, semuaNilai, tagihan, absensi] = await Promise.all([
    prisma.krs.findMany({
      where: { mahasiswaId: m.id, ...(semesterAktif && { semesterId: semesterAktif.id }) },
      include: { kelas: { include: { mataKuliah: { select: { kode: true, nama: true, sks: true } } } } },
    }),
    prisma.nilai.findMany({
      where: { mahasiswaId: m.id, status: 'finalized' },
      include: { krs: { include: { kelas: { include: { mataKuliah: { select: { sks: true } }, semester: { select: { kode: true, jenis: true } } } } } } },
    }),
    prisma.tagihan.findMany({
      where: { mahasiswaId: m.id, ...(semesterAktif && { semesterId: semesterAktif.id }) },
      include: { semester: { select: { kode: true } } },
    }),
    semesterAktif ? prisma.absensi.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: {
        mahasiswaId: m.id,
        pertemuan: { kelas: { semesterId: semesterAktif.id } },
      },
    }) : Promise.resolve([]),
  ]);

  const itemsIpk = semuaNilai.map((n) => ({ sks: n.krs.kelas.mataKuliah.sks, bobot: n.bobot ?? null }));
  const { ip: ipk, totalSks: sksLulus } = calculateIp(itemsIpk);

  const sksAmbil = krsAktif
    .filter((k) => k.status === 'disetujui' || k.status === 'diajukan')
    .reduce((s, k) => s + k.kelas.mataKuliah.sks, 0);

  const absensiRingkasan = { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 };
  for (const a of absensi) {
    absensiRingkasan[a.status] = a._count._all;
    absensiRingkasan.total += a._count._all;
  }
  const persenHadir = absensiRingkasan.total > 0
    ? Math.round((absensiRingkasan.hadir / absensiRingkasan.total) * 100)
    : null;

  const totalTagihan = tagihan.reduce((s, t) => s + Number(t.jumlah), 0);
  const tagihanBelumLunas = tagihan.filter((t) => t.status !== 'lunas').reduce((s, t) => s + Number(t.jumlah), 0);

  res.json({
    mahasiswa: {
      id: m.id, nim: m.nim, nama: m.nama, angkatan: m.angkatan, status: m.status,
      prodi: m.prodi, dpa: m.dpa,
    },
    semester: semesterAktif ? { kode: semesterAktif.kode, nama: `${semesterAktif.jenis} ${semesterAktif.tahunAjaran.kode}` } : null,
    ipk: Math.round((ipk || 0) * 100) / 100,
    sksLulus,
    sksAmbil,
    krsCount: krsAktif.length,
    krsItems: krsAktif.map((k) => ({
      kodeMK: k.kelas.mataKuliah.kode,
      namaMK: k.kelas.mataKuliah.nama,
      sks: k.kelas.mataKuliah.sks,
      status: k.status,
    })),
    absensi: { ...absensiRingkasan, persenHadir },
    tagihan: { total: totalTagihan, belumLunas: tagihanBelumLunas, count: tagihan.length },
  });
});

/** Transkrip nilai semua semester. */
waliRouter.get('/mahasiswa/:mahasiswaId/transkrip', async (req, res) => {
  const w = await getWaliForUser(req.user!.sub);
  await ensureLinked(w.id, req.params.mahasiswaId);

  const nilai = await prisma.nilai.findMany({
    where: { mahasiswaId: req.params.mahasiswaId, status: 'finalized' },
    include: {
      krs: { include: { kelas: { include: { mataKuliah: true, semester: { include: { tahunAjaran: true } } } } } },
    },
    orderBy: { krs: { kelas: { semester: { kode: 'asc' } } } },
  });
  res.json({
    items: nilai.map((n) => ({
      semester: n.krs.kelas.semester.kode,
      kodeMK: n.krs.kelas.mataKuliah.kode,
      namaMK: n.krs.kelas.mataKuliah.nama,
      sks: n.krs.kelas.mataKuliah.sks,
      nilaiHuruf: n.nilaiHuruf,
      bobot: n.bobot,
    })),
  });
});
