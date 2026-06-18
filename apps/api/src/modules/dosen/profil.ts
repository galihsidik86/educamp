import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const profilRouter = Router();

profilRouter.get('/profil', async (req, res) => {
  const d = await prisma.dosen.findUnique({
    where: { userId: req.user!.sub },
    include: {
      user: { select: { email: true } },
      prodi: { include: { fakultas: true } },
      _count: { select: { kelas: true, mahasiswaBimbingan: true, penelitian: true, pengabdian: true } },
    },
  });
  if (!d) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan dosen' } });
  res.json(d);
});

// Self-edit terbatas — NIDN/email/prodi/jabatan tidak boleh diubah sendiri (lewat akademik).
const updateSchema = z.object({
  nama: z.string().min(3).max(120).optional(),
  gelarDepan: z.string().max(30).optional().nullable(),
  gelarBelakang: z.string().max(30).optional().nullable(),
});

profilRouter.patch('/profil', async (req, res) => {
  const d = await prisma.dosen.findUnique({ where: { userId: req.user!.sub } });
  if (!d) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan dosen' } });
  const body = updateSchema.parse(req.body);
  const updated = await prisma.dosen.update({
    where: { id: d.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.gelarDepan !== undefined && { gelarDepan: body.gelarDepan }),
      ...(body.gelarBelakang !== undefined && { gelarBelakang: body.gelarBelakang }),
    },
  });
  res.json(updated);
});
