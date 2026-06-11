import { Router } from 'express';
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
