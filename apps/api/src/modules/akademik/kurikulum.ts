import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, Forbidden, NotFound } from '../../lib/errors.js';
import { getProdiScope } from '../../lib/context.js';

export const kurikulumRouter = Router();

// ============================================================
// Prodi & Fakultas — read + simple create/update
// ============================================================

kurikulumRouter.get('/fakultas', async (_req, res) => {
  const items = await prisma.fakultas.findMany({
    include: { _count: { select: { prodi: true } } },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

const fakultasSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(2).max(120),
});

kurikulumRouter.post('/fakultas', async (req, res) => {
  const body = fakultasSchema.parse(req.body);
  if (await prisma.fakultas.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode fakultas sudah dipakai');
  res.status(201).json(await prisma.fakultas.create({ data: body }));
});

kurikulumRouter.patch('/fakultas/:id', async (req, res) => {
  const body = fakultasSchema.partial().parse(req.body);
  const exists = await prisma.fakultas.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound();
  if (body.kode && body.kode !== exists.kode) {
    const dup = await prisma.fakultas.findUnique({ where: { kode: body.kode } });
    if (dup) throw Conflict('Kode fakultas sudah dipakai');
  }
  res.json(await prisma.fakultas.update({ where: { id: exists.id }, data: body }));
});

kurikulumRouter.delete('/fakultas/:id', async (req, res) => {
  const exists = await prisma.fakultas.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { prodi: true } } },
  });
  if (!exists) throw NotFound();
  if (exists._count.prodi > 0) throw BadRequest(`Fakultas masih dipakai oleh ${exists._count.prodi} prodi`);
  await prisma.fakultas.delete({ where: { id: exists.id } });
  res.status(204).end();
});

kurikulumRouter.get('/prodi', async (_req, res) => {
  const items = await prisma.prodi.findMany({
    include: {
      fakultas: { select: { kode: true, nama: true } },
      _count: { select: { mahasiswa: true, dosen: true, mataKuliah: true } },
    },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

const prodiSchema = z.object({
  kode: z.string().min(2).max(20),
  nama: z.string().min(3).max(120),
  jenjang: z.enum(['d3', 'd4', 's1', 's2', 's3', 'profesi']),
  fakultasId: z.string().uuid(),
  tarifSppDefault: z.number().nonnegative().optional().nullable(),
  tarifUangPangkal: z.number().nonnegative().optional().nullable(),
});

kurikulumRouter.post('/prodi', async (req, res) => {
  const body = prodiSchema.parse(req.body);
  if (await prisma.prodi.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode prodi sudah dipakai');
  res.status(201).json(await prisma.prodi.create({ data: body }));
});

kurikulumRouter.patch('/prodi/:id', async (req, res) => {
  const body = prodiSchema.partial().parse(req.body);
  const exists = await prisma.prodi.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound();
  if (body.kode && body.kode !== exists.kode) {
    const dup = await prisma.prodi.findUnique({ where: { kode: body.kode } });
    if (dup) throw Conflict('Kode prodi sudah dipakai');
  }
  res.json(await prisma.prodi.update({ where: { id: exists.id }, data: body }));
});

kurikulumRouter.delete('/prodi/:id', async (req, res) => {
  const exists = await prisma.prodi.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { mahasiswa: true, dosen: true, mataKuliah: true, kategoriUkt: true, kurikulum: true, cpl: true } } },
  });
  if (!exists) throw NotFound();
  const c = exists._count;
  const blockers: string[] = [];
  if (c.mahasiswa > 0) blockers.push(`${c.mahasiswa} mahasiswa`);
  if (c.dosen > 0) blockers.push(`${c.dosen} dosen`);
  if (c.mataKuliah > 0) blockers.push(`${c.mataKuliah} MK`);
  if (c.kategoriUkt > 0) blockers.push(`${c.kategoriUkt} kategori UKT`);
  if (c.kurikulum > 0) blockers.push(`${c.kurikulum} kurikulum`);
  if (c.cpl > 0) blockers.push(`${c.cpl} CPL`);
  if (blockers.length > 0) throw BadRequest(`Prodi masih dipakai: ${blockers.join(', ')}`);
  await prisma.prodi.delete({ where: { id: exists.id } });
  res.status(204).end();
});

// ============================================================
// Mata Kuliah
// ============================================================

const mkSchema = z.object({
  kode: z.string().min(2).max(20),
  nama: z.string().min(2).max(120),
  namaInggris: z.string().max(120).optional(),
  sks: z.number().int().min(1).max(10),
  sksTeori: z.number().int().min(0).max(10).default(0),
  sksPraktik: z.number().int().min(0).max(10).default(0),
  jenis: z.enum(['wajib_universitas', 'wajib_prodi', 'pilihan']).default('wajib_prodi'),
  prodiId: z.string().uuid(),
});

kurikulumRouter.get('/mata-kuliah', async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);
  const items = await prisma.mataKuliah.findMany({
    where: {
      ...(search && { OR: [{ kode: { contains: search } }, { nama: { contains: search } }] }),
      ...(prodiId && { prodiId }),
    },
    include: { prodi: { select: { kode: true, nama: true } } },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

kurikulumRouter.post('/mata-kuliah', async (req, res) => {
  const body = mkSchema.parse(req.body);
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi hanya boleh tambah mata kuliah di prodi-nya');
  }
  if (await prisma.mataKuliah.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode MK sudah dipakai');
  res.status(201).json(await prisma.mataKuliah.create({ data: body }));
});

const mkImportRowSchema = z.object({
  kode: z.string().min(2).max(20),
  nama: z.string().min(2).max(120),
  namaInggris: z.string().max(120).optional().nullable(),
  sks: z.coerce.number().int().min(1).max(10),
  sksTeori: z.coerce.number().int().min(0).max(10).optional().default(0),
  sksPraktik: z.coerce.number().int().min(0).max(10).optional().default(0),
  jenis: z.enum(['wajib_universitas', 'wajib_prodi', 'pilihan']).optional().default('wajib_prodi'),
  prodiKode: z.string().min(1),
});
const mkImportBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullable().optional())).max(500),
});

kurikulumRouter.post('/mata-kuliah/import', async (req, res) => {
  const { rows } = mkImportBodySchema.parse(req.body);
  if (rows.length === 0) throw BadRequest('Tidak ada baris untuk diimpor');

  const prodiList = await prisma.prodi.findMany({ select: { id: true, kode: true } });
  const prodiByKode = new Map(prodiList.map((p) => [p.kode, p.id]));

  type ImportResult = { row: number; kode: string | null; status: 'created' | 'failed'; message?: string };
  const results: ImportResult[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    const rowNo = i + 1;
    const clean = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' || v == null ? undefined : v]),
    );
    const parsed = mkImportRowSchema.safeParse(clean);
    if (!parsed.success) {
      failed++;
      results.push({ row: rowNo, kode: (clean.kode as string | undefined) ?? null, status: 'failed', message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') });
      continue;
    }
    const r = parsed.data;
    const prodiId = prodiByKode.get(r.prodiKode);
    if (!prodiId) {
      failed++;
      results.push({ row: rowNo, kode: r.kode, status: 'failed', message: `Kode prodi tidak ditemukan: ${r.prodiKode}` });
      continue;
    }
    if (r.sksTeori + r.sksPraktik > r.sks) {
      failed++;
      results.push({ row: rowNo, kode: r.kode, status: 'failed', message: `SKS Teori (${r.sksTeori}) + Praktik (${r.sksPraktik}) > SKS total (${r.sks})` });
      continue;
    }
    const dup = await prisma.mataKuliah.findUnique({ where: { kode: r.kode }, select: { id: true } });
    if (dup) {
      failed++;
      results.push({ row: rowNo, kode: r.kode, status: 'failed', message: `Kode MK sudah dipakai: ${r.kode}` });
      continue;
    }
    try {
      await prisma.mataKuliah.create({
        data: {
          kode: r.kode, nama: r.nama,
          namaInggris: r.namaInggris ?? null,
          sks: r.sks, sksTeori: r.sksTeori, sksPraktik: r.sksPraktik,
          jenis: r.jenis,
          prodiId,
        },
      });
      created++;
      results.push({ row: rowNo, kode: r.kode, status: 'created' });
    } catch (e: any) {
      failed++;
      results.push({ row: rowNo, kode: r.kode, status: 'failed', message: e?.message ?? 'gagal create' });
    }
  }

  res.json({ totalRows: rows.length, created, failed, results });
});

kurikulumRouter.patch('/mata-kuliah/:id', async (req, res) => {
  const body = mkSchema.partial().parse(req.body);
  const mk = await prisma.mataKuliah.findUnique({ where: { id: req.params.id }, select: { prodiId: true } });
  if (!mk) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && mk.prodiId !== scopeId) throw Forbidden('Mata kuliah di luar scope prodi Anda');
  if (scopeId && body.prodiId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi tidak boleh memindah mata kuliah ke prodi lain');
  }
  res.json(await prisma.mataKuliah.update({ where: { id: req.params.id }, data: body }));
});

kurikulumRouter.delete('/mata-kuliah/:id', async (req, res) => {
  const mk = await prisma.mataKuliah.findUnique({ where: { id: req.params.id }, select: { prodiId: true } });
  if (!mk) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && mk.prodiId !== scopeId) throw Forbidden('Mata kuliah di luar scope prodi Anda');
  const usage = await prisma.kelas.count({ where: { mataKuliahId: req.params.id } });
  if (usage > 0) throw Conflict(`Mata kuliah dipakai di ${usage} kelas — hapus kelas terlebih dahulu`);
  await prisma.mataKuliah.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ============================================================
// Ruangan
// ============================================================

kurikulumRouter.get('/ruangan', async (_req, res) => {
  res.json({ items: await prisma.ruangan.findMany({ orderBy: { kode: 'asc' } }) });
});

const ruanganSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(2).max(60),
  gedung: z.string().max(60).optional(),
  lantai: z.number().int().min(0).max(20).optional(),
  kapasitas: z.number().int().min(0).max(500).default(0),
});

kurikulumRouter.post('/ruangan', async (req, res) => {
  const body = ruanganSchema.parse(req.body);
  if (await prisma.ruangan.findUnique({ where: { kode: body.kode } })) throw Conflict('Kode ruangan sudah dipakai');
  res.status(201).json(await prisma.ruangan.create({ data: body }));
});

kurikulumRouter.patch('/ruangan/:id', async (req, res) => {
  const exists = await prisma.ruangan.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Ruangan tidak ditemukan');
  const body = ruanganSchema.partial().parse(req.body);
  try {
    res.json(await prisma.ruangan.update({ where: { id: exists.id }, data: body }));
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode ruangan sudah dipakai');
    throw e;
  }
});

kurikulumRouter.delete('/ruangan/:id', async (req, res) => {
  const exists = await prisma.ruangan.findUnique({ where: { id: req.params.id }, include: { _count: { select: { kelas: true } } } });
  if (!exists) throw NotFound('Ruangan tidak ditemukan');
  if (exists._count.kelas > 0) throw Conflict(`Ruangan dipakai pada ${exists._count.kelas} kelas`);
  await prisma.ruangan.delete({ where: { id: exists.id } });
  res.status(204).end();
});

// ============================================================
// Kelas (Penawaran) — assign MK × semester × dosen × jadwal
// ============================================================

const kelasSchema = z.object({
  mataKuliahId: z.string().uuid(),
  semesterId: z.string().uuid(),
  dosenId: z.string().uuid(),
  ruanganId: z.string().uuid().optional().nullable(),
  kodeKelas: z.string().min(1).max(8),
  kapasitas: z.number().int().min(1).max(500).default(40),
  hari: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']).optional().nullable(),
  jamMulai: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  jamSelesai: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

kurikulumRouter.get('/kelas', async (req, res) => {
  const semesterId = req.query.semesterId as string | undefined;
  const dosenId = req.query.dosenId as string | undefined;
  const scopeId = await getProdiScope(req.user!.sub);
  const items = await prisma.kelas.findMany({
    where: {
      ...(semesterId && { semesterId }),
      ...(dosenId && { dosenId }),
      ...(scopeId && { mataKuliah: { prodiId: scopeId } }),
    },
    include: {
      mataKuliah: { select: { kode: true, nama: true, sks: true, prodi: { select: { kode: true, nama: true } } } },
      dosen: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true, prodi: { select: { kode: true, nama: true } } } },
      ruangan: { select: { kode: true } },
      semester: { include: { tahunAjaran: true } },
      _count: { select: { krs: true } },
    },
    orderBy: [{ semester: { kode: 'desc' } }, { hari: 'asc' }, { jamMulai: 'asc' }],
  });
  res.json({ items });
});

/**
 * Generate jadwal 16 pertemuan untuk kelas berdasarkan hari & jadwal awal semester.
 * Jika kelas tidak punya hari, lewati (pertemuan harus dibuat manual oleh dosen).
 */
const HARI_TO_DAYNUM: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};
async function autoCreatePertemuan(kelasId: string, hari: string | null, semesterId: string) {
  if (!hari) return 0;
  const targetDayNum = HARI_TO_DAYNUM[hari];
  if (targetDayNum == null) return 0;
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester) return 0;
  // Tentukan awal periode kuliah:
  // - Pakai krsSelesai + 1 hari kalau ada (kuliah mulai setelah KRS tutup)
  // - Fallback: 1 Sep utk ganjil, 1 Feb utk genap (heuristik Indonesia)
  let mulai: Date;
  if (semester.krsSelesai) {
    mulai = new Date(semester.krsSelesai);
    mulai.setDate(mulai.getDate() + 1);
  } else {
    const ta = await prisma.tahunAjaran.findUnique({ where: { id: semester.tahunAjaranId } });
    const tahun = ta?.tahunMulai ?? new Date().getFullYear();
    mulai = semester.jenis === 'ganjil' ? new Date(tahun, 8, 1) /* Sep */ : new Date(tahun + 1, 1, 1) /* Feb */;
  }
  // Geser ke hari target
  const offset = (targetDayNum - mulai.getDay() + 7) % 7;
  mulai.setDate(mulai.getDate() + offset);
  // Generate 16 pertemuan mingguan
  const data: Array<{ kelasId: string; pertemuanKe: number; tanggal: Date }> = [];
  for (let i = 1; i <= 16; i++) {
    const tanggal = new Date(mulai);
    tanggal.setDate(mulai.getDate() + (i - 1) * 7);
    data.push({ kelasId, pertemuanKe: i, tanggal });
  }
  const result = await prisma.pertemuan.createMany({ data, skipDuplicates: true });
  return result.count;
}

const kelasImportRowSchema = z.object({
  mkKode: z.string().min(1),
  semesterKode: z.string().min(1),
  dosenNidn: z.string().min(1),
  kodeKelas: z.string().min(1).max(8),
  kapasitas: z.coerce.number().int().min(1).max(500).optional().default(40),
  hari: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']).optional().nullable(),
  jamMulai: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  jamSelesai: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  ruanganKode: z.string().optional().nullable(),
});
const kelasImportBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullable().optional())).max(500),
});

kurikulumRouter.post('/kelas/import', async (req, res) => {
  const { rows } = kelasImportBodySchema.parse(req.body);
  if (rows.length === 0) throw BadRequest('Tidak ada baris untuk diimpor');

  const [mkList, semList, dosenList, ruanganList] = await Promise.all([
    prisma.mataKuliah.findMany({ select: { id: true, kode: true } }),
    prisma.semester.findMany({ select: { id: true, kode: true } }),
    prisma.dosen.findMany({ select: { id: true, nidn: true } }),
    prisma.ruangan.findMany({ select: { id: true, kode: true } }),
  ]);
  const mkByKode = new Map(mkList.map((m) => [m.kode, m.id]));
  const semByKode = new Map(semList.map((s) => [s.kode, s.id]));
  const dosenByNidn = new Map(dosenList.map((d) => [d.nidn, d.id]));
  const ruanganByKode = new Map(ruanganList.map((r) => [r.kode, r.id]));

  type ImportResult = { row: number; key: string | null; status: 'created' | 'failed'; message?: string };
  const results: ImportResult[] = [];
  let created = 0; let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    const rowNo = i + 1;
    const clean = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' || v == null ? undefined : v]),
    );
    const parsed = kelasImportRowSchema.safeParse(clean);
    if (!parsed.success) {
      failed++;
      results.push({ row: rowNo, key: (clean.kodeKelas as string | undefined) ?? null, status: 'failed', message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') });
      continue;
    }
    const r = parsed.data;
    const keyLabel = `${r.mkKode}/${r.kodeKelas}`;
    const mataKuliahId = mkByKode.get(r.mkKode);
    if (!mataKuliahId) { failed++; results.push({ row: rowNo, key: keyLabel, status: 'failed', message: `Kode MK tidak ditemukan: ${r.mkKode}` }); continue; }
    const semesterId = semByKode.get(r.semesterKode);
    if (!semesterId) { failed++; results.push({ row: rowNo, key: keyLabel, status: 'failed', message: `Kode semester tidak ditemukan: ${r.semesterKode}` }); continue; }
    const dosenId = dosenByNidn.get(r.dosenNidn);
    if (!dosenId) { failed++; results.push({ row: rowNo, key: keyLabel, status: 'failed', message: `NIDN dosen tidak ditemukan: ${r.dosenNidn}` }); continue; }
    let ruanganId: string | null = null;
    if (r.ruanganKode) {
      ruanganId = ruanganByKode.get(r.ruanganKode) ?? null;
      if (!ruanganId) { failed++; results.push({ row: rowNo, key: keyLabel, status: 'failed', message: `Kode ruangan tidak ditemukan: ${r.ruanganKode}` }); continue; }
    }
    if (r.jamMulai && r.jamSelesai && r.jamMulai >= r.jamSelesai) {
      failed++; results.push({ row: rowNo, key: keyLabel, status: 'failed', message: 'Jam mulai harus lebih awal dari jam selesai' }); continue;
    }
    try {
      const created2 = await prisma.kelas.create({
        data: {
          mataKuliahId, semesterId, dosenId, ruanganId,
          kodeKelas: r.kodeKelas,
          kapasitas: r.kapasitas,
          hari: r.hari ?? null,
          jamMulai: r.jamMulai ?? null,
          jamSelesai: r.jamSelesai ?? null,
        },
      });
      await prisma.kelasDosen.create({ data: { kelasId: created2.id, dosenId, peran: 'lead' } });
      await autoCreatePertemuan(created2.id, created2.hari, created2.semesterId);
      created++;
      results.push({ row: rowNo, key: keyLabel, status: 'created' });
    } catch (e: any) {
      failed++;
      const msg = e?.code === 'P2002' ? 'Kombinasi MK + semester + kode kelas sudah ada' : (e?.message ?? 'gagal create');
      results.push({ row: rowNo, key: keyLabel, status: 'failed', message: msg });
    }
  }
  res.json({ totalRows: rows.length, created, failed, results });
});

kurikulumRouter.post('/kelas', async (req, res) => {
  const body = kelasSchema.parse(req.body);
  if (body.jamMulai && body.jamSelesai && body.jamMulai >= body.jamSelesai) {
    throw BadRequest('Jam mulai harus lebih awal dari jam selesai');
  }
  try {
    const created = await prisma.kelas.create({ data: body });
    await prisma.kelasDosen.create({
      data: { kelasId: created.id, dosenId: created.dosenId, peran: 'lead' },
    });
    // Auto-generate 16 pertemuan (kalau kelas punya jadwal hari)
    const pertemuanCount = await autoCreatePertemuan(created.id, created.hari, created.semesterId);
    res.status(201).json({ ...created, pertemuanCount });
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kombinasi MK + semester + kode kelas sudah ada');
    throw e;
  }
});

/** Akademik bisa trigger ulang generate pertemuan utk kelas yang sudah ada (idempotent). */
kurikulumRouter.post('/kelas/:id/generate-pertemuan', async (req, res) => {
  const k = await prisma.kelas.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  const count = await autoCreatePertemuan(k.id, k.hari, k.semesterId);
  res.json({ ok: true, pertemuanDitambahkan: count });
});

kurikulumRouter.patch('/kelas/:id', async (req, res) => {
  const body = kelasSchema.partial().parse(req.body);
  const before = await prisma.kelas.findUnique({ where: { id: req.params.id } });
  const updated = await prisma.kelas.update({ where: { id: req.params.id }, data: body });
  // Sinkron lead di KelasDosen bila dosenId berubah
  if (before && body.dosenId && body.dosenId !== before.dosenId) {
    await prisma.kelasDosen.deleteMany({ where: { kelasId: updated.id, peran: 'lead' } });
    await prisma.kelasDosen.upsert({
      where: { kelasId_dosenId: { kelasId: updated.id, dosenId: updated.dosenId } },
      update: { peran: 'lead' },
      create: { kelasId: updated.id, dosenId: updated.dosenId, peran: 'lead' },
    });
  }
  res.json(updated);
});

kurikulumRouter.delete('/kelas/:id', async (req, res) => {
  const usage = await prisma.krs.count({ where: { kelasId: req.params.id } });
  if (usage > 0) throw Conflict(`Kelas dipakai di ${usage} KRS — pindahkan atau batalkan KRS terlebih dahulu`);
  await prisma.kelas.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ============================================================
// Team teaching — kelola anggota dosen untuk satu kelas
// ============================================================

kurikulumRouter.get('/kelas/:id/dosen', async (req, res) => {
  const k = await prisma.kelas.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  const team = await prisma.kelasDosen.findMany({
    where: { kelasId: k.id },
    include: {
      dosen: {
        select: {
          id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true,
          prodi: { select: { kode: true, nama: true } },
        },
      },
    },
    orderBy: [{ peran: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({
    items: team.map((t) => ({
      id: t.id,
      dosenId: t.dosenId,
      nidn: t.dosen.nidn,
      nama: t.dosen.nama,
      gelarDepan: t.dosen.gelarDepan,
      gelarBelakang: t.dosen.gelarBelakang,
      prodi: t.dosen.prodi,
      peran: t.peran,
    })),
  });
});

const teamSchema = z.object({
  dosenId: z.string().uuid(),
  peran: z.enum(['lead', 'anggota', 'asisten']).default('anggota'),
});

kurikulumRouter.post('/kelas/:id/dosen', async (req, res) => {
  const k = await prisma.kelas.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  const body = teamSchema.parse(req.body);
  const dosen = await prisma.dosen.findUnique({ where: { id: body.dosenId } });
  if (!dosen) throw BadRequest('Dosen tidak ditemukan');
  // Hanya satu lead per kelas
  if (body.peran === 'lead') {
    const existingLead = await prisma.kelasDosen.findFirst({
      where: { kelasId: k.id, peran: 'lead', NOT: { dosenId: body.dosenId } },
    });
    if (existingLead) throw Conflict('Kelas sudah memiliki dosen lead — ubah peran lead lama menjadi anggota terlebih dahulu');
  }
  try {
    const created = await prisma.kelasDosen.create({
      data: { kelasId: k.id, dosenId: body.dosenId, peran: body.peran },
    });
    // Jika lead baru, sinkronkan Kelas.dosenId (legacy field)
    if (body.peran === 'lead') {
      await prisma.kelas.update({ where: { id: k.id }, data: { dosenId: body.dosenId } });
    }
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Dosen sudah menjadi anggota team kelas ini');
    throw e;
  }
});

kurikulumRouter.patch('/kelas/:kelasId/dosen/:dosenId', async (req, res) => {
  const body = z.object({ peran: z.enum(['lead', 'anggota', 'asisten']) }).parse(req.body);
  const existing = await prisma.kelasDosen.findUnique({
    where: { kelasId_dosenId: { kelasId: req.params.kelasId, dosenId: req.params.dosenId } },
  });
  if (!existing) throw NotFound('Anggota team tidak ditemukan');
  if (body.peran === 'lead' && existing.peran !== 'lead') {
    // Demote lead lain jadi anggota
    await prisma.kelasDosen.updateMany({
      where: { kelasId: req.params.kelasId, peran: 'lead', NOT: { dosenId: req.params.dosenId } },
      data: { peran: 'anggota' },
    });
    await prisma.kelas.update({ where: { id: req.params.kelasId }, data: { dosenId: req.params.dosenId } });
  }
  const updated = await prisma.kelasDosen.update({
    where: { kelasId_dosenId: { kelasId: req.params.kelasId, dosenId: req.params.dosenId } },
    data: { peran: body.peran },
  });
  res.json(updated);
});

kurikulumRouter.delete('/kelas/:kelasId/dosen/:dosenId', async (req, res) => {
  const existing = await prisma.kelasDosen.findUnique({
    where: { kelasId_dosenId: { kelasId: req.params.kelasId, dosenId: req.params.dosenId } },
  });
  if (!existing) throw NotFound('Anggota team tidak ditemukan');
  if (existing.peran === 'lead') {
    throw BadRequest('Dosen lead tidak dapat dihapus — pindahkan peran lead ke dosen lain terlebih dahulu');
  }
  await prisma.kelasDosen.delete({
    where: { kelasId_dosenId: { kelasId: req.params.kelasId, dosenId: req.params.dosenId } },
  });
  res.status(204).end();
});
