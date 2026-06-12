import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { Forbidden, NotFound } from '../../lib/errors.js';

export const bahanAjarRouter = Router();

/**
 * List kelas dengan KRS disetujui di semester aktif yang memiliki bahan ajar
 * (atau yang masih kosong tetap muncul agar mahasiswa tahu di mana cari).
 */
bahanAjarRouter.get('/materi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id, status: 'disetujui' },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          _count: { select: { bahanAjar: true } },
        },
      },
    },
    orderBy: { kelas: { mataKuliah: { kode: 'asc' } } },
  });
  res.json({
    items: krs.map((k) => ({
      kelasId: k.kelas.id,
      kodeMK: k.kelas.mataKuliah.kode,
      namaMK: k.kelas.mataKuliah.nama,
      sks: k.kelas.mataKuliah.sks,
      kodeKelas: k.kelas.kodeKelas,
      dosen: [k.kelas.dosen.gelarDepan, k.kelas.dosen.nama, k.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      totalBahanAjar: k.kelas._count.bahanAjar,
    })),
  });
});

/** Detail bahan ajar satu kelas (validasi KRS disetujui mahasiswa). */
bahanAjarRouter.get('/materi/:kelasId', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const kelas = await prisma.kelas.findUnique({
    where: { id: req.params.kelasId },
    include: { mataKuliah: true, dosen: true },
  });
  if (!kelas) throw NotFound('Kelas tidak ditemukan');
  const enrolled = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: kelas.id, status: 'disetujui' },
  });
  if (!enrolled) throw Forbidden('Anda tidak terdaftar di kelas ini');

  const items = await prisma.bahanAjar.findMany({
    where: { kelasId: kelas.id },
    include: { pertemuan: { select: { pertemuanKe: true, tanggal: true } } },
    orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({
    kelas: {
      id: kelas.id,
      kodeMK: kelas.mataKuliah.kode,
      namaMK: kelas.mataKuliah.nama,
      sks: kelas.mataKuliah.sks,
      kodeKelas: kelas.kodeKelas,
      dosen: [kelas.dosen.gelarDepan, kelas.dosen.nama, kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
    },
    items: items.map((b) => ({
      id: b.id,
      jenis: b.jenis,
      judul: b.judul,
      deskripsi: b.deskripsi,
      url: b.url,
      konten: b.konten,
      pertemuanKe: b.pertemuan?.pertemuanKe ?? null,
      tanggal: b.pertemuan?.tanggal ?? null,
      createdAt: b.createdAt,
    })),
  });
});
