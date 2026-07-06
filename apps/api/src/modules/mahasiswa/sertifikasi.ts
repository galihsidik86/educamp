import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';

export const sertifikasiRouter = Router();

const JENIS = ['bahasa', 'kompetensi', 'pelatihan', 'lain'] as const;
const LEVEL = ['internasional', 'nasional', 'regional', 'lokal', 'internal'] as const;

const inputSchema = z.object({
  jenis: z.enum(JENIS),
  nama: z.string().min(3).max(200),
  penerbit: z.string().min(2).max(150),
  nomorSertifikat: z.string().max(100).optional().nullable(),
  tanggalTerbit: z.string(),
  tanggalKadaluwarsa: z.string().optional().nullable(),
  level: z.enum(LEVEL).optional().nullable(),
  skor: z.string().max(50).optional().nullable(),
  fileUrl: optionalHttpUrl, // http/https saja — anti stored-XSS pada link bukti
});

sertifikasiRouter.get('/sertifikasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.sertifikasi.findMany({ where: { mahasiswaId: m.id }, orderBy: { tanggalTerbit: 'desc' } });
  res.json({ items });
});

sertifikasiRouter.post('/sertifikasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = inputSchema.parse(req.body);
  const created = await prisma.sertifikasi.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      nama: body.nama,
      penerbit: body.penerbit,
      nomorSertifikat: body.nomorSertifikat ?? null,
      tanggalTerbit: new Date(body.tanggalTerbit),
      tanggalKadaluwarsa: body.tanggalKadaluwarsa ? new Date(body.tanggalKadaluwarsa) : null,
      level: body.level ?? null,
      skor: body.skor ?? null,
      fileUrl: body.fileUrl ?? null,
      status: 'diajukan',
    },
  });
  void writeAudit(req, { action: 'sertifikasi.create.mahasiswa', entity: 'sertifikasi', entityId: created.id });
  res.status(201).json(created);
});

sertifikasiRouter.patch('/sertifikasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const exists = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikasi tidak ditemukan');
  if (exists.mahasiswaId !== m.id) throw Forbidden('Bukan sertifikasi Anda');
  if (exists.status === 'diverifikasi') throw BadRequest('Sudah diverifikasi, tidak bisa diubah');
  const body = inputSchema.partial().parse(req.body);
  const data: any = { ...body, status: 'diajukan' };
  if (body.tanggalTerbit) data.tanggalTerbit = new Date(body.tanggalTerbit);
  if (body.tanggalKadaluwarsa !== undefined) data.tanggalKadaluwarsa = body.tanggalKadaluwarsa ? new Date(body.tanggalKadaluwarsa) : null;
  const updated = await prisma.sertifikasi.update({ where: { id: exists.id }, data });
  res.json(updated);
});

sertifikasiRouter.delete('/sertifikasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const exists = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikasi tidak ditemukan');
  if (exists.mahasiswaId !== m.id) throw Forbidden('Bukan sertifikasi Anda');
  if (exists.status === 'diverifikasi') throw BadRequest('Sudah diverifikasi, tidak bisa dihapus');
  await prisma.sertifikasi.delete({ where: { id: exists.id } });
  res.status(204).end();
});
