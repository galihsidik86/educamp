import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { profilRouter } from './profil.js';
import { dashboardRouter } from './dashboard.js';
import { jadwalRouter } from './jadwal.js';
import { kelasRouter } from './kelas.js';
import { bimbinganRouter } from './bimbingan.js';
import { penelitianRouter } from './penelitian.js';
import { pengabdianRouter } from './pengabdian.js';

export const dosenRouter = Router();

dosenRouter.use(requireAuth, requireRole('dosen'));
dosenRouter.use((req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) return writeLimiter(req, res, next);
  next();
});
dosenRouter.use(profilRouter);
dosenRouter.use(dashboardRouter);
dosenRouter.use(jadwalRouter);
dosenRouter.use(kelasRouter);
dosenRouter.use(bimbinganRouter);
dosenRouter.use(penelitianRouter);
dosenRouter.use(pengabdianRouter);
