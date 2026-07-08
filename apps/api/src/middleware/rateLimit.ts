// ============================================================
// Rate limiting — strict untuk login (anti brute-force),
// lebih longgar untuk mutation umum.
// ============================================================

import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

/**
 * Anti brute-force untuk /auth/login — 30 percobaan gagal / 15 menit / IP.
 * Kuota per-IP sengaja longgar supaya banyak mahasiswa di balik satu IP publik
 * (NAT kampus) tidak saling mengunci; perlindungan utama kini di LOCKOUT
 * PER-AKUN (auth.service) yang mengunci akun spesifik setelah 10 gagal.
 * Login sukses tidak dihitung (skipSuccessfulRequests).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.' } },
  // jangan rate-limit di test biar pengujian cepat
  skip: () => (env.NODE_ENV as string) === 'test',
});

/**
 * Limiter terpisah untuk /auth/refresh — token refresh wajar terjadi sering
 * (setiap kali access token expire), jadi pakai jendela menit-an dengan kuota
 * besar. Refresh token sendiri adalah credential, brute-force bukan ancaman
 * utamanya; limiter ini hanya jaga-jaga dari spam.
 */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Permintaan refresh token terlalu sering.' } },
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

/**
 * Rate-limit endpoint verifikasi ijazah publik — mencegah brute-force token.
 * 20 req / menit / IP.
 */
export const rateLimitVerifikasi = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Terlalu banyak permintaan verifikasi.' } },
  skip: () => (env.NODE_ENV as string) === 'test',
});
