import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { hashPassword } from '../../lib/password.js';
import { BadRequest, Conflict, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { getProdiScope } from '../../lib/context.js';

export const dosenRouter = Router();

const JABATAN = ['asisten_ahli', 'lektor', 'lektor_kepala', 'guru_besar', 'tenaga_pengajar'] as const;

const createSchema = z.object({
  nidn: z.string().min(5).max(20),
  nama: z.string().min(3).max(120),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  gelarDepan: z.string().max(30).optional(),
  gelarBelakang: z.string().max(30).optional(),
  prodiId: z.string().uuid(),
  jabatanFungsional: z.enum(JABATAN).optional(),
  jabatanStruktural: z.string().max(80).optional(),
  isDpa: z.boolean().optional().default(false),
});

const updateSchema = createSchema.omit({ nidn: true, email: true, password: true }).partial().extend({
  email: z.string().email().optional(),
});

dosenRouter.get('/dosen', async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);

  const items = await prisma.dosen.findMany({
    where: {
      ...(search && { OR: [{ nidn: { contains: search } }, { nama: { contains: search } }] }),
      ...(prodiId && { prodiId }),
    },
    include: {
      user: { select: { email: true } },
      prodi: { select: { kode: true, nama: true } },
      _count: { select: { kelas: true, mahasiswaBimbingan: true } },
    },
    orderBy: { nama: 'asc' },
  });
  res.json({ items });
});

dosenRouter.get('/dosen/:id', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const d = await prisma.dosen.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true } },
      prodi: { include: { fakultas: true } },
    },
  });
  if (!d) throw NotFound();
  if (scopeId && d.prodiId !== scopeId) throw Forbidden('Dosen di luar scope prodi Anda');
  res.json(d);
});

const importRowSchema = z.object({
  nidn: z.string().min(5).max(20),
  nama: z.string().min(3).max(120),
  email: z.string().email(),
  prodiKode: z.string().min(1),
  gelarDepan: z.string().max(30).optional().nullable(),
  gelarBelakang: z.string().max(30).optional().nullable(),
  jabatanFungsional: z.enum(JABATAN).optional().nullable(),
  jabatanStruktural: z.string().max(80).optional().nullable(),
  isDpa: z.string().optional().nullable(),
});
const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullable().optional())).max(500),
});

dosenRouter.post('/dosen/import', async (req, res) => {
  const { rows } = importBodySchema.parse(req.body);
  if (rows.length === 0) throw BadRequest('Tidak ada baris untuk diimpor');

  const prodiList = await prisma.prodi.findMany({ select: { id: true, kode: true } });
  const prodiByKode = new Map(prodiList.map((p) => [p.kode, p.id]));

  type ImportResult = { row: number; key: string | null; status: 'created' | 'failed'; message?: string };
  const results: ImportResult[] = [];
  let created = 0; let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    const rowNo = i + 1;
    const clean = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' || v == null ? undefined : v]),
    );
    const parsed = importRowSchema.safeParse(clean);
    if (!parsed.success) {
      failed++;
      results.push({ row: rowNo, key: (clean.nidn as string | undefined) ?? null, status: 'failed', message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') });
      continue;
    }
    const r = parsed.data;
    const prodiId = prodiByKode.get(r.prodiKode);
    if (!prodiId) { failed++; results.push({ row: rowNo, key: r.nidn, status: 'failed', message: `Kode prodi tidak ditemukan: ${r.prodiKode}` }); continue; }
    const [dupEmail, dupNidn] = await Promise.all([
      prisma.user.findUnique({ where: { email: r.email }, select: { id: true } }),
      prisma.dosen.findUnique({ where: { nidn: r.nidn }, select: { id: true } }),
    ]);
    if (dupEmail) { failed++; results.push({ row: rowNo, key: r.nidn, status: 'failed', message: `Email sudah dipakai: ${r.email}` }); continue; }
    if (dupNidn) { failed++; results.push({ row: rowNo, key: r.nidn, status: 'failed', message: `NIDN sudah dipakai: ${r.nidn}` }); continue; }

    try {
      const passwordHash = await hashPassword(r.nidn);
      const isDpa = r.isDpa != null && /^(true|1|ya|y)$/i.test(r.isDpa);
      await prisma.user.create({
        data: {
          email: r.email,
          passwordHash,
          role: 'dosen',
          dosen: {
            create: {
              nidn: r.nidn, nama: r.nama,
              gelarDepan: r.gelarDepan ?? null,
              gelarBelakang: r.gelarBelakang ?? null,
              prodiId,
              jabatanFungsional: (r.jabatanFungsional as (typeof JABATAN)[number] | null) ?? null,
              jabatanStruktural: r.jabatanStruktural ?? null,
              isDpa,
            },
          },
        },
      });
      created++;
      results.push({ row: rowNo, key: r.nidn, status: 'created' });
    } catch (e: any) {
      failed++;
      results.push({ row: rowNo, key: r.nidn, status: 'failed', message: e?.message ?? 'gagal create' });
    }
  }
  res.json({ totalRows: rows.length, created, failed, results });
});

dosenRouter.post('/dosen', async (req, res) => {
  const body = createSchema.parse(req.body);
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi hanya boleh tambah dosen di prodi-nya');
  }
  if (await prisma.user.findUnique({ where: { email: body.email } })) throw Conflict('Email sudah dipakai');
  if (await prisma.dosen.findUnique({ where: { nidn: body.nidn } })) throw Conflict('NIDN sudah dipakai');

  const passwordHash = await hashPassword(body.password ?? body.nidn);

  const created = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: 'dosen',
      dosen: {
        create: {
          nidn: body.nidn, nama: body.nama,
          gelarDepan: body.gelarDepan, gelarBelakang: body.gelarBelakang,
          prodiId: body.prodiId,
          jabatanFungsional: body.jabatanFungsional,
          jabatanStruktural: body.jabatanStruktural,
          isDpa: body.isDpa,
        },
      },
    },
    include: { dosen: true },
  });
  void writeAudit(req, {
    action: 'dosen.create',
    entity: 'dosen',
    entityId: created.dosen!.id,
    metadata: { nidn: body.nidn, nama: body.nama, prodiId: body.prodiId },
  });
  res.status(201).json(created.dosen);
});

dosenRouter.patch('/dosen/:id', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const d = await prisma.dosen.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!d) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && d.prodiId !== scopeId) throw Forbidden('Dosen di luar scope prodi Anda');
  if (scopeId && body.prodiId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi tidak boleh memindah dosen ke prodi lain');
  }

  if (body.email && body.email !== d.user.email) {
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw Conflict('Email sudah dipakai');
    await prisma.user.update({ where: { id: d.userId }, data: { email: body.email } });
  }

  const updated = await prisma.dosen.update({
    where: { id: d.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.gelarDepan !== undefined && { gelarDepan: body.gelarDepan }),
      ...(body.gelarBelakang !== undefined && { gelarBelakang: body.gelarBelakang }),
      ...(body.prodiId !== undefined && { prodiId: body.prodiId }),
      ...(body.jabatanFungsional !== undefined && { jabatanFungsional: body.jabatanFungsional }),
      ...(body.jabatanStruktural !== undefined && { jabatanStruktural: body.jabatanStruktural }),
      ...(body.isDpa !== undefined && { isDpa: body.isDpa }),
    },
  });
  res.json(updated);
});

dosenRouter.delete('/dosen/:id', async (req, res) => {
  const d = await prisma.dosen.findUnique({ where: { id: req.params.id } });
  if (!d) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && d.prodiId !== scopeId) throw Forbidden('Dosen di luar scope prodi Anda');
  await prisma.user.delete({ where: { id: d.userId } });
  void writeAudit(req, {
    action: 'dosen.delete',
    entity: 'dosen',
    entityId: d.id,
    metadata: { nidn: d.nidn, nama: d.nama },
  });
  res.status(204).end();
});

const resetSchema = z.object({ password: z.string().min(6).optional() });

dosenRouter.post('/dosen/:id/reset-password', async (req, res) => {
  const { password } = resetSchema.parse(req.body);
  const d = await prisma.dosen.findUnique({ where: { id: req.params.id } });
  if (!d) throw NotFound();
  const newPw = password ?? d.nidn;
  if (newPw.length < 6) throw BadRequest('Password minimal 6 karakter');
  const hash = await hashPassword(newPw);
  await prisma.user.update({ where: { id: d.userId }, data: { passwordHash: hash } });
  await prisma.refreshToken.updateMany({ where: { userId: d.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  void writeAudit(req, {
    action: 'auth.password.reset',
    entity: 'user',
    entityId: d.userId,
    metadata: { targetRole: 'dosen', nidn: d.nidn, customPassword: !!password },
  });
  res.json({ ok: true, password: password ? '****' : `default: NIDN (${d.nidn})` });
});
