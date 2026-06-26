// ============================================================
// Daya Tampung Prodi per periode — pelaporan Tahap 1 PDDikti.
// CRUD sederhana: 1 row per (prodi, semester awal periode).
// ============================================================
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound, Forbidden } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { enqueueFeederChange, buildFeederPayload } from '../../lib/feeder/queue.js';
import { getProdiScope } from '../../lib/context.js';

export const dayaTampungRouter = Router();

dayaTampungRouter.get('/daya-tampung', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);
  const semesterId = req.query.semesterId as string | undefined;
  const items = await prisma.dayaTampungProdi.findMany({
    where: {
      ...(prodiId && { prodiId }),
      ...(semesterId && { semesterId }),
    },
    include: {
      prodi: { select: { id: true, kode: true, nama: true, jenjang: true } },
      semester: { select: { kode: true, jenis: true, tahunAjaran: { select: { kode: true } } } },
    },
    orderBy: [{ semester: { kode: 'desc' } }, { prodi: { kode: 'asc' } }],
    take: 300,
  });
  res.json({ items });
});

const upsertSchema = z.object({
  prodiId: z.string().uuid(),
  semesterId: z.string().uuid(),
  dayaTampung: z.number().int().min(0),
  jumlahDaftar: z.number().int().min(0).optional().nullable(),
  jumlahLulusSeleksi: z.number().int().min(0).optional().nullable(),
  jumlahRegistrasi: z.number().int().min(0).optional().nullable(),
});

dayaTampungRouter.post('/daya-tampung', async (req, res) => {
  const body = upsertSchema.parse(req.body);
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && body.prodiId !== scopeId) throw Forbidden('Prodi di luar scope Anda');

  const dup = await prisma.dayaTampungProdi.findUnique({
    where: { prodiId_semesterId: { prodiId: body.prodiId, semesterId: body.semesterId } },
  });
  if (dup) throw BadRequest('Daya tampung sudah ada untuk prodi+periode ini — gunakan PATCH');

  const created = await prisma.dayaTampungProdi.create({
    data: {
      prodiId: body.prodiId,
      semesterId: body.semesterId,
      dayaTampung: body.dayaTampung,
      jumlahDaftar: body.jumlahDaftar ?? null,
      jumlahLulusSeleksi: body.jumlahLulusSeleksi ?? null,
      jumlahRegistrasi: body.jumlahRegistrasi ?? null,
    },
  });
  void enqueueDayaTampungPayload(created.id, 'create');
  void writeAudit(req, { action: 'daya_tampung.create', entity: 'daya_tampung' as any, entityId: created.id });
  res.status(201).json(created);
});

dayaTampungRouter.patch('/daya-tampung/:id', async (req, res) => {
  const body = upsertSchema.partial().omit({ prodiId: true, semesterId: true }).parse(req.body);
  const exist = await prisma.dayaTampungProdi.findUnique({ where: { id: req.params.id } });
  if (!exist) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && exist.prodiId !== scopeId) throw Forbidden();

  const updated = await prisma.dayaTampungProdi.update({
    where: { id: req.params.id },
    data: body,
  });
  void enqueueDayaTampungPayload(updated.id, 'update');
  void writeAudit(req, { action: 'daya_tampung.update', entity: 'daya_tampung' as any, entityId: updated.id });
  res.json(updated);
});

dayaTampungRouter.delete('/daya-tampung/:id', async (req, res) => {
  const exist = await prisma.dayaTampungProdi.findUnique({ where: { id: req.params.id } });
  if (!exist) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && exist.prodiId !== scopeId) throw Forbidden();
  if (exist.feederId) {
    void enqueueDayaTampungPayload(exist.id, 'delete');
  }
  await prisma.dayaTampungProdi.delete({ where: { id: req.params.id } });
  void writeAudit(req, { action: 'daya_tampung.delete', entity: 'daya_tampung' as any, entityId: req.params.id });
  res.json({ ok: true });
});

async function enqueueDayaTampungPayload(id: string, op: 'create' | 'update' | 'delete') {
  const payload = await buildFeederPayload('daya_tampung' as any, id);
  if (!payload) return;
  await enqueueFeederChange({ entity: 'daya_tampung' as any, entityId: id, operation: op, payload });
}
