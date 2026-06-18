import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const spmiRtmRouter = Router();

const STATUS_RTM = ['perencanaan', 'selesai'] as const;
const STATUS_KEP = ['open', 'in_progress', 'done', 'cancelled'] as const;

const rtmSchema = z.object({
  kode: z.string().min(3).max(40),
  judul: z.string().min(5).max(200),
  tanggal: z.string(),
  agenda: z.string().min(5).max(10000),
  notulen: z.string().max(20000).optional().nullable(),
  peserta: z.string().max(5000).optional().nullable(),
  status: z.enum(STATUS_RTM).optional(),
});

spmiRtmRouter.get('/spmi/rtm', async (req, res) => {
  const status = req.query.status as string | undefined;
  const items = await prisma.rapatTinjauanManajemen.findMany({
    where: { ...(status && STATUS_RTM.includes(status as any) && { status: status as any }) },
    include: { _count: { select: { keputusan: true } } },
    orderBy: { tanggal: 'desc' },
  });
  res.json({ items });
});

spmiRtmRouter.get('/spmi/rtm/:id', async (req, res) => {
  const rtm = await prisma.rapatTinjauanManajemen.findUnique({
    where: { id: req.params.id },
    include: {
      keputusan: {
        include: {
          picUser: { select: { id: true, email: true, akademik: { select: { nama: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!rtm) throw NotFound('RTM tidak ditemukan');
  res.json(rtm);
});

spmiRtmRouter.post('/spmi/rtm', async (req, res) => {
  const body = rtmSchema.parse(req.body);
  try {
    const created = await prisma.rapatTinjauanManajemen.create({
      data: {
        kode: body.kode,
        judul: body.judul,
        tanggal: new Date(body.tanggal),
        agenda: body.agenda,
        notulen: body.notulen ?? null,
        peserta: body.peserta ?? null,
        status: body.status ?? 'perencanaan',
      },
    });
    void writeAudit(req, { action: 'spmi.rtm.create', entity: 'rtm', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode RTM sudah dipakai');
    throw e;
  }
});

spmiRtmRouter.patch('/spmi/rtm/:id', async (req, res) => {
  const exists = await prisma.rapatTinjauanManajemen.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('RTM tidak ditemukan');
  const body = rtmSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggal) data.tanggal = new Date(body.tanggal);
  const updated = await prisma.rapatTinjauanManajemen.update({ where: { id: exists.id }, data });
  void writeAudit(req, { action: 'spmi.rtm.update', entity: 'rtm', entityId: exists.id, metadata: { fields: Object.keys(body) } });
  res.json(updated);
});

spmiRtmRouter.delete('/spmi/rtm/:id', async (req, res) => {
  const exists = await prisma.rapatTinjauanManajemen.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('RTM tidak ditemukan');
  await prisma.rapatTinjauanManajemen.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'spmi.rtm.delete', entity: 'rtm', entityId: exists.id });
  res.status(204).end();
});

// -------- Keputusan RTM --------

const keputusanSchema = z.object({
  deskripsi: z.string().min(5).max(5000),
  picUserId: z.string().uuid().optional().nullable(),
  picCatatan: z.string().max(200).optional().nullable(),
  targetSelesai: z.string().optional().nullable(),
  catatan: z.string().max(5000).optional().nullable(),
});

spmiRtmRouter.post('/spmi/rtm/:id/keputusan', async (req, res) => {
  const rtm = await prisma.rapatTinjauanManajemen.findUnique({ where: { id: req.params.id } });
  if (!rtm) throw NotFound('RTM tidak ditemukan');
  const body = keputusanSchema.parse(req.body);
  if (body.picUserId) {
    const u = await prisma.user.findUnique({ where: { id: body.picUserId } });
    if (!u) throw BadRequest('PIC user tidak ditemukan');
  }
  const created = await prisma.keputusanRtm.create({
    data: {
      rtmId: rtm.id,
      deskripsi: body.deskripsi,
      picUserId: body.picUserId ?? null,
      picCatatan: body.picCatatan ?? null,
      targetSelesai: body.targetSelesai ? new Date(body.targetSelesai) : null,
      catatan: body.catatan ?? null,
    },
  });
  void writeAudit(req, { action: 'spmi.rtm.keputusan.create', entity: 'keputusan-rtm', entityId: created.id, metadata: { rtmId: rtm.id } });
  res.status(201).json(created);
});

const keputusanUpdateSchema = keputusanSchema.partial().extend({
  status: z.enum(STATUS_KEP).optional(),
});

spmiRtmRouter.patch('/spmi/keputusan/:keputusanId', async (req, res) => {
  const k = await prisma.keputusanRtm.findUnique({ where: { id: req.params.keputusanId } });
  if (!k) throw NotFound('Keputusan tidak ditemukan');
  const body = keputusanUpdateSchema.parse(req.body);
  const data: any = { ...body };
  if (body.targetSelesai !== undefined) data.targetSelesai = body.targetSelesai ? new Date(body.targetSelesai) : null;
  const updated = await prisma.keputusanRtm.update({ where: { id: k.id }, data });
  res.json(updated);
});

spmiRtmRouter.delete('/spmi/keputusan/:keputusanId', async (req, res) => {
  const k = await prisma.keputusanRtm.findUnique({ where: { id: req.params.keputusanId } });
  if (!k) throw NotFound('Keputusan tidak ditemukan');
  await prisma.keputusanRtm.delete({ where: { id: k.id } });
  res.status(204).end();
});
