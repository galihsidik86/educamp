import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const prestasiAdminRouter = Router();

prestasiAdminRouter.get('/prestasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.prestasi.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(q && { OR: [
        { nama: { contains: q } },
        { mahasiswa: { is: { OR: [{ nim: { contains: q } }, { nama: { contains: q } }] } } },
      ] }),
    },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ items });
});

const verifSchema = z.object({
  action: z.enum(['verifikasi', 'tolak']),
  catatan: z.string().max(500).optional().nullable(),
});

prestasiAdminRouter.post('/prestasi/:id/verifikasi', async (req, res) => {
  const exists = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Prestasi tidak ditemukan');
  if (exists.status !== 'diajukan' && exists.status !== 'draft') throw BadRequest('Prestasi sudah diverifikasi sebelumnya');
  const body = verifSchema.parse(req.body);
  const updated = await prisma.prestasi.update({
    where: { id: exists.id },
    data: {
      status: body.action === 'verifikasi' ? 'diverifikasi' : 'ditolak',
      catatanVerifikator: body.catatan ?? null,
      diverifikasiOleh: req.user!.sub,
      diverifikasiPada: new Date(),
    },
  });
  void writeAudit(req, {
    action: `prestasi.${body.action}.akademik`,
    entity: 'prestasi',
    entityId: exists.id,
    metadata: { mahasiswaId: exists.mahasiswaId },
  });
  void (async () => {
    const userId = await userIdFromMahasiswa(exists.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: body.action === 'verifikasi' ? 'Prestasi Anda diverifikasi' : 'Prestasi Anda ditolak',
      body: `${exists.nama}${body.catatan ? `. Catatan: ${body.catatan}` : ''}`,
      type: 'prestasi',
      link: '/mahasiswa/prestasi',
      entity: 'prestasi',
      entityId: exists.id,
    });
  })();
  res.json(updated);
});

prestasiAdminRouter.delete('/prestasi/:id', async (req, res) => {
  const exists = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Prestasi tidak ditemukan');
  await prisma.prestasi.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'prestasi.delete.akademik', entity: 'prestasi', entityId: exists.id });
  res.status(204).end();
});
