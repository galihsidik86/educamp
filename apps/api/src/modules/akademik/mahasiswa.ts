import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { hashPassword } from '../../lib/password.js';
import { BadRequest, Conflict, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { ensureUangPangkal } from '../../lib/tagihan-ukt.js';
import { calculateIp } from '../../lib/grade.js';
import { getActiveSemester, getProdiScope } from '../../lib/context.js';

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
  kategoriUktId: z.string().uuid().optional().nullable(),
  defaultCicilanUkt: z.number().int().min(1).max(12).optional(),
  status: z.enum(STATUS).default('aktif'),
  // PDDikti biodata (Phase 1)
  nik: z.string().regex(/^\d{16}$/).optional().nullable(),
  nisn: z.string().regex(/^\d{10}$/).optional().nullable(),
  npsn: z.string().regex(/^\d{8,10}$/).optional().nullable(),
  namaSekolahAsal: z.string().max(120).optional().nullable(),
  jenisSekolahAsal: z.string().max(40).optional().nullable(),
  tahunLulusSekolah: z.number().int().min(1990).max(2100).optional().nullable(),
  kewarganegaraan: z.string().max(60).optional().nullable(),
  kodeWilayahAlamat: z.string().max(8).optional().nullable(),
  pembiayaan: z.string().max(60).optional().nullable(),
  kebutuhanKhusus: z.string().max(40).optional().nullable(),
  semesterAwal: z.string().regex(/^\d{5}$/).optional().nullable(),
  agamaKode: z.number().int().optional().nullable(),
  jenisTinggalKode: z.number().int().optional().nullable(),
  alatTransportasiKode: z.number().int().optional().nullable(),
  jalurMasukKode: z.string().max(20).optional().nullable(),
});

const updateSchema = createSchema.omit({ nim: true, email: true, password: true }).partial().extend({
  email: z.string().email().optional(),
});

mahasiswaRouter.get('/mahasiswa', async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);
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
      kategoriUkt: { select: { id: true, kode: true, nama: true, nominalSemester: true } },
    },
    orderBy: [{ angkatan: 'desc' }, { nim: 'asc' }],
    take: 200,
  });
  res.json({ items });
});

mahasiswaRouter.get('/mahasiswa/:id', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const m = await prisma.mahasiswa.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, isActive: true } },
      prodi: { include: { fakultas: true } },
      dpa: true,
      kategoriUkt: true,
    },
  });
  if (!m) throw NotFound();
  if (scopeId && m.prodiId !== scopeId) throw Forbidden('Mahasiswa di luar scope prodi Anda');
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
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi hanya boleh tambah mahasiswa di prodi-nya');
  }

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
          kategoriUktId: body.kategoriUktId ?? null,
          defaultCicilanUkt: body.defaultCicilanUkt ?? 1,
          status: body.status,
          // PDDikti biodata
          nik: body.nik ?? null,
          nisn: body.nisn ?? null,
          npsn: body.npsn ?? null,
          namaSekolahAsal: body.namaSekolahAsal ?? null,
          jenisSekolahAsal: body.jenisSekolahAsal ?? null,
          tahunLulusSekolah: body.tahunLulusSekolah ?? null,
          kewarganegaraan: body.kewarganegaraan ?? null,
          kodeWilayahAlamat: body.kodeWilayahAlamat ?? null,
          pembiayaan: body.pembiayaan ?? null,
          kebutuhanKhusus: body.kebutuhanKhusus ?? null,
          semesterAwal: body.semesterAwal ?? null,
          agamaKode: body.agamaKode ?? null,
          jenisTinggalKode: body.jenisTinggalKode ?? null,
          alatTransportasiKode: body.alatTransportasiKode ?? null,
          jalurMasukKode: body.jalurMasukKode ?? null,
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

  // Auto-create tagihan uang pangkal (kalau Prodi.tarifUangPangkal di-set)
  const pangkal = await ensureUangPangkal(created.mahasiswa!.id);
  res.status(201).json({ ...created.mahasiswa, uangPangkal: pangkal });
});

mahasiswaRouter.patch('/mahasiswa/:id', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!m) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && m.prodiId !== scopeId) {
    throw Forbidden('Mahasiswa di luar scope prodi Anda');
  }
  if (scopeId && body.prodiId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi tidak boleh memindah mahasiswa ke prodi lain');
  }

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
      ...(body.kategoriUktId !== undefined && { kategoriUktId: body.kategoriUktId }),
      ...(body.defaultCicilanUkt !== undefined && { defaultCicilanUkt: body.defaultCicilanUkt }),
      ...(body.status !== undefined && { status: body.status }),
      // PDDikti biodata
      ...(body.nik !== undefined && { nik: body.nik }),
      ...(body.nisn !== undefined && { nisn: body.nisn }),
      ...(body.npsn !== undefined && { npsn: body.npsn }),
      ...(body.namaSekolahAsal !== undefined && { namaSekolahAsal: body.namaSekolahAsal }),
      ...(body.jenisSekolahAsal !== undefined && { jenisSekolahAsal: body.jenisSekolahAsal }),
      ...(body.tahunLulusSekolah !== undefined && { tahunLulusSekolah: body.tahunLulusSekolah }),
      ...(body.kewarganegaraan !== undefined && { kewarganegaraan: body.kewarganegaraan }),
      ...(body.kodeWilayahAlamat !== undefined && { kodeWilayahAlamat: body.kodeWilayahAlamat }),
      ...(body.pembiayaan !== undefined && { pembiayaan: body.pembiayaan }),
      ...(body.kebutuhanKhusus !== undefined && { kebutuhanKhusus: body.kebutuhanKhusus }),
      ...(body.semesterAwal !== undefined && { semesterAwal: body.semesterAwal }),
      ...(body.agamaKode !== undefined && { agamaKode: body.agamaKode }),
      ...(body.jenisTinggalKode !== undefined && { jenisTinggalKode: body.jenisTinggalKode }),
      ...(body.alatTransportasiKode !== undefined && { alatTransportasiKode: body.alatTransportasiKode }),
      ...(body.jalurMasukKode !== undefined && { jalurMasukKode: body.jalurMasukKode }),
    },
  });
  res.json(updated);
});

mahasiswaRouter.delete('/mahasiswa/:id', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id } });
  if (!m) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && m.prodiId !== scopeId) {
    throw Forbidden('Mahasiswa di luar scope prodi Anda');
  }
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

// ============================================================
// Transkrip & Absensi mahasiswa (akademik view)
// ============================================================

mahasiswaRouter.get('/mahasiswa/:id/transkrip', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({
    where: { id: req.params.id },
    include: { prodi: { include: { fakultas: true } } },
  });
  if (!m) throw NotFound('Mahasiswa tidak ditemukan');
  const nilai = await prisma.nilai.findMany({
    where: { mahasiswaId: m.id, status: 'finalized' },
    include: {
      krs: {
        include: { kelas: { include: { mataKuliah: true, semester: { include: { tahunAjaran: true } } } } },
      },
    },
    orderBy: [{ krs: { kelas: { semester: { kode: 'asc' } } } }],
  });
  const items = nilai.map((n) => ({
    semesterKode: n.krs.kelas.semester.kode,
    semesterNama: `${n.krs.kelas.semester.jenis} ${n.krs.kelas.semester.tahunAjaran.kode}`,
    kodeMK: n.krs.kelas.mataKuliah.kode,
    namaMK: n.krs.kelas.mataKuliah.nama,
    sks: n.krs.kelas.mataKuliah.sks,
    nilaiHuruf: n.nilaiHuruf,
    nilaiAngka: n.nilaiAngka,
    bobot: n.bobot,
  }));
  const ipk = calculateIp(items.map((i) => ({ sks: i.sks, bobot: i.bobot ?? null })));
  res.json({
    mahasiswa: {
      nim: m.nim, nama: m.nama, angkatan: m.angkatan,
      prodi: { kode: m.prodi.kode, nama: m.prodi.nama, jenjang: m.prodi.jenjang },
      fakultas: { kode: m.prodi.fakultas.kode, nama: m.prodi.fakultas.nama },
    },
    ipk: ipk.ip,
    totalSksLulus: ipk.totalSks,
    items,
  });
});

mahasiswaRouter.get('/mahasiswa/:id/absensi', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({
    where: { id: req.params.id },
    include: { prodi: { include: { fakultas: true } } },
  });
  if (!m) throw NotFound('Mahasiswa tidak ditemukan');
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;
  const semester = await prisma.semester.findUnique({ where: { id: semesterId }, include: { tahunAjaran: true } });
  if (!semester) throw NotFound('Semester tidak ditemukan');

  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId, status: 'disetujui' },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          pertemuan: {
            orderBy: { pertemuanKe: 'asc' },
            include: { absensi: { where: { mahasiswaId: m.id }, select: { status: true, catatan: true } } },
          },
        },
      },
    },
  });

  const items = krs.map((k) => {
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    let totalDinilai = 0;
    const detail: Array<{ pertemuanKe: number; tanggal: string; topik: string | null; status: string | null; catatan: string | null }> = [];
    for (const p of k.kelas.pertemuan) {
      const a = p.absensi[0];
      const status = a?.status ?? null;
      if (status && status in c) { ((c as Record<string, number>)[status] = ((c as Record<string, number>)[status] ?? 0) + 1); totalDinilai++; }
      detail.push({ pertemuanKe: p.pertemuanKe, tanggal: p.tanggal.toISOString(), topik: p.topik, status, catatan: a?.catatan ?? null });
    }
    const persentaseHadir = totalDinilai > 0 ? Math.round((c.hadir / totalDinilai) * 100) : null;
    return {
      kelasId: k.kelas.id,
      kodeMK: k.kelas.mataKuliah.kode,
      namaMK: k.kelas.mataKuliah.nama,
      sks: k.kelas.mataKuliah.sks,
      kodeKelas: k.kelas.kodeKelas,
      dosen: [k.kelas.dosen.gelarDepan, k.kelas.dosen.nama, k.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      totalPertemuan: k.kelas.pertemuan.length,
      totalDinilai,
      ringkasan: c,
      persentaseHadir,
      detail,
    };
  });

  res.json({
    mahasiswa: {
      nim: m.nim, nama: m.nama, angkatan: m.angkatan,
      prodi: { kode: m.prodi.kode, nama: m.prodi.nama },
      fakultas: { nama: m.prodi.fakultas.nama },
    },
    semester: { id: semester.id, kode: semester.kode, jenis: semester.jenis, tahunAjaran: { kode: semester.tahunAjaran.kode } },
    items,
  });
});

// ============================================================
// Reference data PDDikti — read-only lookup utk dropdown
// ============================================================
mahasiswaRouter.get('/pddikti/refs', async (_req, res) => {
  const [agama, jenisTinggal, alatTransportasi, jalurMasuk] = await Promise.all([
    prisma.kodeAgama.findMany({ orderBy: { kode: 'asc' } }),
    prisma.kodeJenisTinggal.findMany({ orderBy: { kode: 'asc' } }),
    prisma.kodeAlatTransportasi.findMany({ orderBy: { kode: 'asc' } }),
    prisma.kodeJalurMasuk.findMany({ orderBy: { kode: 'asc' } }),
  ]);
  res.json({ agama, jenisTinggal, alatTransportasi, jalurMasuk });
});

// ============================================================
// Orang tua / wali mahasiswa — CRUD
// ============================================================
const orangTuaSchema = z.object({
  jenis: z.enum(['ayah', 'ibu', 'wali']),
  nama: z.string().min(1).max(120),
  nik: z.string().regex(/^\d{16}$/).optional().nullable(),
  tahunLahir: z.number().int().min(1900).max(2100).optional().nullable(),
  pendidikan: z.string().max(40).optional().nullable(),
  pekerjaan: z.string().max(80).optional().nullable(),
  penghasilan: z.number().optional().nullable(),
});

mahasiswaRouter.get('/mahasiswa/:id/orang-tua', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id }, select: { prodiId: true } });
  if (!m) throw NotFound();
  if (scopeId && m.prodiId !== scopeId) throw Forbidden('Mahasiswa di luar scope prodi Anda');
  const items = await prisma.orangTuaMahasiswa.findMany({
    where: { mahasiswaId: req.params.id },
    orderBy: { jenis: 'asc' },
  });
  res.json({ items });
});

mahasiswaRouter.put('/mahasiswa/:id/orang-tua', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.id }, select: { prodiId: true } });
  if (!m) throw NotFound();
  if (scopeId && m.prodiId !== scopeId) throw Forbidden('Mahasiswa di luar scope prodi Anda');

  const body = z.object({ items: z.array(orangTuaSchema).max(3) }).parse(req.body);
  // Upsert by jenis. Hapus row yang tidak ada di payload.
  const jenisDiKirim = new Set(body.items.map((i) => i.jenis));
  await prisma.$transaction(async (tx) => {
    await tx.orangTuaMahasiswa.deleteMany({
      where: { mahasiswaId: req.params.id, jenis: { notIn: Array.from(jenisDiKirim) as any } },
    });
    for (const item of body.items) {
      await tx.orangTuaMahasiswa.upsert({
        where: { mahasiswaId_jenis: { mahasiswaId: req.params.id, jenis: item.jenis } },
        create: {
          mahasiswaId: req.params.id,
          jenis: item.jenis,
          nama: item.nama,
          nik: item.nik ?? null,
          tahunLahir: item.tahunLahir ?? null,
          pendidikan: item.pendidikan ?? null,
          pekerjaan: item.pekerjaan ?? null,
          penghasilan: item.penghasilan ?? null,
        },
        update: {
          nama: item.nama,
          nik: item.nik ?? null,
          tahunLahir: item.tahunLahir ?? null,
          pendidikan: item.pendidikan ?? null,
          pekerjaan: item.pekerjaan ?? null,
          penghasilan: item.penghasilan ?? null,
        },
      });
    }
  });

  void writeAudit(req, {
    action: 'mahasiswa.orang_tua.update',
    entity: 'mahasiswa',
    entityId: req.params.id,
    metadata: { count: body.items.length },
  });

  const items = await prisma.orangTuaMahasiswa.findMany({
    where: { mahasiswaId: req.params.id },
    orderBy: { jenis: 'asc' },
  });
  res.json({ items });
});
