import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getAkademikForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromDosen } from '../../lib/notifikasi.js';

export const bkdAdminRouter = Router();

/** List laporan BKD dengan filter status, semester, search dosen. */
bkdAdminRouter.get('/bkd', async (req, res) => {
  const status = req.query.status as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.bkdLaporan.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(semesterId && { semesterId }),
      ...(q && {
        OR: [
          { dosen: { is: { nama: { contains: q } } } },
          { dosen: { is: { nidn: { contains: q } } } },
        ],
      }),
    },
    include: {
      dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true, prodi: { select: { kode: true, nama: true } } } },
      semester: { include: { tahunAjaran: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  res.json({ items });
});

/** Detail laporan + items. */
bkdAdminRouter.get('/bkd/:id', async (req, res) => {
  const lap = await prisma.bkdLaporan.findUnique({
    where: { id: req.params.id },
    include: {
      dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true, prodi: { select: { kode: true, nama: true } } } },
      semester: { include: { tahunAjaran: true } },
      items: { orderBy: [{ kategori: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  res.json(lap);
});

const verifSchema = z.object({
  status: z.enum(['disetujui', 'ditolak']),
  catatanAkademik: z.string().max(2000).optional().nullable(),
});

bkdAdminRouter.patch('/bkd/:id/verifikasi', async (req, res) => {
  const akd = await getAkademikForUser(req.user!.sub);
  const lap = await prisma.bkdLaporan.findUnique({ where: { id: req.params.id } });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  if (lap.status !== 'diajukan') throw BadRequest(`Status ${lap.status} tidak dapat diverifikasi`);

  const body = verifSchema.parse(req.body);
  const updated = await prisma.bkdLaporan.update({
    where: { id: lap.id },
    data: {
      status: body.status,
      catatanAkademik: body.catatanAkademik ?? null,
      diverifikasiOleh: akd.id,
      diverifikasiPada: new Date(),
    },
  });
  void writeAudit(req, { action: `bkd.${body.status}`, entity: 'bkd', entityId: updated.id });

  void (async () => {
    const userId = await userIdFromDosen(lap.dosenId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `BKD Anda ${body.status === 'disetujui' ? 'disetujui' : 'ditolak'}`,
      body: body.catatanAkademik ?? undefined,
      type: 'bkd',
      link: '/dosen/bkd',
      entity: 'bkd',
      entityId: lap.id,
      sendEmail: true,
    });
  })();

  res.json(updated);
});

/**
 * Hapus laporan BKD beserta items. Hanya untuk laporan ditolak atau draft —
 * laporan disetujui tidak boleh dihapus utk jejak audit. Cascade ke BkdItem.
 */
bkdAdminRouter.delete('/bkd/:id', async (req, res) => {
  const lap = await prisma.bkdLaporan.findUnique({ where: { id: req.params.id } });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  if (lap.status === 'disetujui') throw BadRequest('Laporan yang sudah disetujui tidak dapat dihapus');
  await prisma.bkdItem.deleteMany({ where: { laporanId: lap.id } });
  await prisma.bkdLaporan.delete({ where: { id: lap.id } });
  void writeAudit(req, {
    action: 'bkd.delete',
    entity: 'bkd',
    entityId: lap.id,
    metadata: { dosenId: lap.dosenId, semesterId: lap.semesterId, status: lap.status },
  });
  res.status(204).end();
});

/** Ringkasan total kategori per laporan (untuk display). */
bkdAdminRouter.get('/bkd/:id/ringkasan', async (req, res) => {
  const items = await prisma.bkdItem.groupBy({
    by: ['kategori'],
    where: { laporanId: req.params.id },
    _sum: { bobotSks: true },
    _count: { _all: true },
  });
  const ringkasan = {
    pengajaran: 0, penelitian: 0, pengabdian: 0, penunjang: 0,
  } as Record<string, number>;
  for (const r of items) {
    ringkasan[r.kategori] = r._sum.bobotSks ?? 0;
  }
  res.json(ringkasan);
});
