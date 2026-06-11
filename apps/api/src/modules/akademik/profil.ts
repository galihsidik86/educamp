import { Router } from 'express';
import { prisma } from '../../db.js';

export const profilRouter = Router();

profilRouter.get('/profil', async (req, res) => {
  const a = await prisma.akademik.findUnique({
    where: { userId: req.user!.sub },
    include: { user: { select: { email: true } } },
  });
  if (!a) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan akademik' } });
  res.json(a);
});
