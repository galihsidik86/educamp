// ============================================================
// Kalender akademik — read endpoint shared across roles.
// Filter otomatis berdasarkan target (all + role user).
// Mount: app.use('/kalender', kalenderSharedRouter)
// ============================================================

import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

export const kalenderSharedRouter = Router();
kalenderSharedRouter.use(requireAuth);

/**
 * List event yang relevan untuk user. Filter:
 * - target: all atau sesuai role user
 * - optional ?from=YYYY-MM-DD, ?to=YYYY-MM-DD
 * - optional ?upcoming=N (jumlah event mendatang)
 */
kalenderSharedRouter.get('/', async (req, res) => {
  const role = req.user!.role;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const upcoming = req.query.upcoming ? Math.min(Math.max(Number(req.query.upcoming), 1), 50) : undefined;

  const targets = role === 'akademik' ? undefined : [{ target: 'all' }, { target: role }];

  const tanggalFilter: any = {};
  if (upcoming) tanggalFilter.gte = new Date();
  else {
    if (from) tanggalFilter.gte = from;
    if (to) tanggalFilter.lte = to;
  }

  const where: any = {
    ...(targets && { OR: targets }),
    ...(Object.keys(tanggalFilter).length > 0 && { tanggalMulai: tanggalFilter }),
  };

  const items = await prisma.kalenderAkademik.findMany({
    where,
    include: { semester: { include: { tahunAjaran: true } } },
    orderBy: { tanggalMulai: 'asc' },
    ...(upcoming && { take: upcoming }),
  });
  res.json({ items });
});
