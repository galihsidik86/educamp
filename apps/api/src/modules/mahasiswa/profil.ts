import { Router } from 'express';
import { getMahasiswaForUser } from '../../lib/context.js';
import { prisma } from '../../db.js';

export const profilRouter = Router();

profilRouter.get('/profil', async (req, res) => {
  const userId = req.user!.sub;
  const m = await prisma.mahasiswa.findUnique({
    where: { userId },
    include: {
      user: { select: { email: true } },
      prodi: { include: { fakultas: true } },
      dpa: { select: { id: true, nama: true, nidn: true, gelarDepan: true, gelarBelakang: true } },
    },
  });
  if (!m) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan mahasiswa' } });
  res.json(m);
});

// helper export so router file can also re-use the resolver elsewhere
export { getMahasiswaForUser };
