// Read-only oversight endpoints — akademik bisa lihat konsultasi DPA,
// penelitian, dan pengabdian lintas dosen/mahasiswa untuk audit/laporan.

import { Router } from 'express';
import { prisma } from '../../db.js';

export const oversightRouter = Router();

/** Read-only list konsultasi DPA untuk audit akademik. */
oversightRouter.get('/konsultasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const items = await prisma.konsultasiDpa.findMany({
    where: { ...(status && { status: status as any }) },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      dpa: { select: { id: true, nidn: true, nama: true } },
    },
    orderBy: { waktuMulai: 'desc' },
    take: 200,
  });
  res.json({ items });
});

/** Read-only list penelitian lintas dosen. */
oversightRouter.get('/penelitian', async (req, res) => {
  const status = req.query.status as string | undefined;
  const tahun = req.query.tahun as string | undefined;
  const items = await prisma.penelitian.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(tahun && !isNaN(Number(tahun)) && { tahun: Number(tahun) }),
    },
    include: {
      ketuaDosen: { select: { id: true, nidn: true, nama: true } },
      _count: { select: { mahasiswa: true } },
    },
    orderBy: [{ tahun: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({ items });
});

/** Read-only list pengabdian lintas dosen. */
oversightRouter.get('/pengabdian', async (req, res) => {
  const status = req.query.status as string | undefined;
  const tahun = req.query.tahun as string | undefined;
  const items = await prisma.pengabdian.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(tahun && !isNaN(Number(tahun)) && { tahun: Number(tahun) }),
    },
    include: {
      ketuaDosen: { select: { id: true, nidn: true, nama: true } },
      _count: { select: { mahasiswa: true } },
    },
    orderBy: [{ tahun: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({ items });
});
