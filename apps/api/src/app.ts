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
import { notifikasiRouter } from './modules/notifikasi/index.js';
import { forumRouter } from './modules/forum/index.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.CORS_ORIGINS_LIST.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} tidak diizinkan`));
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

  app.use('/auth', authRouter);
  app.use('/notifikasi', notifikasiRouter);
  app.use('/forum', forumRouter);
  app.use('/mahasiswa', mahasiswaRouter);
  app.use('/dosen', dosenRouter);
  app.use('/akademik', akademikRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
