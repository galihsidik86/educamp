import { prisma } from '../../db.js';
import { hashToken, refreshExpiresAt, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { BadRequest, Unauthorized } from '../../lib/errors.js';
import crypto from 'node:crypto';

const NIM_REGEX = /^\d{7,12}$/;

export async function login(identifier: string, password: string, meta: { userAgent?: string; ip?: string }) {
  // identifier: email atau NIM
  let email = identifier.toLowerCase().trim();

  if (NIM_REGEX.test(identifier)) {
    const mhs = await prisma.mahasiswa.findUnique({
      where: { nim: identifier },
      include: { user: true },
    });
    if (!mhs) throw Unauthorized('NIM atau password salah');
    email = mhs.user.email;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw Unauthorized('Email/NIM atau password salah');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw Unauthorized('Email/NIM atau password salah');

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt(),
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip?.slice(0, 64),
    },
  });

  return { accessToken, refreshToken, user };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Unauthorized('Refresh token tidak valid');
  }

  const row = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!row || row.revokedAt) throw Unauthorized('Sesi telah berakhir, silakan login ulang');
  if (row.tokenHash !== hashToken(refreshToken)) throw Unauthorized('Refresh token tidak cocok');
  if (row.expiresAt < new Date()) throw Unauthorized('Refresh token kedaluwarsa');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw Unauthorized();

  // rotate
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  const newJti = crypto.randomUUID();
  const newRefresh = signRefreshToken({ sub: user.id, jti: newJti });
  await prisma.refreshToken.create({
    data: {
      id: newJti,
      userId: user.id,
      tokenHash: hashToken(newRefresh),
      expiresAt: refreshExpiresAt(),
    },
  });

  const newAccess = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // ignore — sudah invalid
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (newPassword.length < 8) throw BadRequest('Password baru minimal 8 karakter');
  if (currentPassword === newPassword) throw BadRequest('Password baru harus berbeda dengan password lama');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Unauthorized();

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw BadRequest('Password lama salah');

  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  // revoke semua refresh token aktif (paksa relogin di device lain)
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { ok: true };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      mahasiswa: { include: { prodi: { include: { fakultas: true } }, dpa: true } },
      dosen: { include: { prodi: { include: { fakultas: true } } } },
      akademik: true,
    },
  });
  if (!user) throw Unauthorized();
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}
