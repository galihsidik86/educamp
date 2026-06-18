import { Router } from 'express';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { Forbidden, NotFound } from '../../lib/errors.js';

export const sertifikatRouter = Router();

/** List sertifikat mahasiswa sendiri (hanya yang terbit). */
sertifikatRouter.get('/sertifikat', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.sertifikatDigital.findMany({
    where: { mahasiswaId: m.id, status: 'terbit' },
    orderBy: { tanggalTerbit: 'desc' },
  });
  res.json({ items });
});

/** Detail sertifikat (untuk halaman cetak). */
sertifikatRouter.get('/sertifikat/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const s = await prisma.sertifikatDigital.findUnique({
    where: { id: req.params.id },
    include: {
      mahasiswa: {
        select: {
          nim: true, nama: true,
          tempatLahir: true, tanggalLahir: true,
          prodi: { select: { kode: true, nama: true, jenjang: true, fakultas: { select: { nama: true } } } },
        },
      },
    },
  });
  if (!s) throw NotFound('Sertifikat tidak ditemukan');
  if (s.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  res.json(s);
});
