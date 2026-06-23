import { Router } from 'express';
import { changePasswordSchema, loginSchema, refreshSchema } from './auth.schemas.js';
import * as service from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimit.js';
import { writeAudit } from '../../lib/audit.js';

export const authRouter = Router();

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
    res.json({
      accessToken,
      refreshToken,
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
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await service.refresh(refreshToken);
  res.json(tokens);
});

authRouter.post('/logout', async (req, res) => {
  const token = (req.body?.refreshToken as string | undefined) ?? undefined;
  await service.logout(token);
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
