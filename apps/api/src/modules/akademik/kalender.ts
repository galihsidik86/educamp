import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const kalenderRouter = Router();

const JENIS = ['ujian', 'libur', 'registrasi', 'wisuda', 'akademik', 'lain'] as const;
const TARGET = ['all', 'mahasiswa', 'dosen'] as const;

const bodySchema = z.object({
  judul: z.string().min(3).max(150),
  deskripsi: z.string().max(2000).optional().nullable(),
  jenis: z.enum(JENIS).default('akademik'),
  tanggalMulai: z.string().min(1),
  tanggalSelesai: z.string().optional().nullable(),
  target: z.enum(TARGET).default('all'),
  warna: z.string().max(40).optional().nullable(),
  semesterId: z.string().uuid().optional().nullable(),
});

kalenderRouter.get('/kalender', async (req, res) => {
  const semesterId = req.query.semesterId as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const items = await prisma.kalenderAkademik.findMany({
    where: {
      ...(semesterId && { semesterId }),
      ...(jenis && { jenis: jenis as any }),
    },
    include: { semester: { include: { tahunAjaran: true } } },
    orderBy: { tanggalMulai: 'asc' },
  });
  res.json({ items });
});

kalenderRouter.post('/kalender', async (req, res) => {
  const body = bodySchema.parse(req.body);
  const created = await prisma.kalenderAkademik.create({
    data: {
      judul: body.judul,
      deskripsi: body.deskripsi ?? null,
      jenis: body.jenis,
      tanggalMulai: new Date(body.tanggalMulai),
      tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null,
      target: body.target,
      warna: body.warna ?? null,
      semesterId: body.semesterId ?? null,
    },
  });
  void writeAudit(req, { action: 'kalender.create', entity: 'kalender', entityId: created.id, metadata: { judul: created.judul, jenis: created.jenis } });
  res.status(201).json(created);
});

kalenderRouter.patch('/kalender/:id', async (req, res) => {
  const exists = await prisma.kalenderAkademik.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Event kalender tidak ditemukan');
  const body = bodySchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggalMulai !== undefined) data.tanggalMulai = new Date(body.tanggalMulai);
  if (body.tanggalSelesai !== undefined) data.tanggalSelesai = body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;
  const updated = await prisma.kalenderAkademik.update({ where: { id: exists.id }, data });
  res.json(updated);
});

kalenderRouter.delete('/kalender/:id', async (req, res) => {
  const exists = await prisma.kalenderAkademik.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Event kalender tidak ditemukan');
  await prisma.kalenderAkademik.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'kalender.delete', entity: 'kalender', entityId: exists.id, metadata: { judul: exists.judul } });
  res.status(204).end();
});
