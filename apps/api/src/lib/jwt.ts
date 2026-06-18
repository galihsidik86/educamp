import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import ms from 'ms';
import { env } from '../env.js';
import type { Role } from '@prisma/client';

export type AccessPayload = {
  sub: string;       // user.id
  role: Role;
  email: string;
};

export type RefreshPayload = {
  sub: string;
  jti: string;       // matches RefreshToken.id
};

export const signAccessToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });

export const signRefreshToken = (payload: RefreshPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload & { iat: number; exp: number };

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload & { iat: number; exp: number };

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const refreshExpiresAt = () => new Date(Date.now() + (ms as unknown as (s: string) => number)(env.JWT_REFRESH_TTL));
