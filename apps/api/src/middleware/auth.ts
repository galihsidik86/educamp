import type { RequestHandler } from 'express';
import type { Role, AkademikSubRole } from '@prisma/client';
import { prisma } from '../db.js';
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

/**
 * Require user akademik dengan sub-peran tertentu. super_admin selalu lolos.
 * Dipakai utk membatasi modul (mis. keuangan hanya untuk admin_keuangan).
 */
export const requireAkademikSubRole = (...allowed: AkademikSubRole[]): RequestHandler => async (req, _res, next) => {
  try {
    if (!req.user) throw Unauthorized();
    if (req.user.role !== 'akademik') throw Forbidden('Bukan pengguna akademik');
    const ak = await prisma.akademik.findUnique({
      where: { userId: req.user.sub },
      select: { subRole: true },
    });
    if (!ak) throw Forbidden('Profil akademik tidak ditemukan');
    if (ak.subRole === 'super_admin') return next();
    if (!allowed.includes(ak.subRole)) {
      throw Forbidden(`Sub-peran '${ak.subRole}' tidak punya akses ke modul ini`);
    }
    next();
  } catch (err) {
    next(err);
  }
};
