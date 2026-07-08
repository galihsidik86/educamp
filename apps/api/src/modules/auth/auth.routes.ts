import { Router, type Response } from 'express';
import { changePasswordSchema, loginSchema } from './auth.schemas.js';
import * as service from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimit.js';
import { writeAudit } from '../../lib/audit.js';
import { refreshExpiresAt } from '../../lib/jwt.js';
import { Unauthorized } from '../../lib/errors.js';
import { env } from '../../env.js';

export const authRouter = Router();

// Refresh token disimpan di cookie httpOnly → tak terjangkau JavaScript, jadi
// XSS tak bisa mencurinya. `sameSite: lax` cukup: prod same-origin (via nginx),
// dev localhost same-site. `secure` hanya di prod (dev jalan HTTP).
const REFRESH_COOKIE = 'siakad_rt';
const cookieOpts = () => ({
  httpOnly: true as const,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});
const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, { ...cookieOpts(), expires: refreshExpiresAt() });
const clearRefreshCookie = (res: Response) => res.clearCookie(REFRESH_COOKIE, cookieOpts());
const readRefreshToken = (req: { cookies?: Record<string, string>; body?: { refreshToken?: string } }) =>
  req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;

authRouter.post('/login', authLimiter, async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  try {
    const { accessToken, refreshToken, user } = await service.login(identifier, password, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    void writeAudit(req, {
      action: 'auth.login.success',
      entity: 'user',
      entityId: user.id,
      metadata: { identifier, role: user.role },
    }, { actorId: user.id, actorRole: user.role });
    setRefreshCookie(res, refreshToken);
    res.json({
      accessToken,
      refreshToken, // tetap dikirim di body utk kompatibilitas (klien lama/test)

      user: {
        id: user.id, email: user.email, role: user.role,
        passwordMustChange: user.passwordMustChange,
      },
    });
  } catch (err) {
    void writeAudit(req, {
      action: 'auth.login.fail',
      entity: 'user',
      metadata: { identifier },
    });
    throw err;
  }
});

authRouter.post('/refresh', refreshLimiter, async (req, res) => {
  // Baca dari cookie httpOnly dulu, fallback ke body (klien lama/test).
  const token = readRefreshToken(req);
  if (!token) throw Unauthorized('Refresh token tidak ada');
  const tokens = await service.refresh(token);
  setRefreshCookie(res, tokens.refreshToken);
  res.json(tokens);
});

authRouter.post('/logout', async (req, res) => {
  await service.logout(readRefreshToken(req));
  clearRefreshCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await service.getProfile(req.user!.sub);
  res.json(profile);
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const result = await service.changePassword(req.user!.sub, currentPassword, newPassword);
  void writeAudit(req, { action: 'auth.password.change', entity: 'user', entityId: req.user!.sub });
  res.json(result);
});
