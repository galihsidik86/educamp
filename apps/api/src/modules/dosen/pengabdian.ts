import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser } from '../../lib/context.js';
import { Conflict, Forbidden, NotFound } from '../../lib/errors.js';

export const pengabdianRouter = Router();

const STATUSES = ['proposal', 'disetujui', 'berjalan', 'selesai', 'ditolak'] as const;

const createSchema = z.object({
  judul: z.string().min(3),
  deskripsi: z.string().max(5000).optional(),
  tahun: z.number().int().min(2000).max(2100),
  lokasi: z.string().optional(),
  sumberDana: z.string().optional(),
  jumlahDana: z.number().nonnegative().optional(),
  status: z.enum(STATUSES).default('proposal'),
});

const updateSchema = createSchema.partial();

pengabdianRouter.get('/pengabdian', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const items = await prisma.pengabdian.findMany({
    where: { ketuaDosenId: d.id },
    include: {
      mahasiswa: { include: { mahasiswa: { select: { id: true, nim: true, nama: true } } } },
    },
    orderBy: [{ tahun: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({
    items: items.map((p) => ({
      id: p.id, judul: p.judul, deskripsi: p.deskripsi, tahun: p.tahun, lokasi: p.lokasi,
      sumberDana: p.sumberDana, jumlahDana: p.jumlahDana ? Number(p.jumlahDana) : null,
      status: p.status,
      anggota: p.mahasiswa.map((a) => ({ id: a.id, peran: a.peran, mahasiswa: a.mahasiswa })),
    })),
  });
});

pengabdianRouter.post('/pengabdian', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const body = createSchema.parse(req.body);
  const created = await prisma.pengabdian.create({
    data: { ...body, ketuaDosenId: d.id, jumlahDana: body.jumlahDana ?? null },
  });
  res.status(201).json(created);
});

pengabdianRouter.patch('/pengabdian/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const p = await prisma.pengabdian.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound();
  if (p.ketuaDosenId !== d.id) throw Forbidden('Bukan pengabdian Anda');
  const body = updateSchema.parse(req.body);
  const updated = await prisma.pengabdian.update({
    where: { id: p.id },
    data: { ...body, jumlahDana: body.jumlahDana ?? p.jumlahDana },
  });
  res.json(updated);
});

pengabdianRouter.delete('/pengabdian/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const p = await prisma.pengabdian.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound();
  if (p.ketuaDosenId !== d.id) throw Forbidden('Bukan pengabdian Anda');
  await prisma.pengabdian.delete({ where: { id: p.id } });
  res.status(204).end();
});

const anggotaSchema = z.object({ nim: z.string().min(3), peran: z.string().min(1).max(50) });

pengabdianRouter.post('/pengabdian/:id/anggota', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const p = await prisma.pengabdian.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound();
  if (p.ketuaDosenId !== d.id) throw Forbidden('Bukan pengabdian Anda');

  const { nim, peran } = anggotaSchema.parse(req.body);
  const mhs = await prisma.mahasiswa.findUnique({ where: { nim } });
  if (!mhs) throw NotFound('Mahasiswa dengan NIM tersebut tidak ditemukan');

  const existing = await prisma.pengabdianMahasiswa.findUnique({
    where: { pengabdianId_mahasiswaId: { pengabdianId: p.id, mahasiswaId: mhs.id } },
  });
  if (existing) throw Conflict('Mahasiswa sudah terdaftar');

  const created = await prisma.pengabdianMahasiswa.create({
    data: { pengabdianId: p.id, mahasiswaId: mhs.id, peran },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
  });
  res.status(201).json(created);
});

pengabdianRouter.delete('/pengabdian/:id/anggota/:anggotaId', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const p = await prisma.pengabdian.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound();
  if (p.ketuaDosenId !== d.id) throw Forbidden('Bukan pengabdian Anda');

  await prisma.pengabdianMahasiswa.deleteMany({
    where: { id: req.params.anggotaId, pengabdianId: p.id },
  });
  res.status(204).end();
});
