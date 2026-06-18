import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const kategoriUktRouter = Router();

const schema = z.object({
  prodiId: z.string().uuid(),
  kode: z.string().min(2).max(30),
  nama: z.string().min(2).max(100),
  nominalSemester: z.number().nonnegative(),
  deskripsi: z.string().max(2000).optional().nullable(),
  isAktif: z.boolean().optional(),
});

kategoriUktRouter.get('/kategori-ukt', async (req, res) => {
  const prodiId = req.query.prodiId as string | undefined;
  const items = await prisma.kategoriUkt.findMany({
    where: { ...(prodiId && { prodiId }) },
    include: {
      prodi: { select: { kode: true, nama: true } },
      _count: { select: { mahasiswa: true } },
    },
    orderBy: [{ prodi: { kode: 'asc' } }, { kode: 'asc' }],
  });
  res.json({ items });
});

kategoriUktRouter.post('/kategori-ukt', async (req, res) => {
  const body = schema.parse(req.body);
  try {
    const created = await prisma.kategoriUkt.create({
      data: {
        prodiId: body.prodiId,
        kode: body.kode,
        nama: body.nama,
        nominalSemester: body.nominalSemester,
        deskripsi: body.deskripsi ?? null,
        isAktif: body.isAktif ?? true,
      },
    });
    void writeAudit(req, { action: 'kategori-ukt.create', entity: 'kategori-ukt', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode UKT sudah dipakai di prodi ini');
    throw e;
  }
});

kategoriUktRouter.patch('/kategori-ukt/:id', async (req, res) => {
  const exists = await prisma.kategoriUkt.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Kategori UKT tidak ditemukan');
  const body = schema.partial().parse(req.body);
  try {
    const updated = await prisma.kategoriUkt.update({ where: { id: exists.id }, data: body });
    void writeAudit(req, { action: 'kategori-ukt.update', entity: 'kategori-ukt', entityId: exists.id, metadata: { fields: Object.keys(body) } });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode UKT sudah dipakai di prodi ini');
    throw e;
  }
});

kategoriUktRouter.delete('/kategori-ukt/:id', async (req, res) => {
  const exists = await prisma.kategoriUkt.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { mahasiswa: true } } },
  });
  if (!exists) throw NotFound('Kategori UKT tidak ditemukan');
  if (exists._count.mahasiswa > 0) throw BadRequest(`Kategori dipakai oleh ${exists._count.mahasiswa} mahasiswa — re-assign dulu`);
  await prisma.kategoriUkt.delete({ where: { id: exists.id } });
  res.status(204).end();
});
