import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { hashPassword } from '../../lib/password.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const mahasiswaRouter = Router();

const STATUS = ['aktif', 'cuti', 'lulus', 'drop_out', 'mengundurkan_diri'] as const;

const createSchema = z.object({
  nim: z.string().regex(/^\d{7,12}$/, 'NIM harus 7-12 digit angka'),
  nama: z.string().min(3).max(120),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  jenisKelamin: z.enum(['L', 'P']),
  tempatLahir: z.string().max(60).optional(),
  tanggalLahir: z.string().optional(),
  alamat: z.string().max(500).optional(),
  telepon: z.string().max(30).optional(),
  angkatan: z.number().int().min(1990).max(2100),
  prodiId: z.string().uuid(),
  dpaId: z.string().uuid().optional().nullable(),
  status: z.enum(STATUS).default('aktif'),
});

const updateSchema = createSchema.omit({ nim: true, email: true, password: true }).partial().extend({
  email: z.string().email().optional(),
});

mahasiswaRouter.get('/mahasiswa', async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  const prodiId = req.query.prodiId as string | undefined;
  const angkatan = req.query.angkatan ? Number(req.query.angkatan) : undefined;
  const status = req.query.status as string | undefined;

  const items = await prisma.mahasiswa.findMany({
    where: {
      ...(search && {
        OR: [{ nim: { contains: search } }, { nama: { contains: search } }],
      }),
      ...(prodiId && { prodiId }),
      ...(angkatan && { angkatan }),
      ...(status && STATUS.includes(status as (typeof STATUS)[number]) && { status: status as (typeof STATUS)[number] }),
    },
    include: {
      user: { select: { email: true, isActive: true } },
      prodi: { select: { kode: true, nama: true } },
      dpa: { select: { id: true, nama: true } },
    },
    orderBy: [{ angkatan: 'desc' }, { nim: 'asc' }],
    take: 200,
  });
  res.json({ items });
});

mahasiswaRouter.get('/mahasiswa/:id', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, isActive: true } },
      prodi: { include: { fakultas: true } },
      dpa: true,
    },
  });
  if (!m) throw NotFound();
  res.json(m);
});

mahasiswaRouter.post('/mahasiswa', async (req, res) => {
  const body = createSchema.parse(req.body);

  // pre-check duplikat
  const existsEmail = await prisma.user.findUnique({ where: { email: body.email } });
  if (existsEmail) throw Conflict('Email sudah dipakai');
  const existsNim = await prisma.mahasiswa.findUnique({ where: { nim: body.nim } });
  if (existsNim) throw Conflict('NIM sudah dipakai');

  const passwordHash = await hashPassword(body.password ?? body.nim); // default password = NIM

  const created = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: 'mahasiswa',
      mahasiswa: {
        create: {
          nim: body.nim,
          nama: body.nama,
          jenisKelamin: body.jenisKelamin,
          tempatLahir: body.tempatLahir,
          tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
          alamat: body.alamat,
          telepon: body.telepon,
          angkatan: body.angkatan,
          prodiId: body.prodiId,
          dpaId: body.dpaId ?? null,
          status: body.status,
        },
      },
    },
    include: { mahasiswa: true },
  });
  void writeAudit(req, {
    action: 'mahasiswa.create',
    entity: 'mahasiswa',
    entityId: created.mahasiswa!.id,
    metadata: { nim: body.nim, nama: body.nama, prodiId: body.prodiId },
  });
  res.status(201).json(created.mahasiswa);
});

mahasiswaRouter.patch('/mahasiswa/:id', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!m) throw NotFound();

  if (body.email && body.email !== m.user.email) {
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw Conflict('Email sudah dipakai');
    await prisma.user.update({ where: { id: m.userId }, data: { email: body.email } });
  }

  const updated = await prisma.mahasiswa.update({
    where: { id: m.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.jenisKelamin !== undefined && { jenisKelamin: body.jenisKelamin }),
      ...(body.tempatLahir !== undefined && { tempatLahir: body.tempatLahir }),
      ...(body.tanggalLahir !== undefined && { tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null }),
      ...(body.alamat !== undefined && { alamat: body.alamat }),
      ...(body.telepon !== undefined && { telepon: body.telepon }),
      ...(body.angkatan !== undefined && { angkatan: body.angkatan }),
      ...(body.prodiId !== undefined && { prodiId: body.prodiId }),
      ...(body.dpaId !== undefined && { dpaId: body.dpaId }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });
  res.json(updated);
});

mahasiswaRouter.delete('/mahasiswa/:id', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id } });
  if (!m) throw NotFound();
  // delete user cascades mahasiswa
  await prisma.user.delete({ where: { id: m.userId } });
  void writeAudit(req, {
    action: 'mahasiswa.delete',
    entity: 'mahasiswa',
    entityId: m.id,
    metadata: { nim: m.nim, nama: m.nama },
  });
  res.status(204).end();
});

const resetSchema = z.object({ password: z.string().min(6).optional() });

mahasiswaRouter.post('/mahasiswa/:id/reset-password', async (req, res) => {
  const { password } = resetSchema.parse(req.body);
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id } });
  if (!m) throw NotFound();
  const newPw = password ?? m.nim;
  if (newPw.length < 6) throw BadRequest('Password minimal 6 karakter');
  const hash = await hashPassword(newPw);
  await prisma.user.update({ where: { id: m.userId }, data: { passwordHash: hash } });
  // revoke all refresh tokens
  await prisma.refreshToken.updateMany({ where: { userId: m.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  void writeAudit(req, {
    action: 'auth.password.reset',
    entity: 'user',
    entityId: m.userId,
    metadata: { targetRole: 'mahasiswa', nim: m.nim, customPassword: !!password },
  });
  res.json({ ok: true, password: password ? '****' : `default: NIM (${m.nim})` });
});
