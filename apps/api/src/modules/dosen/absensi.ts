import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const absensiRouter = Router();

/** Pastikan kelas milik dosen yang sedang login. */
async function getKelasOwned(userId: string, kelasId: string) {
  const d = await getDosenForUser(userId);
  const k = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: { mataKuliah: true, semester: true },
  });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  if (k.dosenId !== d.id) throw Forbidden('Kelas ini bukan kelas Anda');
  return k;
}

async function getPertemuanOwned(userId: string, pertemuanId: string) {
  const p = await prisma.pertemuan.findUnique({
    where: { id: pertemuanId },
    include: { kelas: true },
  });
  if (!p) throw NotFound('Pertemuan tidak ditemukan');
  const d = await getDosenForUser(userId);
  if (p.kelas.dosenId !== d.id) throw Forbidden('Pertemuan ini bukan dari kelas Anda');
  return p;
}

const KRITIS_THRESHOLD = 75;

/**
 * Rekap absensi per peserta dalam satu kelas — untuk dosen.
 * Setiap peserta: jumlah hadir/izin/sakit/alpa, persentase kehadiran, flag kritis.
 */
absensiRouter.get('/kelas/:kelasId/kehadiran-rekap', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);

  const pertemuan = await prisma.pertemuan.findMany({
    where: { kelasId: k.id },
    select: { id: true, pertemuanKe: true, tanggal: true, topik: true },
    orderBy: { pertemuanKe: 'asc' },
  });
  const totalPertemuan = pertemuan.length;

  const peserta = await prisma.krs.findMany({
    where: { kelasId: k.id, status: 'disetujui' },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
    orderBy: { mahasiswa: { nim: 'asc' } },
  });

  const absensi = await prisma.absensi.findMany({
    where: { pertemuan: { kelasId: k.id } },
    select: { mahasiswaId: true, status: true },
  });
  const perMhs = new Map<string, { hadir: number; izin: number; sakit: number; alpa: number }>();
  for (const a of absensi) {
    const cur = perMhs.get(a.mahasiswaId) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    cur[a.status]++;
    perMhs.set(a.mahasiswaId, cur);
  }

  const items = peserta.map((p) => {
    const c = perMhs.get(p.mahasiswaId) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    const totalDinilai = c.hadir + c.izin + c.sakit + c.alpa;
    const persentaseHadir = totalDinilai > 0 ? Math.round((c.hadir / totalDinilai) * 100) : null;
    return {
      mahasiswaId: p.mahasiswaId,
      nim: p.mahasiswa.nim,
      nama: p.mahasiswa.nama,
      ringkasan: c,
      totalDinilai,
      persentaseHadir,
      kritis: persentaseHadir != null && persentaseHadir < KRITIS_THRESHOLD,
    };
  });

  res.json({
    kelas: {
      id: k.id, kodeMK: k.mataKuliah.kode, namaMK: k.mataKuliah.nama, kodeKelas: k.kodeKelas,
    },
    totalPertemuan,
    threshold: KRITIS_THRESHOLD,
    pertemuan,
    items,
  });
});

/**
 * List pertemuan kelas, dengan ringkasan absensi tiap pertemuan.
 */
absensiRouter.get('/kelas/:kelasId/pertemuan', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);
  const pertemuan = await prisma.pertemuan.findMany({
    where: { kelasId: k.id },
    orderBy: { pertemuanKe: 'asc' },
    include: {
      _count: { select: { absensi: true } },
      absensi: { select: { status: true } },
    },
  });
  res.json({
    kelas: { id: k.id, kodeMK: k.mataKuliah.kode, namaMK: k.mataKuliah.nama, kodeKelas: k.kodeKelas },
    items: pertemuan.map((p) => {
      const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
      for (const a of p.absensi) c[a.status]++;
      return {
        id: p.id,
        pertemuanKe: p.pertemuanKe,
        tanggal: p.tanggal,
        topik: p.topik,
        catatan: p.catatan,
        totalAbsensi: p._count.absensi,
        ringkasan: c,
      };
    }),
  });
});

const pertemuanSchema = z.object({
  pertemuanKe: z.number().int().min(1).max(32).optional(),
  tanggal: z.string().min(1),
  topik: z.string().max(200).optional().nullable(),
  catatan: z.string().max(500).optional().nullable(),
});

/**
 * Buat pertemuan baru. pertemuanKe opsional — kalau tidak diisi, ambil
 * nomor terakhir + 1.
 */
absensiRouter.post('/kelas/:kelasId/pertemuan', async (req, res) => {
  const k = await getKelasOwned(req.user!.sub, req.params.kelasId);
  const body = pertemuanSchema.parse(req.body);

  let pertemuanKe = body.pertemuanKe;
  if (!pertemuanKe) {
    const last = await prisma.pertemuan.findFirst({
      where: { kelasId: k.id },
      orderBy: { pertemuanKe: 'desc' },
      select: { pertemuanKe: true },
    });
    pertemuanKe = (last?.pertemuanKe ?? 0) + 1;
  }

  const exists = await prisma.pertemuan.findUnique({
    where: { kelasId_pertemuanKe: { kelasId: k.id, pertemuanKe } },
  });
  if (exists) throw BadRequest(`Pertemuan ke-${pertemuanKe} sudah ada`);

  const p = await prisma.pertemuan.create({
    data: {
      kelasId: k.id,
      pertemuanKe,
      tanggal: new Date(body.tanggal),
      topik: body.topik ?? null,
      catatan: body.catatan ?? null,
    },
  });
  void writeAudit(req, {
    action: 'absensi.pertemuan.create',
    entity: 'pertemuan',
    entityId: p.id,
    metadata: { kelasId: k.id, pertemuanKe: p.pertemuanKe },
  });
  res.status(201).json(p);
});

/** Edit tanggal/topik/catatan pertemuan. */
absensiRouter.patch('/pertemuan/:id', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  const body = pertemuanSchema.partial().parse(req.body);

  const data: any = {};
  if (body.tanggal !== undefined) data.tanggal = new Date(body.tanggal);
  if (body.topik !== undefined) data.topik = body.topik;
  if (body.catatan !== undefined) data.catatan = body.catatan;
  if (body.pertemuanKe !== undefined && body.pertemuanKe !== p.pertemuanKe) {
    const conflict = await prisma.pertemuan.findUnique({
      where: { kelasId_pertemuanKe: { kelasId: p.kelasId, pertemuanKe: body.pertemuanKe } },
    });
    if (conflict) throw BadRequest(`Pertemuan ke-${body.pertemuanKe} sudah ada`);
    data.pertemuanKe = body.pertemuanKe;
  }

  const updated = await prisma.pertemuan.update({ where: { id: p.id }, data });
  res.json(updated);
});

/** Hapus pertemuan (sekaligus absensi-nya, via onDelete cascade). */
absensiRouter.delete('/pertemuan/:id', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  await prisma.pertemuan.delete({ where: { id: p.id } });
  void writeAudit(req, {
    action: 'absensi.pertemuan.delete',
    entity: 'pertemuan',
    entityId: p.id,
    metadata: { kelasId: p.kelasId, pertemuanKe: p.pertemuanKe },
  });
  res.status(204).end();
});

/**
 * Daftar mahasiswa peserta + status absensi pertemuan tersebut.
 * Mahasiswa diambil dari Krs disetujui di semester kelas.
 */
absensiRouter.get('/pertemuan/:id/absensi', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  const kelas = await prisma.kelas.findUniqueOrThrow({
    where: { id: p.kelasId },
    include: { semester: true, mataKuliah: true },
  });

  const peserta = await prisma.krs.findMany({
    where: { kelasId: p.kelasId, status: 'disetujui' },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
    orderBy: { mahasiswa: { nim: 'asc' } },
  });

  const absensi = await prisma.absensi.findMany({
    where: { pertemuanId: p.id },
    select: { mahasiswaId: true, status: true, catatan: true },
  });
  const byMhs = new Map(absensi.map((a) => [a.mahasiswaId, a]));

  res.json({
    pertemuan: {
      id: p.id, pertemuanKe: p.pertemuanKe, tanggal: p.tanggal, topik: p.topik,
    },
    kelas: { id: kelas.id, kodeMK: kelas.mataKuliah.kode, namaMK: kelas.mataKuliah.nama, kodeKelas: kelas.kodeKelas },
    peserta: peserta.map((k) => {
      const a = byMhs.get(k.mahasiswaId);
      return {
        mahasiswaId: k.mahasiswaId,
        nim: k.mahasiswa.nim,
        nama: k.mahasiswa.nama,
        status: a?.status ?? null, // null = belum diisi
        catatan: a?.catatan ?? null,
      };
    }),
  });
});

const absensiBatchSchema = z.object({
  items: z.array(z.object({
    mahasiswaId: z.string().uuid(),
    status: z.enum(['hadir', 'izin', 'sakit', 'alpa']),
    catatan: z.string().max(200).optional().nullable(),
  })),
});

/**
 * Set absensi batch — upsert per (pertemuanId, mahasiswaId).
 * Hanya menerima mahasiswa yang KRS-nya disetujui di kelas ini.
 */
absensiRouter.post('/pertemuan/:id/absensi', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  const { items } = absensiBatchSchema.parse(req.body);
  if (items.length === 0) throw BadRequest('Tidak ada data absensi');

  // Validasi peserta
  const pesertaIds = new Set(
    (await prisma.krs.findMany({
      where: { kelasId: p.kelasId, status: 'disetujui' },
      select: { mahasiswaId: true },
    })).map((k) => k.mahasiswaId),
  );
  for (const it of items) {
    if (!pesertaIds.has(it.mahasiswaId)) {
      throw BadRequest(`Mahasiswa ${it.mahasiswaId} bukan peserta kelas ini`);
    }
  }

  await prisma.$transaction(
    items.map((it) =>
      prisma.absensi.upsert({
        where: { pertemuanId_mahasiswaId: { pertemuanId: p.id, mahasiswaId: it.mahasiswaId } },
        create: { pertemuanId: p.id, mahasiswaId: it.mahasiswaId, status: it.status, catatan: it.catatan ?? null },
        update: { status: it.status, catatan: it.catatan ?? null },
      }),
    ),
  );
  void writeAudit(req, {
    action: 'absensi.set',
    entity: 'pertemuan',
    entityId: p.id,
    metadata: { kelasId: p.kelasId, pertemuanKe: p.pertemuanKe, count: items.length },
  });
  res.json({ ok: true, updated: items.length });
});
