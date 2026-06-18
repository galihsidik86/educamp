import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { generateSurveiToken } from '../../lib/spmi.js';

export const spmiSurveiRouter = Router();

const KATEGORI = [
  'layanan_akademik', 'layanan_keuangan', 'layanan_sarpras', 'layanan_perpustakaan',
  'layanan_kemahasiswaan', 'dosen_pembimbing', 'lulusan', 'pengguna_lulusan', 'lain',
] as const;
const STATUS = ['draft', 'publish', 'ditutup'] as const;
const JENIS_PERTANYAAN = ['likert', 'pilihan', 'open'] as const;

const surveiSchema = z.object({
  kode: z.string().min(3).max(40),
  judul: z.string().min(5).max(200),
  deskripsi: z.string().max(5000).optional().nullable(),
  kategori: z.enum(KATEGORI),
  periode: z.string().max(50).optional().nullable(),
  target: z.string().max(30).optional(),
  status: z.enum(STATUS).optional(),
  mulai: z.string().optional().nullable(),
  selesai: z.string().optional().nullable(),
});

spmiSurveiRouter.get('/spmi/survei', async (req, res) => {
  const status = req.query.status as string | undefined;
  const kategori = req.query.kategori as string | undefined;
  const items = await prisma.kuesionerKepuasan.findMany({
    where: {
      ...(status && STATUS.includes(status as any) && { status: status as any }),
      ...(kategori && KATEGORI.includes(kategori as any) && { kategori: kategori as any }),
    },
    include: {
      _count: { select: { pertanyaan: true, response: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

spmiSurveiRouter.get('/spmi/survei/:id', async (req, res) => {
  const s = await prisma.kuesionerKepuasan.findUnique({
    where: { id: req.params.id },
    include: {
      pertanyaan: { orderBy: { urutan: 'asc' } },
      _count: { select: { response: true } },
    },
  });
  if (!s) throw NotFound('Survei tidak ditemukan');
  res.json(s);
});

spmiSurveiRouter.post('/spmi/survei', async (req, res) => {
  const body = surveiSchema.parse(req.body);
  try {
    const created = await prisma.kuesionerKepuasan.create({
      data: {
        kode: body.kode,
        judul: body.judul,
        deskripsi: body.deskripsi ?? null,
        kategori: body.kategori,
        periode: body.periode ?? null,
        target: body.target ?? 'mahasiswa',
        tokenPublic: generateSurveiToken(),
        status: body.status ?? 'draft',
        mulai: body.mulai ? new Date(body.mulai) : null,
        selesai: body.selesai ? new Date(body.selesai) : null,
      },
    });
    void writeAudit(req, { action: 'spmi.survei.create', entity: 'survei-kepuasan', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode survei sudah dipakai');
    throw e;
  }
});

spmiSurveiRouter.patch('/spmi/survei/:id', async (req, res) => {
  const exists = await prisma.kuesionerKepuasan.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Survei tidak ditemukan');
  const body = surveiSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.mulai !== undefined) data.mulai = body.mulai ? new Date(body.mulai) : null;
  if (body.selesai !== undefined) data.selesai = body.selesai ? new Date(body.selesai) : null;
  const updated = await prisma.kuesionerKepuasan.update({ where: { id: exists.id }, data });
  void writeAudit(req, { action: 'spmi.survei.update', entity: 'survei-kepuasan', entityId: exists.id, metadata: { fields: Object.keys(body) } });
  res.json(updated);
});

spmiSurveiRouter.delete('/spmi/survei/:id', async (req, res) => {
  const exists = await prisma.kuesionerKepuasan.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Survei tidak ditemukan');
  await prisma.kuesionerKepuasan.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'spmi.survei.delete', entity: 'survei-kepuasan', entityId: exists.id });
  res.status(204).end();
});

// -------- Pertanyaan --------

const pertanyaanSchema = z.object({
  urutan: z.number().int().min(0).max(999).optional(),
  pertanyaan: z.string().min(3).max(2000),
  jenis: z.enum(JENIS_PERTANYAAN).optional(),
  wajib: z.boolean().optional(),
  opsi: z.array(z.string().min(1).max(200)).optional().nullable(),
});

spmiSurveiRouter.post('/spmi/survei/:id/pertanyaan', async (req, res) => {
  const s = await prisma.kuesionerKepuasan.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Survei tidak ditemukan');
  if (s.status !== 'draft') throw BadRequest('Survei sudah dipublish — tidak bisa edit pertanyaan');
  const body = pertanyaanSchema.parse(req.body);
  if (body.jenis === 'pilihan' && (!body.opsi || body.opsi.length < 2)) {
    throw BadRequest('Pertanyaan jenis pilihan butuh minimal 2 opsi');
  }
  const created = await prisma.pertanyaanKepuasan.create({
    data: {
      kuesionerId: s.id,
      urutan: body.urutan ?? 0,
      pertanyaan: body.pertanyaan,
      jenis: body.jenis ?? 'likert',
      wajib: body.wajib ?? true,
      opsi: body.opsi ?? undefined,
    },
  });
  res.status(201).json(created);
});

spmiSurveiRouter.patch('/spmi/pertanyaan/:pertanyaanId', async (req, res) => {
  const p = await prisma.pertanyaanKepuasan.findUnique({
    where: { id: req.params.pertanyaanId },
    include: { kuesioner: true },
  });
  if (!p) throw NotFound('Pertanyaan tidak ditemukan');
  if (p.kuesioner.status !== 'draft') throw BadRequest('Survei sudah dipublish');
  const body = pertanyaanSchema.partial().parse(req.body);
  const updated = await prisma.pertanyaanKepuasan.update({ where: { id: p.id }, data: body as any });
  res.json(updated);
});

spmiSurveiRouter.delete('/spmi/pertanyaan/:pertanyaanId', async (req, res) => {
  const p = await prisma.pertanyaanKepuasan.findUnique({
    where: { id: req.params.pertanyaanId },
    include: { kuesioner: true },
  });
  if (!p) throw NotFound('Pertanyaan tidak ditemukan');
  if (p.kuesioner.status !== 'draft') throw BadRequest('Survei sudah dipublish');
  await prisma.pertanyaanKepuasan.delete({ where: { id: p.id } });
  res.status(204).end();
});

// -------- Hasil --------

spmiSurveiRouter.get('/spmi/survei/:id/hasil', async (req, res) => {
  const s = await prisma.kuesionerKepuasan.findUnique({
    where: { id: req.params.id },
    include: { pertanyaan: { orderBy: { urutan: 'asc' } } },
  });
  if (!s) throw NotFound('Survei tidak ditemukan');

  const responses = await prisma.responseKepuasan.findMany({
    where: { kuesionerId: s.id },
    include: { jawaban: true },
  });

  // Agregasi per pertanyaan
  const hasil = s.pertanyaan.map((p) => {
    const jawabanThis = responses.flatMap((r) => r.jawaban.filter((j) => j.pertanyaanId === p.id));
    if (p.jenis === 'likert') {
      const nilaiList = jawabanThis.map((j) => j.nilai).filter((n): n is number => n != null);
      const rata = nilaiList.length ? nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length : 0;
      const distribusi: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const n of nilaiList) {
        if (n >= 1 && n <= 5) distribusi[n] = (distribusi[n] ?? 0) + 1;
      }
      return {
        pertanyaanId: p.id,
        urutan: p.urutan,
        pertanyaan: p.pertanyaan,
        jenis: p.jenis,
        n: nilaiList.length,
        rataRata: Math.round(rata * 100) / 100,
        distribusi,
      };
    }
    if (p.jenis === 'pilihan') {
      const dist: Record<string, number> = {};
      for (const j of jawabanThis) {
        if (j.pilihan) dist[j.pilihan] = (dist[j.pilihan] ?? 0) + 1;
      }
      return {
        pertanyaanId: p.id,
        urutan: p.urutan,
        pertanyaan: p.pertanyaan,
        jenis: p.jenis,
        n: jawabanThis.filter((j) => j.pilihan).length,
        distribusi: dist,
      };
    }
    // open
    return {
      pertanyaanId: p.id,
      urutan: p.urutan,
      pertanyaan: p.pertanyaan,
      jenis: p.jenis,
      n: jawabanThis.filter((j) => j.teks).length,
      sample: jawabanThis.filter((j) => j.teks).slice(-20).map((j) => j.teks),
    };
  });

  res.json({
    totalResponse: responses.length,
    hasil,
  });
});

spmiSurveiRouter.post('/spmi/survei/:id/regen-token', async (req, res) => {
  const s = await prisma.kuesionerKepuasan.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Survei tidak ditemukan');
  const updated = await prisma.kuesionerKepuasan.update({
    where: { id: s.id },
    data: { tokenPublic: generateSurveiToken() },
  });
  void writeAudit(req, { action: 'spmi.survei.regen_token', entity: 'survei-kepuasan', entityId: s.id });
  res.json({ tokenPublic: updated.tokenPublic });
});
