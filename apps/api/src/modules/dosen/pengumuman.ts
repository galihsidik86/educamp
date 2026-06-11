import { Router } from 'express';
import { prisma } from '../../db.js';
import { getDosenForUser } from '../../lib/context.js';

export const pengumumanRouter = Router();

/**
 * Pengumuman yang relevan untuk dosen: target = all / dosen / prodi:<id>.
 */
pengumumanRouter.get('/pengumuman', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const items = await prisma.pengumuman.findMany({
    where: {
      OR: [
        { target: 'all' },
        { target: 'dosen' },
        { target: `prodi:${d.prodiId}` },
      ],
    },
    orderBy: [{ isPenting: 'desc' }, { tanggal: 'desc' }],
  });
  res.json({ items });
});
