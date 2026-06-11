import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { profilRouter } from './profil.js';
import { dashboardRouter } from './dashboard.js';
import { laporanRouter } from './laporan.js';
import { mahasiswaRouter } from './mahasiswa.js';
import { dosenRouter } from './dosen.js';
import { kurikulumRouter } from './kurikulum.js';
import { periodeRouter } from './periode.js';
import { krsRouter } from './krs.js';
import { keuanganRouter } from './keuangan.js';
import { pengumumanRouter } from './pengumuman.js';
import { auditRouter } from './audit.js';

export const akademikRouter = Router();

akademikRouter.use(requireAuth, requireRole('akademik'));
// rate-limit mutation untuk semua subroute akademik
akademikRouter.use((req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) return writeLimiter(req, res, next);
  next();
});
akademikRouter.use(profilRouter);
akademikRouter.use(dashboardRouter);
akademikRouter.use(laporanRouter);
akademikRouter.use(mahasiswaRouter);
akademikRouter.use(dosenRouter);
akademikRouter.use(kurikulumRouter);
akademikRouter.use(periodeRouter);
akademikRouter.use(krsRouter);
akademikRouter.use(keuanganRouter);
akademikRouter.use(pengumumanRouter);
akademikRouter.use(auditRouter);
