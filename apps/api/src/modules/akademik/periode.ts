import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const periodeRouter = Router();

/** List tahun ajaran + semester. */
periodeRouter.get('/periode', async (_req, res) => {
  const tas = await prisma.tahunAjaran.findMany({
    include: { semester: { orderBy: { kode: 'asc' } } },
    orderBy: { kode: 'desc' },
  });
  res.json({ items: tas });
});

const taSchema = z.object({
  kode: z.string().regex(/^\d{4}\/\d{4}$/, 'Format kode: 2025/2026'),
  nama: z.string().min(3).max(60),
  tahunMulai: z.number().int(),
  tahunSelesai: z.number().int(),
});

periodeRouter.post('/periode/tahun-ajaran', async (req, res) => {
  const body = taSchema.parse(req.body);
  const created = await prisma.tahunAjaran.create({ data: body });
  void writeAudit(req, { action: 'periode.ta.create', entity: 'tahun-ajaran', entityId: created.id });
  res.status(201).json(created);
});

periodeRouter.patch('/periode/tahun-ajaran/:id', async (req, res) => {
  const ta = await prisma.tahunAjaran.findUnique({ where: { id: req.params.id } });
  if (!ta) throw NotFound('Tahun ajaran tidak ditemukan');
  const body = taSchema.partial().parse(req.body);
  const updated = await prisma.tahunAjaran.update({ where: { id: ta.id }, data: body });
  void writeAudit(req, { action: 'periode.ta.update', entity: 'tahun-ajaran', entityId: ta.id, metadata: { fields: Object.keys(body) } });
  res.json(updated);
});

/** Aktifkan TA — sekaligus nonaktifkan TA lain. */
periodeRouter.post('/periode/tahun-ajaran/:id/aktifkan', async (req, res) => {
  const ta = await prisma.tahunAjaran.findUnique({ where: { id: req.params.id } });
  if (!ta) throw NotFound('Tahun ajaran tidak ditemukan');
  await prisma.$transaction([
    prisma.tahunAjaran.updateMany({ data: { isAktif: false }, where: { isAktif: true } }),
    prisma.tahunAjaran.update({ where: { id: ta.id }, data: { isAktif: true } }),
  ]);
  void writeAudit(req, { action: 'periode.ta.aktifkan', entity: 'tahun-ajaran', entityId: ta.id, metadata: { kode: ta.kode } });
  res.json({ ok: true });
});

periodeRouter.delete('/periode/tahun-ajaran/:id', async (req, res) => {
  const ta = await prisma.tahunAjaran.findUnique({ where: { id: req.params.id }, include: { _count: { select: { semester: true } } } });
  if (!ta) throw NotFound('Tahun ajaran tidak ditemukan');
  if (ta._count.semester > 0) throw BadRequest(`Tahun ajaran masih punya ${ta._count.semester} semester — hapus dulu semesternya`);
  if (ta.isAktif) throw BadRequest('Tahun ajaran aktif tidak boleh dihapus');
  await prisma.tahunAjaran.delete({ where: { id: ta.id } });
  void writeAudit(req, { action: 'periode.ta.delete', entity: 'tahun-ajaran', entityId: ta.id });
  res.status(204).end();
});

const semesterSchema = z.object({
  kode: z.string().regex(/^\d{5}$/, 'Format kode semester: 5 digit (mis. 20251)'),
  jenis: z.enum(['ganjil', 'genap', 'pendek']),
  tahunAjaranId: z.string().uuid(),
  krsMulai: z.string().optional().nullable(),
  krsSelesai: z.string().optional().nullable(),
  prsMulai: z.string().optional().nullable(),
  prsSelesai: z.string().optional().nullable(),
  nilaiMulai: z.string().optional().nullable(),
  nilaiSelesai: z.string().optional().nullable(),
});

periodeRouter.post('/periode/semester', async (req, res) => {
  const body = semesterSchema.parse(req.body);
  const data = {
    ...body,
    krsMulai: body.krsMulai ? new Date(body.krsMulai) : null,
    krsSelesai: body.krsSelesai ? new Date(body.krsSelesai) : null,
    prsMulai: body.prsMulai ? new Date(body.prsMulai) : null,
    prsSelesai: body.prsSelesai ? new Date(body.prsSelesai) : null,
    nilaiMulai: body.nilaiMulai ? new Date(body.nilaiMulai) : null,
    nilaiSelesai: body.nilaiSelesai ? new Date(body.nilaiSelesai) : null,
  };
  res.status(201).json(await prisma.semester.create({ data }));
});

periodeRouter.patch('/periode/semester/:id', async (req, res) => {
  const body = semesterSchema.partial().parse(req.body);
  const data: any = { ...body };
  for (const k of ['krsMulai', 'krsSelesai', 'prsMulai', 'prsSelesai', 'nilaiMulai', 'nilaiSelesai'] as const) {
    if (body[k] !== undefined) data[k] = body[k] ? new Date(body[k] as string) : null;
  }
  res.json(await prisma.semester.update({ where: { id: req.params.id }, data }));
});

/** Aktifkan satu semester — yang lain dinonaktifkan otomatis. */
periodeRouter.post('/periode/semester/:id/aktifkan', async (req, res) => {
  const s = await prisma.semester.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Semester tidak ditemukan');
  await prisma.$transaction([
    prisma.semester.updateMany({ data: { isAktif: false }, where: { isAktif: true } }),
    prisma.semester.update({ where: { id: s.id }, data: { isAktif: true } }),
  ]);
  void writeAudit(req, {
    action: 'periode.semester.aktifkan',
    entity: 'semester',
    entityId: s.id,
    metadata: { kode: s.kode, jenis: s.jenis },
  });
  res.json({ ok: true });
});

periodeRouter.delete('/periode/semester/:id', async (req, res) => {
  const used = await prisma.kelas.count({ where: { semesterId: req.params.id } });
  if (used > 0) throw BadRequest(`Semester dipakai pada ${used} kelas`);
  await prisma.semester.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
