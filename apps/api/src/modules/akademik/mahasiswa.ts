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

const importRowSchema = z.object({
  nim: z.string().regex(/^\d{7,12}$/),
  nama: z.string().min(3).max(120),
  email: z.string().email(),
  jenisKelamin: z.enum(['L', 'P']),
  angkatan: z.coerce.number().int().min(1990).max(2100),
  prodiKode: z.string().min(1),
  dpaNidn: z.string().optional().nullable(),
  tempatLahir: z.string().max(60).optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  alamat: z.string().max(500).optional().nullable(),
  telepon: z.string().max(30).optional().nullable(),
});

const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullable().optional())).max(500),
});

/**
 * Bulk import mahasiswa via array of CSV row.
 * Setiap baris divalidasi independen. Sukses = create user+mahasiswa.
 * Default password = NIM (sama dengan endpoint create satuan).
 * Return per-baris status agar bisa ditampilkan di UI sebagai laporan.
 */
mahasiswaRouter.post('/mahasiswa/import', async (req, res) => {
  const { rows } = importBodySchema.parse(req.body);
  if (rows.length === 0) throw BadRequest('Tidak ada baris untuk diimpor');

  // pre-fetch lookup map: prodi (kode → id), dosen (nidn → id)
  const [prodiList, dosenList] = await Promise.all([
    prisma.prodi.findMany({ select: { id: true, kode: true } }),
    prisma.dosen.findMany({ select: { id: true, nidn: true } }),
  ]);
  const prodiByKode = new Map(prodiList.map((p) => [p.kode, p.id]));
  const dosenByNidn = new Map(dosenList.map((d) => [d.nidn, d.id]));

  type ImportResult = {
    row: number;
    nim: string | null;
    status: 'created' | 'failed';
    message?: string;
  };
  const results: ImportResult[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    const rowNo = i + 1;
    // null/'' → undefined supaya zod optional kena
    const clean = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' || v == null ? undefined : v]),
    );
    const parsed = importRowSchema.safeParse(clean);
    if (!parsed.success) {
      failed++;
      results.push({ row: rowNo, nim: (clean.nim as string | undefined) ?? null, status: 'failed', message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') });
      continue;
    }
    const r = parsed.data;
    const prodiId = prodiByKode.get(r.prodiKode);
    if (!prodiId) {
      failed++;
      results.push({ row: rowNo, nim: r.nim, status: 'failed', message: `Kode prodi tidak ditemukan: ${r.prodiKode}` });
      continue;
    }
    const dpaId = r.dpaNidn ? dosenByNidn.get(r.dpaNidn) : null;
    if (r.dpaNidn && !dpaId) {
      failed++;
      results.push({ row: rowNo, nim: r.nim, status: 'failed', message: `NIDN DPA tidak ditemukan: ${r.dpaNidn}` });
      continue;
    }
    // cek duplikat
    const [dupEmail, dupNim] = await Promise.all([
      prisma.user.findUnique({ where: { email: r.email }, select: { id: true } }),
      prisma.mahasiswa.findUnique({ where: { nim: r.nim }, select: { id: true } }),
    ]);
    if (dupEmail) { failed++; results.push({ row: rowNo, nim: r.nim, status: 'failed', message: `Email sudah dipakai: ${r.email}` }); continue; }
    if (dupNim) { failed++; results.push({ row: rowNo, nim: r.nim, status: 'failed', message: `NIM sudah dipakai: ${r.nim}` }); continue; }

    try {
      const passwordHash = await hashPassword(r.nim); // default password = NIM
      await prisma.user.create({
        data: {
          email: r.email,
          passwordHash,
          role: 'mahasiswa',
          mahasiswa: {
            create: {
              nim: r.nim, nama: r.nama,
              jenisKelamin: r.jenisKelamin,
              tempatLahir: r.tempatLahir ?? null,
              tanggalLahir: r.tanggalLahir ? new Date(r.tanggalLahir) : null,
              alamat: r.alamat ?? null,
              telepon: r.telepon ?? null,
              angkatan: r.angkatan,
              prodiId,
              dpaId: dpaId ?? null,
            },
          },
        },
      });
      created++;
      results.push({ row: rowNo, nim: r.nim, status: 'created' });
    } catch (e: any) {
      failed++;
      results.push({ row: rowNo, nim: r.nim, status: 'failed', message: e?.message ?? 'gagal create' });
    }
  }

  void writeAudit(req, {
    action: 'mahasiswa.import',
    entity: 'mahasiswa',
    metadata: { totalRows: rows.length, created, failed },
  });

  res.json({ totalRows: rows.length, created, failed, results });
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
