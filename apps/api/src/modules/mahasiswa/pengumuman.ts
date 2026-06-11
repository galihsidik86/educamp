import { Router } from 'express';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';

export const pengumumanRouter = Router();

/**
 * Pengumuman yang relevan untuk mahasiswa: target = all / mahasiswa / prodi:<id>.
 */
pengumumanRouter.get('/pengumuman', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.pengumuman.findMany({
    where: {
      OR: [
        { target: 'all' },
        { target: 'mahasiswa' },
        { target: `prodi:${m.prodiId}` },
      ],
    },
    orderBy: [{ isPenting: 'desc' }, { tanggal: 'desc' }],
  });
  res.json({ items });
});
