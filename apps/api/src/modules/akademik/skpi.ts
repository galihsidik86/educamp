import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getAkademikForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const skpiRouter = Router();

const verifSchema = z.object({
  status: z.enum(['diverifikasi', 'ditolak']),
  catatanVerifikator: z.string().max(1000).optional().nullable(),
});

// ---------- Sertifikasi ----------

skpiRouter.get('/skpi/sertifikasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.sertifikasi.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(q && {
        OR: [
          { nama: { contains: q } },
          { mahasiswa: { is: { nama: { contains: q } } } },
          { mahasiswa: { is: { nim: { contains: q } } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  res.json({ items });
});

skpiRouter.patch('/skpi/sertifikasi/:id', async (req, res) => {
  const akd = await getAkademikForUser(req.user!.sub);
  const s = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Sertifikat tidak ditemukan');
  if (s.status !== 'diajukan') throw BadRequest(`Status ${s.status} tidak dapat diverifikasi`);
  const body = verifSchema.parse(req.body);
  const updated = await prisma.sertifikasi.update({
    where: { id: s.id },
    data: {
      status: body.status,
      catatanVerifikator: body.catatanVerifikator ?? null,
      diverifikasiOleh: akd.id,
      diverifikasiPada: new Date(),
    },
  });
  void writeAudit(req, { action: `sertifikasi.${body.status}`, entity: 'sertifikasi', entityId: updated.id });

  void (async () => {
    const userId = await userIdFromMahasiswa(s.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Sertifikat "${s.nama}" ${body.status === 'diverifikasi' ? 'disetujui' : 'ditolak'}`,
      body: body.catatanVerifikator ?? undefined,
      type: 'skpi',
      link: '/mahasiswa/skpi',
      entity: 'sertifikasi',
      entityId: s.id,
    });
  })();

  res.json(updated);
});

// ---------- Prestasi ----------

skpiRouter.get('/skpi/prestasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.prestasi.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(q && {
        OR: [
          { nama: { contains: q } },
          { mahasiswa: { is: { nama: { contains: q } } } },
          { mahasiswa: { is: { nim: { contains: q } } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  res.json({ items });
});

skpiRouter.patch('/skpi/prestasi/:id', async (req, res) => {
  const akd = await getAkademikForUser(req.user!.sub);
  const p = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound('Prestasi tidak ditemukan');
  if (p.status !== 'diajukan') throw BadRequest(`Status ${p.status} tidak dapat diverifikasi`);
  const body = verifSchema.parse(req.body);
  const updated = await prisma.prestasi.update({
    where: { id: p.id },
    data: {
      status: body.status,
      catatanVerifikator: body.catatanVerifikator ?? null,
      diverifikasiOleh: akd.id,
      diverifikasiPada: new Date(),
    },
  });
  void writeAudit(req, { action: `prestasi.${body.status}`, entity: 'prestasi', entityId: updated.id });

  void (async () => {
    const userId = await userIdFromMahasiswa(p.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Prestasi "${p.nama}" ${body.status === 'diverifikasi' ? 'disetujui' : 'ditolak'}`,
      body: body.catatanVerifikator ?? undefined,
      type: 'skpi',
      link: '/mahasiswa/skpi',
      entity: 'prestasi',
      entityId: p.id,
    });
  })();

  res.json(updated);
});
