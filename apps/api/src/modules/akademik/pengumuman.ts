import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const pengumumanRouter = Router();

/** Target valid: "all" | "mahasiswa" | "dosen" | "prodi:<uuid>" */
const targetRegex = /^(all|mahasiswa|dosen|prodi:[0-9a-f-]{36})$/;

const bodySchema = z.object({
  judul: z.string().min(3).max(150),
  isi: z.string().min(1).max(5000),
  target: z.string().regex(targetRegex, 'Target harus all, mahasiswa, dosen, atau prodi:<id>'),
  pengirim: z.string().max(80).optional().nullable(),
  isPenting: z.boolean().optional(),
  tanggal: z.string().optional().nullable(),
});

/** List pengumuman, terbaru di atas. Filter opsional ?target=. */
pengumumanRouter.get('/pengumuman', async (req, res) => {
  const target = req.query.target as string | undefined;
  const items = await prisma.pengumuman.findMany({
    where: target ? { target } : undefined,
    orderBy: [{ isPenting: 'desc' }, { tanggal: 'desc' }],
  });
  res.json({ items });
});

pengumumanRouter.post('/pengumuman', async (req, res) => {
  const body = bodySchema.parse(req.body);
  const created = await prisma.pengumuman.create({
    data: {
      judul: body.judul,
      isi: body.isi,
      target: body.target,
      pengirim: body.pengirim ?? null,
      isPenting: body.isPenting ?? false,
      tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
    },
  });
  void writeAudit(req, {
    action: 'pengumuman.create',
    entity: 'pengumuman',
    entityId: created.id,
    metadata: { target: created.target, isPenting: created.isPenting },
  });
  res.status(201).json(created);
});

pengumumanRouter.patch('/pengumuman/:id', async (req, res) => {
  const exists = await prisma.pengumuman.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Pengumuman tidak ditemukan');
  const body = bodySchema.partial().parse(req.body);

  const data: any = { ...body };
  if (body.tanggal !== undefined) data.tanggal = body.tanggal ? new Date(body.tanggal) : exists.tanggal;
  const updated = await prisma.pengumuman.update({ where: { id: exists.id }, data });
  void writeAudit(req, {
    action: 'pengumuman.update',
    entity: 'pengumuman',
    entityId: updated.id,
  });
  res.json(updated);
});

pengumumanRouter.delete('/pengumuman/:id', async (req, res) => {
  const exists = await prisma.pengumuman.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Pengumuman tidak ditemukan');
  await prisma.pengumuman.delete({ where: { id: exists.id } });
  void writeAudit(req, {
    action: 'pengumuman.delete',
    entity: 'pengumuman',
    entityId: exists.id,
    metadata: { judul: exists.judul, target: exists.target },
  });
  res.status(204).end();
});
