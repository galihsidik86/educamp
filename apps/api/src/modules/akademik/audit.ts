import { Router } from 'express';
import { prisma } from '../../db.js';
import { intParam } from '../../lib/validators.js';

export const auditRouter = Router();

/**
 * List riwayat audit dengan filter ringan.
 * Query: action, entity, actorId, actorRole, q (search action/entity/actorName), since, until, take (max 200)
 */
auditRouter.get('/audit', async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const action = req.query.action as string | undefined;
  const entity = req.query.entity as string | undefined;
  const actorId = req.query.actorId as string | undefined;
  const actorRole = req.query.actorRole as string | undefined;
  const since = req.query.since ? new Date(req.query.since as string) : undefined;
  const until = req.query.until ? new Date(req.query.until as string) : undefined;
  const take = intParam(req.query.take, 100, { min: 1, max: 200 });
  const skip = intParam(req.query.skip, 0, { min: 0 });

  const where = {
    ...(action && { action: { contains: action } }),
    ...(entity && { entity }),
    ...(actorId && { actorId }),
    ...(actorRole && { actorRole }),
    ...(since || until ? { createdAt: { ...(since && { gte: since }), ...(until && { lte: until }) } } : {}),
    ...(q && {
      OR: [
        { action: { contains: q } },
        { entity: { contains: q } },
        { actorName: { contains: q } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    items: items.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      actorId: r.actorId,
      actorRole: r.actorRole,
      actorName: r.actorName,
      metadata: r.metadata,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    })),
    total,
    take,
    skip,
  });
});
