import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const sertifikasiAdminRouter = Router();

sertifikasiAdminRouter.get('/sertifikasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.sertifikasi.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(q && { OR: [
        { nama: { contains: q } },
        { penerbit: { contains: q } },
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

sertifikasiAdminRouter.post('/sertifikasi/:id/verifikasi', async (req, res) => {
  const exists = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikasi tidak ditemukan');
  if (exists.status !== 'diajukan' && exists.status !== 'draft') throw BadRequest('Sudah diverifikasi sebelumnya');
  const body = verifSchema.parse(req.body);
  const updated = await prisma.sertifikasi.update({
    where: { id: exists.id },
    data: {
      status: body.action === 'verifikasi' ? 'diverifikasi' : 'ditolak',
      catatanVerifikator: body.catatan ?? null,
      diverifikasiOleh: req.user!.sub,
      diverifikasiPada: new Date(),
    },
  });
  void writeAudit(req, {
    action: `sertifikasi.${body.action}.akademik`,
    entity: 'sertifikasi',
    entityId: exists.id,
    metadata: { mahasiswaId: exists.mahasiswaId },
  });
  void (async () => {
    const userId = await userIdFromMahasiswa(exists.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: body.action === 'verifikasi' ? 'Sertifikasi Anda diverifikasi' : 'Sertifikasi Anda ditolak',
      body: `${exists.nama}${body.catatan ? `. Catatan: ${body.catatan}` : ''}`,
      type: 'sertifikasi',
      link: '/mahasiswa/sertifikasi',
      entity: 'sertifikasi',
      entityId: exists.id,
    });
  })();
  res.json(updated);
});

sertifikasiAdminRouter.delete('/sertifikasi/:id', async (req, res) => {
  const exists = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikasi tidak ditemukan');
  await prisma.sertifikasi.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'sertifikasi.delete.akademik', entity: 'sertifikasi', entityId: exists.id });
  res.status(204).end();
});
