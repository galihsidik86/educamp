// ============================================================
// Notifikasi endpoints — shared across roles (per-user).
// Mount: app.use('/notifikasi', notifikasiRouter)
// ============================================================

import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFound } from '../../lib/errors.js';

export const notifikasiRouter = Router();
notifikasiRouter.use(requireAuth);

/**
 * List notifikasi user yang login. Query: onlyUnread, take, skip.
 */
notifikasiRouter.get('/', async (req, res) => {
  const userId = req.user!.sub;
  const onlyUnread = req.query.onlyUnread === '1' || req.query.onlyUnread === 'true';
  const take = Math.min(Number(req.query.take ?? 50), 200);
  const skip = Math.max(Number(req.query.skip ?? 0), 0);

  const where = {
    userId,
    ...(onlyUnread && { readAt: null }),
  };

  const [items, total, unread] = await Promise.all([
    prisma.notifikasi.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.notifikasi.count({ where }),
    prisma.notifikasi.count({ where: { userId, readAt: null } }),
  ]);

  res.json({ items, total, unread, take, skip });
});

/** Hitung notifikasi belum dibaca — endpoint ringan untuk polling badge. */
notifikasiRouter.get('/unread-count', async (req, res) => {
  const unread = await prisma.notifikasi.count({ where: { userId: req.user!.sub, readAt: null } });
  res.json({ unread });
});

/** Tandai 1 notifikasi sebagai sudah dibaca. */
notifikasiRouter.post('/:id/read', async (req, res) => {
  const userId = req.user!.sub;
  const n = await prisma.notifikasi.findUnique({ where: { id: req.params.id } });
  if (!n || n.userId !== userId) throw NotFound('Notifikasi tidak ditemukan');
  if (!n.readAt) {
    await prisma.notifikasi.update({ where: { id: n.id }, data: { readAt: new Date() } });
  }
  res.json({ ok: true });
});

/** Tandai semua belum dibaca → sudah dibaca. */
notifikasiRouter.post('/read-all', async (req, res) => {
  const userId = req.user!.sub;
  const r = await prisma.notifikasi.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true, updated: r.count });
});
