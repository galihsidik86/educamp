import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';

export const kurikulumRouter = Router();

// ============================================================
// Prodi & Fakultas — read + simple create/update
// ============================================================

kurikulumRouter.get('/fakultas', async (_req, res) => {
  res.json({ items: await prisma.fakultas.findMany({ orderBy: { kode: 'asc' } }) });
});

kurikulumRouter.get('/prodi', async (_req, res) => {
  const items = await prisma.prodi.findMany({
    include: {
      fakultas: { select: { kode: true, nama: true } },
      _count: { select: { mahasiswa: true, dosen: true, mataKuliah: true } },
    },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

const prodiSchema = z.object({
  kode: z.string().min(2).max(20),
  nama: z.string().min(3).max(120),
  jenjang: z.enum(['d3', 'd4', 's1', 's2', 's3', 'profesi']),
  fakultasId: z.string().uuid(),
});

kurikulumRouter.post('/prodi', async (req, res) => {
  const body = prodiSchema.parse(req.body);
  if (await prisma.prodi.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode prodi sudah dipakai');
  res.status(201).json(await prisma.prodi.create({ data: body }));
});

kurikulumRouter.patch('/prodi/:id', async (req, res) => {
  const body = prodiSchema.partial().parse(req.body);
  res.json(await prisma.prodi.update({ where: { id: req.params.id }, data: body }));
});

// ============================================================
// Mata Kuliah
// ============================================================

const mkSchema = z.object({
  kode: z.string().min(2).max(20),
  nama: z.string().min(2).max(120),
  namaInggris: z.string().max(120).optional(),
  sks: z.number().int().min(1).max(10),
  sksTeori: z.number().int().min(0).max(10).default(0),
  sksPraktik: z.number().int().min(0).max(10).default(0),
  jenis: z.enum(['wajib_universitas', 'wajib_prodi', 'pilihan']).default('wajib_prodi'),
  prodiId: z.string().uuid(),
});

kurikulumRouter.get('/mata-kuliah', async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  const prodiId = req.query.prodiId as string | undefined;
  const items = await prisma.mataKuliah.findMany({
    where: {
      ...(search && { OR: [{ kode: { contains: search } }, { nama: { contains: search } }] }),
      ...(prodiId && { prodiId }),
    },
    include: { prodi: { select: { kode: true, nama: true } } },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

kurikulumRouter.post('/mata-kuliah', async (req, res) => {
  const body = mkSchema.parse(req.body);
  if (await prisma.mataKuliah.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode MK sudah dipakai');
  res.status(201).json(await prisma.mataKuliah.create({ data: body }));
});

kurikulumRouter.patch('/mata-kuliah/:id', async (req, res) => {
  const body = mkSchema.partial().parse(req.body);
  res.json(await prisma.mataKuliah.update({ where: { id: req.params.id }, data: body }));
});

kurikulumRouter.delete('/mata-kuliah/:id', async (req, res) => {
  const usage = await prisma.kelas.count({ where: { mataKuliahId: req.params.id } });
  if (usage > 0) throw Conflict(`Mata kuliah dipakai di ${usage} kelas — hapus kelas terlebih dahulu`);
  await prisma.mataKuliah.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ============================================================
// Ruangan
// ============================================================

kurikulumRouter.get('/ruangan', async (_req, res) => {
  res.json({ items: await prisma.ruangan.findMany({ orderBy: { kode: 'asc' } }) });
});

const ruanganSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(2).max(60),
  gedung: z.string().max(60).optional(),
  lantai: z.number().int().min(0).max(20).optional(),
  kapasitas: z.number().int().min(0).max(500).default(0),
});

kurikulumRouter.post('/ruangan', async (req, res) => {
  const body = ruanganSchema.parse(req.body);
  if (await prisma.ruangan.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode ruangan sudah dipakai');
  res.status(201).json(await prisma.ruangan.create({ data: body }));
});

// ============================================================
// Kelas (Penawaran) — assign MK × semester × dosen × jadwal
// ============================================================

const kelasSchema = z.object({
  mataKuliahId: z.string().uuid(),
  semesterId: z.string().uuid(),
  dosenId: z.string().uuid(),
  ruanganId: z.string().uuid().optional().nullable(),
  kodeKelas: z.string().min(1).max(8),
  kapasitas: z.number().int().min(1).max(500).default(40),
  hari: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']).optional().nullable(),
  jamMulai: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  jamSelesai: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

kurikulumRouter.get('/kelas', async (req, res) => {
  const semesterId = req.query.semesterId as string | undefined;
  const dosenId = req.query.dosenId as string | undefined;
  const items = await prisma.kelas.findMany({
    where: {
      ...(semesterId && { semesterId }),
      ...(dosenId && { dosenId }),
    },
    include: {
      mataKuliah: { select: { kode: true, nama: true, sks: true } },
      dosen: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
      ruangan: { select: { kode: true } },
      semester: { include: { tahunAjaran: true } },
      _count: { select: { krs: true } },
    },
    orderBy: [{ semester: { kode: 'desc' } }, { hari: 'asc' }, { jamMulai: 'asc' }],
  });
  res.json({ items });
});

kurikulumRouter.post('/kelas', async (req, res) => {
  const body = kelasSchema.parse(req.body);
  if (body.jamMulai && body.jamSelesai && body.jamMulai >= body.jamSelesai) {
    throw BadRequest('Jam mulai harus lebih awal dari jam selesai');
  }
  try {
    const created = await prisma.kelas.create({ data: body });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kombinasi MK + semester + kode kelas sudah ada');
    throw e;
  }
});

kurikulumRouter.patch('/kelas/:id', async (req, res) => {
  const body = kelasSchema.partial().parse(req.body);
  res.json(await prisma.kelas.update({ where: { id: req.params.id }, data: body }));
});

kurikulumRouter.delete('/kelas/:id', async (req, res) => {
  const usage = await prisma.krs.count({ where: { kelasId: req.params.id } });
  if (usage > 0) throw Conflict(`Kelas dipakai di ${usage} KRS — pindahkan atau batalkan KRS terlebih dahulu`);
  await prisma.kelas.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
