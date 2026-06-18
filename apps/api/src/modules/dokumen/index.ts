// ============================================================
// Pusat Dokumen — endpoint terbuka untuk semua role authenticated.
// Filter otomatis berdasarkan target dokumen + status aktif + masa berlaku.
// Mount: app.use('/dokumen', dokumenSharedRouter)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { BadRequest, NotFound } from '../../lib/errors.js';

export const dokumenSharedRouter = Router();
dokumenSharedRouter.use(requireAuth);

/**
 * Tentukan target yang relevan untuk user.
 * Akademik bisa lihat semua. Mahasiswa/dosen filter ke target sesuai role + prodi-nya.
 */
async function getVisibleTargets(userId: string, role: string): Promise<string[] | null> {
  if (role === 'akademik') return null; // null = no filter (semua)

  const targets = ['all', role];
  if (role === 'mahasiswa') {
    const m = await prisma.mahasiswa.findUnique({ where: { userId }, select: { prodiId: true } });
    if (m) targets.push(`prodi:${m.prodiId}`);
  } else if (role === 'dosen') {
    const d = await prisma.dosen.findUnique({ where: { userId }, select: { prodiId: true } });
    if (d) targets.push(`prodi:${d.prodiId}`);
  }
  return targets;
}

/** List kategori dokumen yang punya minimal 1 dokumen visible. */
dokumenSharedRouter.get('/kategori', async (req, res) => {
  const targets = await getVisibleTargets(req.user!.sub, req.user!.role);
  const now = new Date();
  const dokumenFilter: any = {
    isAktif: true,
    AND: [
      { OR: [{ tanggalBerlaku: null }, { tanggalBerlaku: { lte: now } }] },
      { OR: [{ tanggalKedaluwarsa: null }, { tanggalKedaluwarsa: { gt: now } }] },
    ],
    ...(targets && { target: { in: targets } }),
  };
  const items = await prisma.kategoriDokumen.findMany({
    where: {
      isAktif: true,
      dokumen: { some: dokumenFilter },
    },
    include: {
      _count: { select: { dokumen: { where: dokumenFilter } } },
    },
    orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
  });
  res.json({ items });
});

/** List dokumen yang relevan untuk user. */
dokumenSharedRouter.get('/', async (req, res) => {
  const targets = await getVisibleTargets(req.user!.sub, req.user!.role);
  const kategoriId = req.query.kategoriId as string | undefined;
  const q = req.query.q as string | undefined;
  const now = new Date();
  const items = await prisma.dokumen.findMany({
    where: {
      isAktif: true,
      AND: [
        { OR: [{ tanggalBerlaku: null }, { tanggalBerlaku: { lte: now } }] },
        { OR: [{ tanggalKedaluwarsa: null }, { tanggalKedaluwarsa: { gt: now } }] },
      ],
      ...(targets && { target: { in: targets } }),
      ...(kategoriId && { kategoriId }),
      ...(q && {
        OR: [
          { judul: { contains: q } },
          { deskripsi: { contains: q } },
        ],
      }),
    },
    include: { kategori: { select: { id: true, kode: true, nama: true } } },
    orderBy: [{ updatedAt: 'desc' }],
  });
  res.json({ items });
});

/** Detail satu dokumen — hanya jika visible. */
dokumenSharedRouter.get('/:id', async (req, res) => {
  const targets = await getVisibleTargets(req.user!.sub, req.user!.role);
  const d = await prisma.dokumen.findUnique({
    where: { id: req.params.id },
    include: { kategori: { select: { id: true, kode: true, nama: true } } },
  });
  if (!d) throw NotFound('Dokumen tidak ditemukan');
  if (!d.isAktif) throw NotFound('Dokumen tidak ditemukan');
  if (targets && !targets.includes(d.target)) throw NotFound('Dokumen tidak ditemukan');
  res.json(d);
});

const aksiSchema = z.object({ aksi: z.enum(['view', 'download']) });

/** Catat akses (view/download) + increment counter. */
dokumenSharedRouter.post('/:id/akses', async (req, res) => {
  const targets = await getVisibleTargets(req.user!.sub, req.user!.role);
  const d = await prisma.dokumen.findUnique({ where: { id: req.params.id } });
  if (!d || !d.isAktif) throw NotFound('Dokumen tidak ditemukan');
  if (targets && !targets.includes(d.target)) throw NotFound('Dokumen tidak ditemukan');

  const body = aksiSchema.parse(req.body);
  await prisma.$transaction([
    prisma.dokumenAkses.create({
      data: {
        dokumenId: d.id,
        userId: req.user!.sub,
        aksi: body.aksi,
        ip: req.ip?.slice(0, 64),
        userAgent: req.headers['user-agent']?.slice(0, 255),
      },
    }),
    prisma.dokumen.update({
      where: { id: d.id },
      data: body.aksi === 'view'
        ? { viewCount: { increment: 1 } }
        : { downloadCount: { increment: 1 } },
    }),
  ]);
  res.json({ ok: true });
});

void BadRequest; // keep import for future