import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken, type AccessPayload } from '../lib/jwt.js';
import { Forbidden, Unauthorized } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw Unauthorized('Token akses tidak ditemukan');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw Unauthorized('Token akses tidak valid atau kedaluwarsa');
  }
};

export const requireRole = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) throw Unauthorized();
  if (!roles.includes(req.user.role)) throw Forbidden(`Peran ${req.user.role} tidak diizinkan`);
  next();
};
