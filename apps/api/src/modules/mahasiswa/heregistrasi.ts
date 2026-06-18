import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser, getActiveSemester } from '../../lib/context.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const heregistrasiRouter = Router();

heregistrasiRouter.get('/heregistrasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.heregistrasi.findMany({
    where: { mahasiswaId: m.id },
    include: { semester: { include: { tahunAjaran: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

heregistrasiRouter.get('/heregistrasi/aktif', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const sem = await getActiveSemester();
  const h = await prisma.heregistrasi.findUnique({
    where: { mahasiswaId_semesterId: { mahasiswaId: m.id, semesterId: sem.id } },
    include: { semester: { include: { tahunAjaran: true } } },
  });
  res.json({ semester: { id: sem.id, kode: sem.kode }, heregistrasi: h ?? null });
});

const createSchema = z.object({
  jenis: z.enum(['aktif', 'cuti']),
  alasan: z.string().max(2000).optional().nullable(),
  dokumenUrl: z.string().url().max(2000).optional().nullable(),
});

heregistrasiRouter.post('/heregistrasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const sem = await getActiveSemester();
  const body = createSchema.parse(req.body);
  if (body.jenis === 'cuti' && (!body.alasan || body.alasan.trim().length < 10)) {
    throw BadRequest('Pengajuan cuti wajib menyertakan alasan minimal 10 karakter');
  }
  const exists = await prisma.heregistrasi.findUnique({
    where: { mahasiswaId_semesterId: { mahasiswaId: m.id, semesterId: sem.id } },
  });
  if (exists) throw Conflict('Heregistrasi semester ini sudah pernah diajukan');

  const created = await prisma.heregistrasi.create({
    data: {
      mahasiswaId: m.id,
      semesterId: sem.id,
      jenis: body.jenis,
      alasan: body.alasan ?? null,
      dokumenUrl: body.dokumenUrl ?? null,
      status: 'diajukan',
    },
  });
  void writeAudit(req, {
    action: 'heregistrasi.ajukan',
    entity: 'heregistrasi',
    entityId: created.id,
    metadata: { jenis: body.jenis, semesterId: sem.id },
  });
  res.status(201).json(created);
});

heregistrasiRouter.delete('/heregistrasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const h = await prisma.heregistrasi.findUnique({ where: { id: req.params.id } });
  if (!h || h.mahasiswaId !== m.id) throw NotFound();
  if (h.status !== 'diajukan') throw BadRequest('Hanya pengajuan yang masih diajukan yang bisa dibatalkan');
  await prisma.heregistrasi.delete({ where: { id: h.id } });
  res.status(204).end();
});
