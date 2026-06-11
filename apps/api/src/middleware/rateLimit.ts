// ============================================================
// Rate limiting — strict untuk login (anti brute-force),
// lebih longgar untuk mutation umum.
// ============================================================

import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

/**
 * Anti brute-force untuk auth endpoints — 8 percobaan / 15 menit / IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.' } },
  // jangan rate-limit di test biar pengujian cepat
  skip: () => (env.NODE_ENV as string) === 'test',
});

/**
 * Rate-limit umum untuk write endpoints — 60 req / menit / IP.
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Permintaan terlalu sering, tunggu sebentar.' } },
  skip: () => (env.NODE_ENV as string) === 'test',
});
