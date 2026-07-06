import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';

export const tugasRouter = Router();

/** List tugas dari semua kelas KRS disetujui semester aktif. */
tugasRouter.get('/tugas', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id, status: 'disetujui' },
    select: { kelasId: true },
  });
  const kelasIds = krs.map((k) => k.kelasId);
  if (kelasIds.length === 0) return res.json({ items: [] });

  const tugas = await prisma.tugas.findMany({
    where: { kelasId: { in: kelasIds } },
    include: {
      kelas: { include: { mataKuliah: true } },
      submission: { where: { mahasiswaId: m.id } },
    },
    orderBy: { deadline: 'asc' },
  });

  res.json({
    items: tugas.map((t) => {
      const sub = t.submission[0];
      return {
        id: t.id,
        kelasId: t.kelasId,
        kodeMK: t.kelas.mataKuliah.kode,
        namaMK: t.kelas.mataKuliah.nama,
        judul: t.judul,
        deadline: t.deadline,
        maxNilai: t.maxNilai,
        submission: sub ? {
          id: sub.id,
          waktuSubmit: sub.waktuSubmit,
          terlambat: sub.terlambat,
          nilai: sub.nilai,
          status: sub.status,
        } : null,
      };
    }),
  });
});

/** Detail tugas + state submission. */
tugasRouter.get('/tugas/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const tugas = await prisma.tugas.findUnique({
    where: { id: req.params.id },
    include: { kelas: { include: { mataKuliah: true, dosen: true } }, pertemuan: { select: { pertemuanKe: true } } },
  });
  if (!tugas) throw NotFound('Tugas tidak ditemukan');
  const enrolled = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: tugas.kelasId, status: 'disetujui' },
  });
  if (!enrolled) throw Forbidden('Anda tidak terdaftar di kelas ini');

  const sub = await prisma.submitTugas.findUnique({
    where: { tugasId_mahasiswaId: { tugasId: tugas.id, mahasiswaId: m.id } },
  });
  res.json({
    id: tugas.id,
    judul: tugas.judul,
    deskripsi: tugas.deskripsi,
    deadline: tugas.deadline,
    maxNilai: tugas.maxNilai,
    linkLampiran: tugas.linkLampiran,
    pertemuanKe: tugas.pertemuan?.pertemuanKe ?? null,
    kelas: {
      id: tugas.kelas.id,
      kodeMK: tugas.kelas.mataKuliah.kode,
      namaMK: tugas.kelas.mataKuliah.nama,
      kodeKelas: tugas.kelas.kodeKelas,
      dosen: [tugas.kelas.dosen.gelarDepan, tugas.kelas.dosen.nama, tugas.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
    },
    submission: sub ? {
      id: sub.id,
      linkJawaban: sub.linkJawaban,
      isiJawaban: sub.isiJawaban,
      waktuSubmit: sub.waktuSubmit,
      terlambat: sub.terlambat,
      nilai: sub.nilai,
      catatan: sub.catatan,
      status: sub.status,
    } : null,
  });
});

const submitSchema = z.object({
  linkJawaban: optionalHttpUrl, // http/https saja — anti stored-XSS (dilihat dosen)
  isiJawaban: z.string().max(10000).optional().nullable(),
});

tugasRouter.post('/tugas/:id/submit', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const tugas = await prisma.tugas.findUnique({ where: { id: req.params.id } });
  if (!tugas) throw NotFound('Tugas tidak ditemukan');

  const enrolled = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: tugas.kelasId, status: 'disetujui' },
  });
  if (!enrolled) throw Forbidden('Anda tidak terdaftar di kelas ini');

  const body = submitSchema.parse(req.body);
  if (!body.linkJawaban && !body.isiJawaban) throw BadRequest('Salah satu dari link atau isi jawaban wajib diisi');

  const existing = await prisma.submitTugas.findUnique({
    where: { tugasId_mahasiswaId: { tugasId: tugas.id, mahasiswaId: m.id } },
  });
  if (existing && existing.status === 'dinilai') {
    throw Forbidden('Submission sudah dinilai dan tidak dapat diubah');
  }

  const now = new Date();
  const terlambat = now > tugas.deadline;
  const status = terlambat ? 'terlambat' : 'terkumpul';

  const upserted = await prisma.submitTugas.upsert({
    where: { tugasId_mahasiswaId: { tugasId: tugas.id, mahasiswaId: m.id } },
    create: {
      tugasId: tugas.id,
      mahasiswaId: m.id,
      linkJawaban: body.linkJawaban ?? null,
      isiJawaban: body.isiJawaban ?? null,
      waktuSubmit: now,
      terlambat,
      status,
    },
    update: {
      linkJawaban: body.linkJawaban ?? null,
      isiJawaban: body.isiJawaban ?? null,
      waktuSubmit: now,
      terlambat,
      status,
    },
  });
  void writeAudit(req, {
    action: existing ? 'tugas.resubmit' : 'tugas.submit',
    entity: 'submission',
    entityId: upserted.id,
    metadata: { tugasId: tugas.id, terlambat },
  });
  res.json(upserted);
});
