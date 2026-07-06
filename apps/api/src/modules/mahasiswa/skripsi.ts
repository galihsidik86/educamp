import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';

export const skripsiRouter = Router();

const ajukanSchema = z.object({
  judul: z.string().min(10).max(500),
  abstrak: z.string().max(5000).optional().nullable(),
  topik: z.string().max(150).optional().nullable(),
});

const updateSchema = z.object({
  linkDokumen: optionalHttpUrl, // http/https saja — anti stored-XSS
  abstrak: z.string().max(5000).optional().nullable(),
});

const STATUS_AKTIF = ['diajukan', 'disetujui', 'proposal', 'penelitian', 'sidang'] as const;

function dosenLabel(d: { gelarDepan: string | null; nama: string; gelarBelakang: string | null } | null): string | null {
  if (!d) return null;
  return [d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ');
}

skripsiRouter.get('/skripsi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.skripsi.findMany({
    where: { mahasiswaId: m.id },
    include: {
      pembimbing1: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
      pembimbing2: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
    },
    orderBy: { tanggalAjuan: 'desc' },
  });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      judul: r.judul,
      abstrak: r.abstrak,
      topik: r.topik,
      status: r.status,
      catatan: r.catatan,
      tanggalAjuan: r.tanggalAjuan,
      tanggalDisetujui: r.tanggalDisetujui,
      tanggalSidang: r.tanggalSidang,
      nilaiHuruf: r.nilaiHuruf,
      linkDokumen: r.linkDokumen,
      pembimbing1: dosenLabel(r.pembimbing1),
      pembimbing2: dosenLabel(r.pembimbing2),
    })),
  });
});

skripsiRouter.post('/skripsi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = ajukanSchema.parse(req.body);
  const aktif = await prisma.skripsi.findFirst({
    where: { mahasiswaId: m.id, status: { in: STATUS_AKTIF as any } },
  });
  if (aktif) throw BadRequest('Anda masih memiliki pengajuan/skripsi aktif. Selesaikan atau batalkan dulu.');

  const created = await prisma.skripsi.create({
    data: {
      mahasiswaId: m.id,
      judul: body.judul,
      abstrak: body.abstrak ?? null,
      topik: body.topik ?? null,
      status: 'diajukan',
    },
  });
  void writeAudit(req, {
    action: 'skripsi.ajukan',
    entity: 'skripsi',
    entityId: created.id,
    metadata: { judul: body.judul },
  });
  res.status(201).json(created);
});

skripsiRouter.patch('/skripsi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.skripsi.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Skripsi tidak ditemukan');
  const body = updateSchema.parse(req.body);
  const updated = await prisma.skripsi.update({ where: { id: item.id }, data: body });
  res.json(updated);
});

skripsiRouter.delete('/skripsi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.skripsi.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Skripsi tidak ditemukan');
  if (item.status !== 'diajukan' && item.status !== 'ditolak') {
    throw Forbidden('Hanya pengajuan yang belum disetujui atau ditolak yang dapat dibatalkan');
  }
  // Tandai sebagai batal supaya jejak tetap ada (tidak benar-benar dihapus).
  await prisma.skripsi.update({ where: { id: item.id }, data: { status: 'batal' } });
  res.status(204).end();
});
