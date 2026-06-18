import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getAkademikForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const heregistrasiAdminRouter = Router();

heregistrasiAdminRouter.get('/heregistrasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  const q = (req.query.q as string | undefined)?.trim();
  const items = await prisma.heregistrasi.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(semesterId && { semesterId }),
      ...(q && { mahasiswa: { is: { OR: [{ nim: { contains: q } }, { nama: { contains: q } }] } } }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      semester: { include: { tahunAjaran: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({ items });
});

const verifSchema = z.object({
  status: z.enum(['disetujui', 'ditolak']),
  catatanAkademik: z.string().max(2000).optional().nullable(),
});

heregistrasiAdminRouter.patch('/heregistrasi/:id/verifikasi', async (req, res) => {
  const akd = await getAkademikForUser(req.user!.sub);
  const h = await prisma.heregistrasi.findUnique({ where: { id: req.params.id }, include: { mahasiswa: true } });
  if (!h) throw NotFound('Heregistrasi tidak ditemukan');
  if (h.status !== 'diajukan') throw BadRequest(`Status ${h.status} tidak dapat diverifikasi`);

  const body = verifSchema.parse(req.body);
  const updated = await prisma.heregistrasi.update({
    where: { id: h.id },
    data: {
      status: body.status,
      catatanAkademik: body.catatanAkademik ?? null,
      diverifikasiOleh: akd.id,
      diverifikasiPada: new Date(),
    },
  });

  // Sinkronisasi status mahasiswa kalau disetujui
  if (body.status === 'disetujui') {
    const newStatus = h.jenis === 'cuti' ? 'cuti' : 'aktif';
    await prisma.mahasiswa.update({ where: { id: h.mahasiswaId }, data: { status: newStatus as any } });
  }

  void writeAudit(req, {
    action: `heregistrasi.${body.status}`,
    entity: 'heregistrasi',
    entityId: updated.id,
    metadata: { mahasiswaId: h.mahasiswaId, semesterId: h.semesterId, jenis: h.jenis },
  });

  void (async () => {
    const userId = await userIdFromMahasiswa(h.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Heregistrasi ${body.status === 'disetujui' ? 'disetujui' : 'ditolak'}`,
      body: body.catatanAkademik ?? `Heregistrasi ${h.jenis} Anda telah ${body.status}.`,
      type: 'heregistrasi',
      link: '/mahasiswa/heregistrasi',
      entity: 'heregistrasi',
      entityId: h.id,
      sendEmail: true,
    });
  })();

  res.json(updated);
});

heregistrasiAdminRouter.delete('/heregistrasi/:id', async (req, res) => {
  const h = await prisma.heregistrasi.findUnique({ where: { id: req.params.id } });
  if (!h) throw NotFound('Heregistrasi tidak ditemukan');
  if (h.status === 'disetujui') throw BadRequest('Heregistrasi yang sudah disetujui tidak dapat dihapus');
  await prisma.heregistrasi.delete({ where: { id: h.id } });
  void writeAudit(req, { action: 'heregistrasi.delete', entity: 'heregistrasi', entityId: h.id });
  res.status(204).end();
});
