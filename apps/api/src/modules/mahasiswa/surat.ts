import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const suratRouter = Router();

const JENIS = ['aktif_kuliah', 'keterangan_mahasiswa', 'pengantar_beasiswa', 'pengantar_penelitian', 'pengantar_magang', 'pengganti_ktm', 'lainnya'] as const;

const ajukanSchema = z.object({
  jenis: z.enum(JENIS),
  judul: z.string().min(5).max(150),
  keperluan: z.string().min(10).max(2000),
});

suratRouter.get('/surat', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.surat.findMany({
    where: { mahasiswaId: m.id },
    orderBy: { tanggalDiajukan: 'desc' },
  });
  res.json({ items: rows });
});

suratRouter.get('/surat/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const s = await prisma.surat.findUnique({ where: { id: req.params.id } });
  if (!s || s.mahasiswaId !== m.id) throw NotFound('Surat tidak ditemukan');
  res.json(s);
});

suratRouter.post('/surat', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = ajukanSchema.parse(req.body);
  // Cegah duplikat aktif dengan jenis sama
  const aktif = await prisma.surat.findFirst({
    where: { mahasiswaId: m.id, jenis: body.jenis, status: { in: ['diajukan', 'disetujui'] } },
  });
  if (aktif) throw BadRequest(`Anda masih memiliki permohonan ${body.jenis} aktif`);

  const created = await prisma.surat.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      judul: body.judul,
      keperluan: body.keperluan,
      status: 'diajukan',
    },
  });
  void writeAudit(req, {
    action: 'surat.ajukan',
    entity: 'surat',
    entityId: created.id,
    metadata: { jenis: body.jenis, judul: body.judul },
  });
  res.status(201).json(created);
});

suratRouter.delete('/surat/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.surat.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Surat tidak ditemukan');
  if (item.status !== 'diajukan' && item.status !== 'ditolak') {
    throw Forbidden('Hanya permohonan diajukan/ditolak yang dapat dibatalkan');
  }
  await prisma.surat.update({ where: { id: item.id }, data: { status: 'batal' } });
  res.status(204).end();
});
