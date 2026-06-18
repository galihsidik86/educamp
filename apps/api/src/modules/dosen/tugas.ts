import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const tugasRouter = Router();

const createSchema = z.object({
  judul: z.string().min(3).max(200),
  deskripsi: z.string().max(5000).optional().nullable(),
  deadline: z.string().min(1),
  maxNilai: z.number().int().min(1).max(100).optional(),
  linkLampiran: z.string().max(500).optional().nullable(),
  pertemuanId: z.string().uuid().optional().nullable(),
});

async function getKelasOwned(userId: string, kelasId: string) {
  const d = await getDosenForUser(userId);
  const k = await prisma.kelas.findUnique({ where: { id: kelasId }, include: { mataKuliah: true } });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  await requireKelasOwnership(d.id, k.id);
  return k;
}

async function getTugasOwned(userId: string, tugasId: string) {
  const t = await prisma.tugas.findUnique({ where: { id: tugasId }, include: { kelas: { include: { mataKuliah: true } } } });
  if (!t) throw NotFound('Tugas tidak ditemukan');
  const d = await getDosenForUser(userId);
  await requireKelasOwnership(d.id, t.kelasId);
  return t;
}

/** List tugas + jumlah submission dan submission yang sudah dinilai. */
tugasRouter.get('/kelas/:kelasId/tugas', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);
  const items = await prisma.tugas.findMany({
    where: { kelasId: k.id },
    include: {
      pertemuan: { select: { pertemuanKe: true } },
      _count: {
        select: {
          submission: true,
        },
      },
      submission: { select: { status: true } },
    },
    orderBy: { deadline: 'asc' },
  });
  res.json({
    kelas: { id: k.id, kodeMK: k.mataKuliah.kode, namaMK: k.mataKuliah.nama, kodeKelas: k.kodeKelas },
    items: items.map((t) => {
      const dinilai = t.submission.filter((s) => s.status === 'dinilai').length;
      return {
        id: t.id,
        judul: t.judul,
        deskripsi: t.deskripsi,
        deadline: t.deadline,
        maxNilai: t.maxNilai,
        linkLampiran: t.linkLampiran,
        pertemuanKe: t.pertemuan?.pertemuanKe ?? null,
        totalSubmit: t._count.submission,
        totalDinilai: dinilai,
      };
    }),
  });
});

tugasRouter.post('/kelas/:kelasId/tugas', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);
  const body = createSchema.parse(req.body);
  if (body.pertemuanId) {
    const p = await prisma.pertemuan.findUnique({ where: { id: body.pertemuanId } });
    if (!p || p.kelasId !== k.id) throw BadRequest('Pertemuan tidak valid untuk kelas ini');
  }
  const created = await prisma.tugas.create({
    data: {
      kelasId: k.id,
      judul: body.judul,
      deskripsi: body.deskripsi ?? null,
      deadline: new Date(body.deadline),
      maxNilai: body.maxNilai ?? 100,
      linkLampiran: body.linkLampiran ?? null,
      pertemuanId: body.pertemuanId ?? null,
    },
  });
  void writeAudit(req, { action: 'tugas.create', entity: 'tugas', entityId: created.id, metadata: { kelasId: k.id, judul: body.judul } });
  res.status(201).json(created);
});

tugasRouter.patch('/tugas/:id', async (req, res) => {
  const t = await getTugasOwned(req.user!.sub, req.params.id);
  const body = createSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.deadline !== undefined) data.deadline = new Date(body.deadline);
  const updated = await prisma.tugas.update({ where: { id: t.id }, data });
  res.json(updated);
});

tugasRouter.delete('/tugas/:id', async (req, res) => {
  const t = await getTugasOwned(req.user!.sub, req.params.id);
  await prisma.tugas.delete({ where: { id: t.id } });
  res.status(204).end();
});

/** List submission untuk satu tugas + peserta kelas yang belum submit. */
tugasRouter.get('/tugas/:id/submission', async (req, res) => {
  const t = await getTugasOwned(req.user!.sub, req.params.id);
  const peserta = await prisma.krs.findMany({
    where: { kelasId: t.kelasId, status: 'disetujui' },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
    orderBy: { mahasiswa: { nim: 'asc' } },
  });
  const submission = await prisma.submitTugas.findMany({
    where: { tugasId: t.id },
  });
  const submitMap = new Map(submission.map((s) => [s.mahasiswaId, s]));

  res.json({
    tugas: {
      id: t.id,
      judul: t.judul,
      deadline: t.deadline,
      maxNilai: t.maxNilai,
    },
    kelas: { kodeMK: t.kelas.mataKuliah.kode, namaMK: t.kelas.mataKuliah.nama, kodeKelas: t.kelas.kodeKelas },
    peserta: peserta.map((p) => {
      const s = submitMap.get(p.mahasiswaId);
      return {
        mahasiswaId: p.mahasiswaId,
        nim: p.mahasiswa.nim,
        nama: p.mahasiswa.nama,
        submission: s ? {
          id: s.id,
          linkJawaban: s.linkJawaban,
          isiJawaban: s.isiJawaban,
          waktuSubmit: s.waktuSubmit,
          terlambat: s.terlambat,
          nilai: s.nilai,
          catatan: s.catatan,
          status: s.status,
        } : null,
      };
    }),
  });
});

const nilaiSchema = z.object({
  nilai: z.number().min(0).max(100),
  catatan: z.string().max(1000).optional().nullable(),
});

tugasRouter.patch('/submission/:id', async (req, res) => {
  const s = await prisma.submitTugas.findUnique({ where: { id: req.params.id }, include: { tugas: { include: { kelas: true } } } });
  if (!s) throw NotFound('Submission tidak ditemukan');
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, s.tugas.kelasId);
  const body = nilaiSchema.parse(req.body);
  if (body.nilai > s.tugas.maxNilai) throw BadRequest(`Nilai tidak boleh melebihi max ${s.tugas.maxNilai}`);
  const updated = await prisma.submitTugas.update({
    where: { id: s.id },
    data: { nilai: body.nilai, catatan: body.catatan ?? null, status: 'dinilai' },
  });
  res.json(updated);
});
