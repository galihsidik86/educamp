import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';

export const bahanAjarRouter = Router();

const JENIS = ['link', 'file', 'text', 'video'] as const;

const createSchema = z.object({
  jenis: z.enum(JENIS),
  judul: z.string().min(2).max(200),
  deskripsi: z.string().max(2000).optional().nullable(),
  url: optionalHttpUrl, // http/https saja — anti stored-XSS (dilihat mahasiswa)
  konten: z.string().max(10000).optional().nullable(),
  pertemuanId: z.string().uuid().optional().nullable(),
  urutan: z.number().int().min(0).max(999).optional(),
});

async function getKelasOwned(userId: string, kelasId: string) {
  const d = await getDosenForUser(userId);
  const k = await prisma.kelas.findUnique({ where: { id: kelasId }, include: { mataKuliah: true } });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  await requireKelasOwnership(d.id, k.id);
  return k;
}

/** List bahan ajar per kelas. */
bahanAjarRouter.get('/kelas/:kelasId/bahan-ajar', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);
  const items = await prisma.bahanAjar.findMany({
    where: { kelasId: k.id },
    include: { pertemuan: { select: { pertemuanKe: true } } },
    orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({
    kelas: { id: k.id, kodeMK: k.mataKuliah.kode, namaMK: k.mataKuliah.nama, kodeKelas: k.kodeKelas },
    items: items.map((b) => ({
      id: b.id,
      jenis: b.jenis,
      judul: b.judul,
      deskripsi: b.deskripsi,
      url: b.url,
      konten: b.konten,
      urutan: b.urutan,
      pertemuanKe: b.pertemuan?.pertemuanKe ?? null,
      pertemuanId: b.pertemuanId,
      createdAt: b.createdAt,
    })),
  });
});

bahanAjarRouter.post('/kelas/:kelasId/bahan-ajar', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);
  const body = createSchema.parse(req.body);
  if ((body.jenis === 'link' || body.jenis === 'video' || body.jenis === 'file') && !body.url) {
    throw BadRequest(`Untuk jenis "${body.jenis}", URL wajib diisi`);
  }
  if (body.jenis === 'text' && !body.konten) {
    throw BadRequest('Untuk jenis "text", konten wajib diisi');
  }
  if (body.pertemuanId) {
    const p = await prisma.pertemuan.findUnique({ where: { id: body.pertemuanId } });
    if (!p || p.kelasId !== k.id) throw BadRequest('Pertemuan tidak valid untuk kelas ini');
  }
  const created = await prisma.bahanAjar.create({
    data: {
      kelasId: k.id,
      jenis: body.jenis,
      judul: body.judul,
      deskripsi: body.deskripsi ?? null,
      url: body.url ?? null,
      konten: body.konten ?? null,
      urutan: body.urutan ?? 0,
      pertemuanId: body.pertemuanId ?? null,
    },
  });
  void writeAudit(req, { action: 'bahan-ajar.create', entity: 'bahan-ajar', entityId: created.id, metadata: { kelasId: k.id, judul: body.judul } });
  res.status(201).json(created);
});

bahanAjarRouter.patch('/bahan-ajar/:id', async (req, res) => {
  const body = createSchema.partial().parse(req.body);
  const existing = await prisma.bahanAjar.findUnique({ where: { id: req.params.id }, include: { kelas: true } });
  if (!existing) throw NotFound('Bahan ajar tidak ditemukan');
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, existing.kelasId);
  const updated = await prisma.bahanAjar.update({ where: { id: existing.id }, data: body });
  res.json(updated);
});

bahanAjarRouter.delete('/bahan-ajar/:id', async (req, res) => {
  const existing = await prisma.bahanAjar.findUnique({ where: { id: req.params.id }, include: { kelas: true } });
  if (!existing) throw NotFound('Bahan ajar tidak ditemukan');
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, existing.kelasId);
  await prisma.bahanAjar.delete({ where: { id: existing.id } });
  res.status(204).end();
});
