import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { hashPassword } from '../../lib/password.js';

export const usersRouter = Router();

/** List user dengan filter role / status / search email. */
usersRouter.get('/users', async (req, res) => {
  const role = req.query.role as string | undefined;
  const status = req.query.status as 'aktif' | 'nonaktif' | undefined;
  const q = req.query.q as string | undefined;
  const take = Math.min(Number(req.query.take ?? 100), 500);
  const skip = Math.max(Number(req.query.skip ?? 0), 0);

  const where: any = {
    ...(role && { role: role as any }),
    ...(status === 'aktif' && { isActive: true }),
    ...(status === 'nonaktif' && { isActive: false }),
    ...(q && {
      OR: [
        { email: { contains: q } },
        { mahasiswa: { is: { OR: [{ nim: { contains: q } }, { nama: { contains: q } }] } } },
        { dosen: { is: { OR: [{ nidn: { contains: q } }, { nama: { contains: q } }] } } },
        { akademik: { is: { nama: { contains: q } } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
        dosen: { select: { id: true, nidn: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
        akademik: { select: { id: true, nama: true, jabatan: true } },
        _count: { select: { refreshTokens: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      take, skip,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, take, skip });
});

/** Detail user — termasuk daftar sesi aktif. */
usersRouter.get('/users/:id', async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      mahasiswa: { include: { prodi: { include: { fakultas: true } }, dpa: true } },
      dosen: { include: { prodi: { include: { fakultas: true } } } },
      akademik: true,
    },
  });
  if (!u) throw NotFound('User tidak ditemukan');
  const { passwordHash: _ph, ...safe } = u;
  res.json(safe);
});

/** List sesi aktif (refresh token belum revoked & belum expired). */
usersRouter.get('/users/:id/sessions', async (req, res) => {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId: req.params.id, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items: sessions });
});

/** Revoke 1 sesi (paksa logout di 1 device). */
usersRouter.delete('/users/:id/sessions/:tokenId', async (req, res) => {
  const t = await prisma.refreshToken.findUnique({ where: { id: req.params.tokenId } });
  if (!t || t.userId !== req.params.id) throw NotFound('Sesi tidak ditemukan');
  await prisma.refreshToken.update({ where: { id: t.id }, data: { revokedAt: new Date() } });
  void writeAudit(req, { action: 'user.session.revoke', entity: 'user', entityId: req.params.id, metadata: { tokenId: t.id } });
  res.status(204).end();
});

/** Revoke semua sesi user (logout semua device). */
usersRouter.delete('/users/:id/sessions', async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) throw NotFound('User tidak ditemukan');
  const r = await prisma.refreshToken.updateMany({
    where: { userId: u.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  void writeAudit(req, { action: 'user.session.revoke_all', entity: 'user', entityId: u.id, metadata: { count: r.count } });
  res.json({ ok: true, revoked: r.count });
});

/** Nonaktifkan akun (sekaligus revoke semua sesi). */
usersRouter.post('/users/:id/deactivate', async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) throw NotFound('User tidak ditemukan');
  if (u.id === req.user!.sub) throw BadRequest('Anda tidak dapat menonaktifkan akun sendiri');
  await prisma.$transaction([
    prisma.user.update({ where: { id: u.id }, data: { isActive: false } }),
    prisma.refreshToken.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  void writeAudit(req, { action: 'user.deactivate', entity: 'user', entityId: u.id });
  res.json({ ok: true });
});

/** Aktifkan kembali akun. */
usersRouter.post('/users/:id/activate', async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) throw NotFound('User tidak ditemukan');
  await prisma.user.update({ where: { id: u.id }, data: { isActive: true } });
  void writeAudit(req, { action: 'user.activate', entity: 'user', entityId: u.id });
  res.json({ ok: true });
});

const resetSchema = z.object({
  // Kosong = auto-generate; isi untuk set password custom
  password: z.string().min(8).max(120).optional().nullable(),
  forcePasswordChange: z.boolean().optional(),
});

/** Reset password user — auto-generate atau custom. Sekaligus revoke semua sesi. */
usersRouter.post('/users/:id/reset-password', async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) throw NotFound('User tidak ditemukan');
  const body = resetSchema.parse(req.body);

  const newPassword = body.password ?? generateTempPassword();
  const hash = await hashPassword(newPassword);
  const forceChange = body.forcePasswordChange ?? true;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: hash, passwordMustChange: forceChange },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: u.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  void writeAudit(req, {
    action: 'user.reset_password',
    entity: 'user',
    entityId: u.id,
    metadata: { forcePasswordChange: forceChange, autoGenerated: !body.password },
  });

  // Return password baru hanya bila auto-generated (atau echo balik bila custom)
  res.json({
    ok: true,
    password: newPassword,
    autoGenerated: !body.password,
    passwordMustChange: forceChange,
  });
});

/** Toggle force-password-change tanpa reset password. */
usersRouter.post('/users/:id/force-password-change', async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) throw NotFound('User tidak ditemukan');
  const value = req.body?.value !== false; // default true
  await prisma.user.update({ where: { id: u.id }, data: { passwordMustChange: value } });
  void writeAudit(req, { action: 'user.force_password_change', entity: 'user', entityId: u.id, metadata: { value } });
  res.json({ ok: true, passwordMustChange: value });
});

/** Generate password sementara 12 karakter aman. */
function generateTempPassword(): string {
  // 9 bytes = 12 chars base64url, contains [A-Za-z0-9_-]
  return crypto.randomBytes(9).toString('base64url');
}
