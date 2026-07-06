import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';

export const prestasiRouter = Router();

const JENIS = ['lomba_akademik', 'lomba_non_akademik', 'kepanitiaan', 'organisasi', 'publikasi', 'lain'] as const;
const LEVEL = ['internasional', 'nasional', 'regional', 'lokal', 'internal'] as const;

const inputSchema = z.object({
  jenis: z.enum(JENIS),
  nama: z.string().min(3).max(200),
  penyelenggara: z.string().max(150).optional().nullable(),
  tanggal: z.string(),
  level: z.enum(LEVEL).optional().nullable(),
  peran: z.string().max(100).optional().nullable(),
  deskripsi: z.string().max(2000).optional().nullable(),
  // optionalHttpUrl: hanya http/https (cegah javascript:/data: stored-XSS saat
  // bukti ini ditampilkan sebagai link ke staf akademik). Kosong = tak diisi.
  fileUrl: optionalHttpUrl,
});

prestasiRouter.get('/prestasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.prestasi.findMany({ where: { mahasiswaId: m.id }, orderBy: { tanggal: 'desc' } });
  res.json({ items });
});

prestasiRouter.post('/prestasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = inputSchema.parse(req.body);
  const created = await prisma.prestasi.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      nama: body.nama,
      penyelenggara: body.penyelenggara ?? null,
      tanggal: new Date(body.tanggal),
      level: body.level ?? null,
      peran: body.peran ?? null,
      deskripsi: body.deskripsi ?? null,
      fileUrl: body.fileUrl ?? null,
      status: 'diajukan',
    },
  });
  void writeAudit(req, { action: 'prestasi.create.mahasiswa', entity: 'prestasi', entityId: created.id });
  res.status(201).json(created);
});

prestasiRouter.patch('/prestasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const exists = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Prestasi tidak ditemukan');
  if (exists.mahasiswaId !== m.id) throw Forbidden('Bukan prestasi Anda');
  if (exists.status === 'diverifikasi') throw BadRequest('Sudah diverifikasi, tidak bisa diubah');
  const body = inputSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggal) data.tanggal = new Date(body.tanggal);
  // Setiap edit ulang → status balik ke draft/diajukan
  data.status = 'diajukan';
  const updated = await prisma.prestasi.update({ where: { id: exists.id }, data });
  res.json(updated);
});

prestasiRouter.delete('/prestasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const exists = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Prestasi tidak ditemukan');
  if (exists.mahasiswaId !== m.id) throw Forbidden('Bukan prestasi Anda');
  if (exists.status === 'diverifikasi') throw BadRequest('Sudah diverifikasi, tidak bisa dihapus');
  await prisma.prestasi.delete({ where: { id: exists.id } });
  res.status(204).end();
});
