import { Router } from 'express';
import { prisma } from '../../db.js';

/**
 * Reference data — dropdown-friendly lookups yang butuh diakses oleh
 * semua sub-role akademik (keuangan butuh prodi utk Tarif UKT, spmi
 * butuh prodi utk standar mutu, dll). Read-only, tanpa scope filter.
 */
export const refRouter = Router();

refRouter.get('/ref/prodi', async (_req, res) => {
  const items = await prisma.prodi.findMany({
    select: {
      id: true, kode: true, nama: true, jenjang: true,
      fakultas: { select: { kode: true, nama: true } },
    },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

refRouter.get('/ref/dosen', async (_req, res) => {
  const items = await prisma.dosen.findMany({
    select: {
      id: true, nidn: true, nama: true,
      gelarDepan: true, gelarBelakang: true,
      prodi: { select: { kode: true, nama: true } },
    },
    orderBy: { nama: 'asc' },
  });
  res.json({ items });
});

refRouter.get('/ref/fakultas', async (_req, res) => {
  const items = await prisma.fakultas.findMany({
    select: { id: true, kode: true, nama: true },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

// Bentuk output samakan dengan /akademik/periode (nested TA → semester)
// supaya hook di frontend bisa langsung dipakai tanpa refactor UI.
refRouter.get('/ref/periode', async (_req, res) => {
  const items = await prisma.tahunAjaran.findMany({
    include: {
      semester: {
        select: {
          id: true, kode: true, jenis: true, isAktif: true,
          krsMulai: true, krsSelesai: true,
          prsMulai: true, prsSelesai: true,
          nilaiMulai: true, nilaiSelesai: true,
        },
        orderBy: { kode: 'asc' },
      },
    },
    orderBy: { kode: 'desc' },
  });
  res.json({ items });
});
