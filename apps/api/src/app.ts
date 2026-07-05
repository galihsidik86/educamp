// ============================================================
// Express app factory — dipakai oleh entrypoint (index.ts) & tests.
// ============================================================

// Patch Express 4 untuk tangkap async/await rejection di route handler.
// Tanpa ini, throw di handler async menjadi unhandled rejection.
import 'express-async-errors';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { mahasiswaRouter } from './modules/mahasiswa/index.js';
import { dosenRouter } from './modules/dosen/index.js';
import { akademikRouter } from './modules/akademik/index.js';
import { waliRouter } from './modules/wali/index.js';
import { notifikasiRouter } from './modules/notifikasi/index.js';
import { forumRouter } from './modules/forum/index.js';
import { kalenderSharedRouter } from './modules/kalender/index.js';
import { dokumenSharedRouter } from './modules/dokumen/index.js';
import { verifikasiRouter } from './modules/verifikasi/index.js';
import { institusiPublicRouter } from './modules/akademik/institusi.js';

export function createApp(): Express {
  const app = express();

  // Di production API jalan di belakang nginx (apps/web/nginx.conf) yang
  // forward X-Forwarded-For. Tanpa ini req.ip = IP container nginx, sehingga
  // rate-limit per-IP jadi satu bucket untuk semua user.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Origin di luar allow-list cukup diblok (tanpa header CORS) —
        // melempar Error di sini membuat setiap probe lintas-origin
        // menjadi 500 INTERNAL_ERROR yang mengotori log & monitoring.
        if (!origin || env.CORS_ORIGINS_LIST.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if ((env.NODE_ENV as string) !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'siakad-api', env: env.NODE_ENV, ts: new Date().toISOString() });
  });

  // Public endpoint untuk verifikasi ijazah (no auth)
  app.use('/verifikasi', verifikasiRouter);
  // Identitas kampus (no auth) — utk sidebar, kop laporan, halaman verifikasi
  app.use('/public', institusiPublicRouter);

  app.use('/auth', authRouter);
  app.use('/notifikasi', notifikasiRouter);
  app.use('/forum', forumRouter);
  app.use('/kalender', kalenderSharedRouter);
  app.use('/dokumen', dokumenSharedRouter);
  app.use('/mahasiswa', mahasiswaRouter);
  app.use('/dosen', dosenRouter);
  app.use('/akademik', akademikRouter);
  app.use('/wali', waliRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
