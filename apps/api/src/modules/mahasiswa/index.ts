import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { profilRouter } from './profil.js';
import { dashboardRouter } from './dashboard.js';
import { krsRouter } from './krs.js';
import { jadwalRouter } from './jadwal.js';
import { nilaiRouter } from './nilai.js';
import { absensiRouter } from './absensi.js';
import { keuanganRouter } from './keuangan.js';
import { triDharmaRouter } from './tri-dharma.js';

export const mahasiswaRouter = Router();

mahasiswaRouter.use(requireAuth, requireRole('mahasiswa'));
mahasiswaRouter.use((req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) return writeLimiter(req, res, next);
  next();
});
mahasiswaRouter.use(profilRouter);
mahasiswaRouter.use(dashboardRouter);
mahasiswaRouter.use(krsRouter);
mahasiswaRouter.use(jadwalRouter);
mahasiswaRouter.use(nilaiRouter);
mahasiswaRouter.use(absensiRouter);
mahasiswaRouter.use(keuanganRouter);
mahasiswaRouter.use(triDharmaRouter);
