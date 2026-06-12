import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';

export const edomRouter = Router();

/** Kuesioner EDOM aktif untuk semester aktif. */
async function getActiveKuesioner() {
  const semester = await getActiveSemester();
  return prisma.edomKuesioner.findFirst({
    where: { semesterId: semester.id, isAktif: true },
    include: {
      aspek: { orderBy: { urutan: 'asc' } },
    },
  });
}

/**
 * List kelas yang perlu di-EDOM oleh mahasiswa: kelas semester aktif dengan
 * KRS disetujui. Tiap kelas ditandai sudah/belum diisi.
 */
edomRouter.get('/edom', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const kuesioner = await getActiveKuesioner();
  if (!kuesioner) {
    return res.json({ kuesioner: null, items: [] });
  }
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: kuesioner.semesterId, status: 'disetujui' },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
        },
      },
    },
  });
  const sudah = await prisma.edomResponse.findMany({
    where: { kuesionerId: kuesioner.id, mahasiswaId: m.id },
    select: { kelasId: true },
  });
  const sudahSet = new Set(sudah.map((r) => r.kelasId));

  res.json({
    kuesioner: {
      id: kuesioner.id,
      judul: kuesioner.judul,
      jumlahAspek: kuesioner.aspek.length,
    },
    items: krs.map((k) => ({
      kelasId: k.kelas.id,
      kodeMK: k.kelas.mataKuliah.kode,
      namaMK: k.kelas.mataKuliah.nama,
      sks: k.kelas.mataKuliah.sks,
      kodeKelas: k.kelas.kodeKelas,
      dosen: [k.kelas.dosen.gelarDepan, k.kelas.dosen.nama, k.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      sudahDiisi: sudahSet.has(k.kelas.id),
    })),
  });
});

/** Detail aspek + state isian sebelumnya (kalau ada) untuk satu kelas. */
edomRouter.get('/edom/:kelasId', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const kuesioner = await getActiveKuesioner();
  if (!kuesioner) throw NotFound('Tidak ada kuesioner EDOM aktif');

  const kelas = await prisma.kelas.findUnique({
    where: { id: req.params.kelasId },
    include: { mataKuliah: true, dosen: true },
  });
  if (!kelas) throw NotFound('Kelas tidak ditemukan');

  // pastikan mahasiswa terdaftar di kelas tersebut
  const enrolled = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: kelas.id, status: 'disetujui' },
  });
  if (!enrolled) throw NotFound('Anda tidak terdaftar di kelas ini');

  const existing = await prisma.edomResponse.findUnique({
    where: {
      kuesionerId_mahasiswaId_kelasId: { kuesionerId: kuesioner.id, mahasiswaId: m.id, kelasId: kelas.id },
    },
    include: { jawaban: true },
  });
  const jawabanMap = new Map(existing?.jawaban.map((j) => [j.aspekId, j.nilai]) ?? []);

  res.json({
    kuesioner: { id: kuesioner.id, judul: kuesioner.judul },
    kelas: {
      kodeMK: kelas.mataKuliah.kode,
      namaMK: kelas.mataKuliah.nama,
      kodeKelas: kelas.kodeKelas,
      dosen: [kelas.dosen.gelarDepan, kelas.dosen.nama, kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
    },
    sudahDiisi: !!existing,
    aspek: kuesioner.aspek.map((a) => ({
      id: a.id,
      urutan: a.urutan,
      pertanyaan: a.pertanyaan,
      nilai: jawabanMap.get(a.id) ?? null,
    })),
  });
});

const submitSchema = z.object({
  jawaban: z.array(z.object({
    aspekId: z.string().uuid(),
    nilai: z.number().int().min(1).max(5),
  })).min(1),
});

/**
 * Submit / update jawaban EDOM untuk satu kelas (upsert per aspek).
 * Bila response belum ada → create + jawaban. Bila sudah ada → replace
 * jawaban yang ada.
 */
edomRouter.post('/edom/:kelasId', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const kuesioner = await getActiveKuesioner();
  if (!kuesioner) throw BadRequest('Tidak ada kuesioner EDOM aktif');

  const enrolled = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: req.params.kelasId, status: 'disetujui' },
  });
  if (!enrolled) throw BadRequest('Anda tidak terdaftar di kelas ini');

  const { jawaban } = submitSchema.parse(req.body);
  const aspekIdsValid = new Set(kuesioner.aspek.map((a) => a.id));
  for (const j of jawaban) {
    if (!aspekIdsValid.has(j.aspekId)) throw BadRequest(`Aspek ${j.aspekId} tidak valid untuk kuesioner ini`);
  }
  // wajib semua aspek terjawab
  if (jawaban.length !== kuesioner.aspek.length) {
    throw BadRequest(`Lengkapi semua ${kuesioner.aspek.length} aspek terlebih dahulu`);
  }

  // upsert response
  const response = await prisma.edomResponse.upsert({
    where: { kuesionerId_mahasiswaId_kelasId: { kuesionerId: kuesioner.id, mahasiswaId: m.id, kelasId: req.params.kelasId } },
    create: { kuesionerId: kuesioner.id, mahasiswaId: m.id, kelasId: req.params.kelasId },
    update: { submittedAt: new Date() },
  });

  // replace jawaban
  await prisma.$transaction([
    prisma.edomJawaban.deleteMany({ where: { responseId: response.id } }),
    prisma.edomJawaban.createMany({
      data: jawaban.map((j) => ({ responseId: response.id, aspekId: j.aspekId, nilai: j.nilai })),
    }),
  ]);

  res.json({ ok: true, responseId: response.id });
});
