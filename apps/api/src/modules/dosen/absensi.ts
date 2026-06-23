import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasiForMany } from '../../lib/notifikasi.js';
import { notifyWaliPresensi } from '../../lib/notif-presensi.js';

export const absensiRouter = Router();

/** Pastikan kelas dapat diakses dosen (lead atau anggota team). */
async function getKelasOwned(userId: string, kelasId: string) {
  const d = await getDosenForUser(userId);
  const k = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: { mataKuliah: true, semester: true },
  });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  await requireKelasOwnership(d.id, k.id);
  return k;
}

async function getPertemuanOwned(userId: string, pertemuanId: string) {
  const p = await prisma.pertemuan.findUnique({
    where: { id: pertemuanId },
    include: { kelas: true },
  });
  if (!p) throw NotFound('Pertemuan tidak ditemukan');
  const d = await getDosenForUser(userId);
  await requireKelasOwnership(d.id, p.kelasId);
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
  const [pertemuan, pesertaCount] = await Promise.all([
    prisma.pertemuan.findMany({
      where: { kelasId: k.id },
      orderBy: { pertemuanKe: 'asc' },
      include: {
        ruangan: { select: { kode: true, nama: true } },
        _count: { select: { absensi: true } },
        absensi: { select: { status: true } },
      },
    }),
    prisma.krs.count({ where: { kelasId: k.id, status: 'disetujui' } }),
  ]);
  res.json({
    kelas: { id: k.id, kodeMK: k.mataKuliah.kode, namaMK: k.mataKuliah.nama, kodeKelas: k.kodeKelas, pesertaCount },
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
        tanggalAsli: p.tanggalAsli,
        alasanReschedule: p.alasanReschedule,
        ruangan: p.ruangan ? { kode: p.ruangan.kode, nama: p.ruangan.nama } : null,
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

/** List ruangan (read-only) untuk pilihan reschedule. */
absensiRouter.get('/ruangan', async (_req, res) => {
  const items = await prisma.ruangan.findMany({
    select: { id: true, kode: true, nama: true, gedung: true, kapasitas: true },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

const rescheduleSchema = z.object({
  tanggal: z.string().min(1),                    // tanggal+jam baru (ISO)
  ruanganId: z.string().uuid().optional().nullable(),
  alasan: z.string().min(10).max(500),
  durasiMenit: z.number().int().min(15).max(480).optional(),
});

/**
 * Reschedule satu pertemuan: pindah tanggal/ruangan dengan alasan.
 * - Snapshot tanggalAsli pada reschedule pertama (tidak ditimpa pada reschedule berikutnya)
 * - Cek bentrok ruangan (kalau diisi) dalam ±durasi yang sama
 * - Cek bentrok jadwal dosen pengampu kelas (Kelas lain yang berlangsung di slot sama)
 * - Notifikasi semua peserta KRS disetujui
 */
absensiRouter.post('/pertemuan/:id/reschedule', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  const body = rescheduleSchema.parse(req.body);

  const tanggalBaru = new Date(body.tanggal);
  if (Number.isNaN(tanggalBaru.getTime())) throw BadRequest('Tanggal tidak valid');
  const durasi = body.durasiMenit ?? 100; // default ~ 1 sesi kuliah
  const akhir = new Date(tanggalBaru.getTime() + durasi * 60_000);

  if (tanggalBaru.getTime() === p.tanggal.getTime()) {
    throw BadRequest('Tanggal baru sama dengan tanggal saat ini');
  }

  // Validasi ruangan + bentrok ruangan (kalau diisi)
  if (body.ruanganId) {
    const r = await prisma.ruangan.findUnique({ where: { id: body.ruanganId } });
    if (!r) throw BadRequest('Ruangan tidak ditemukan');

    // Bentrok dengan pertemuan lain di ruangan yang sama (dalam window ±durasi)
    const bentrokPertemuan = await prisma.pertemuan.findFirst({
      where: {
        ruanganId: body.ruanganId,
        id: { not: p.id },
        tanggal: { gte: new Date(tanggalBaru.getTime() - durasi * 60_000), lte: akhir },
      },
      include: { kelas: { include: { mataKuliah: true } } },
    });
    if (bentrokPertemuan) {
      throw BadRequest(`Ruangan dipakai pertemuan ${bentrokPertemuan.kelas.mataKuliah.kode} ke-${bentrokPertemuan.pertemuanKe} pada slot yang tumpang tindih`);
    }
  }

  // Bentrok dengan pertemuan lain dosen ini (di kelas berbeda) — soft check via tanggal saja.
  const d = await getDosenForUser(req.user!.sub);
  const allKelas = await prisma.kelas.findMany({
    where: { OR: [{ dosenId: d.id }, { team: { some: { dosenId: d.id } } }] },
    select: { id: true },
  });
  const kelasIds = allKelas.map((k) => k.id);
  const bentrokDosen = await prisma.pertemuan.findFirst({
    where: {
      kelasId: { in: kelasIds.filter((id) => id !== p.kelasId) },
      tanggal: { gte: new Date(tanggalBaru.getTime() - durasi * 60_000), lte: akhir },
    },
    include: { kelas: { include: { mataKuliah: true } } },
  });
  if (bentrokDosen) {
    throw BadRequest(`Bentrok dengan pertemuan ${bentrokDosen.kelas.mataKuliah.kode} ke-${bentrokDosen.pertemuanKe} di slot yang sama`);
  }

  const tanggalLama = p.tanggal;
  // Snapshot tanggalAsli hanya saat reschedule pertama
  const tanggalAsli = p.tanggalAsli ?? tanggalLama;

  const updated = await prisma.pertemuan.update({
    where: { id: p.id },
    data: {
      tanggal: tanggalBaru,
      ...(body.ruanganId !== undefined && { ruanganId: body.ruanganId }),
      tanggalAsli,
      alasanReschedule: body.alasan,
      direschedulePada: new Date(),
    },
    include: { kelas: { include: { mataKuliah: true } } },
  });

  void writeAudit(req, {
    action: 'pertemuan.reschedule',
    entity: 'pertemuan',
    entityId: updated.id,
    metadata: {
      kelasId: p.kelasId,
      pertemuanKe: p.pertemuanKe,
      from: tanggalLama.toISOString(),
      to: tanggalBaru.toISOString(),
      alasan: body.alasan,
    },
  });

  // Broadcast notifikasi ke semua peserta KRS disetujui
  void (async () => {
    const peserta = await prisma.krs.findMany({
      where: { kelasId: p.kelasId, status: 'disetujui' },
      include: { mahasiswa: { select: { userId: true } } },
    });
    const userIds = peserta.map((k) => k.mahasiswa.userId).filter(Boolean);
    if (userIds.length === 0) return;
    const fmt = (d: Date) => d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    await createNotifikasiForMany(userIds, {
      title: `${updated.kelas.mataKuliah.kode} pertemuan ke-${updated.pertemuanKe} dipindah`,
      body: `Dari ${fmt(tanggalLama)} ke ${fmt(tanggalBaru)}. Alasan: ${body.alasan}`,
      type: 'jadwal',
      link: '/mahasiswa/absensi',
      entity: 'pertemuan',
      entityId: updated.id,
    });
  })();

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
  void notifyWaliPresensi(p.id, items);
  res.json({ ok: true, updated: items.length });
});

// ============================================================
// Self check-in via PIN / QR — dosen generate, mahasiswa input.
// PIN 6 digit numeric, default expiry 15 menit. Hanya valid 1
// pertemuan dalam satu waktu (di-clear / replace bila generate baru).
// ============================================================

const generatePinSchema = z.object({
  durasiMenit: z.number().int().min(1).max(180).optional(),
});

absensiRouter.post('/pertemuan/:id/generate-pin', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  const body = generatePinSchema.parse(req.body);
  const durasi = body.durasiMenit ?? 15;

  // Generate PIN 6 digit (random, leading zero ok)
  const pin = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durasi * 60_000);

  const updated = await prisma.pertemuan.update({
    where: { id: p.id },
    data: {
      pinKehadiran: pin,
      pinExpiresAt: expiresAt,
      pinDibuatPada: now,
    },
  });
  void writeAudit(req, {
    action: 'absensi.pin.generate',
    entity: 'pertemuan',
    entityId: p.id,
    metadata: { durasiMenit: durasi },
  });
  res.json({
    pin: updated.pinKehadiran,
    expiresAt: updated.pinExpiresAt,
    dibuatPada: updated.pinDibuatPada,
  });
});

absensiRouter.delete('/pertemuan/:id/pin', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  await prisma.pertemuan.update({
    where: { id: p.id },
    data: { pinKehadiran: null, pinExpiresAt: null, pinDibuatPada: null },
  });
  res.status(204).end();
});

/** Status PIN (untuk polling oleh UI dosen). */
absensiRouter.get('/pertemuan/:id/pin-status', async (req, res) => {
  const p = await getPertemuanOwned(req.user!.sub, req.params.id);
  // Hitung siapa saja yang sudah check-in via PIN
  const hadirViaPin = await prisma.absensi.count({
    where: { pertemuanId: p.id, status: 'hadir', inputViaPin: true },
  });
  const totalHadir = await prisma.absensi.count({
    where: { pertemuanId: p.id, status: 'hadir' },
  });
  res.json({
    pin: p.pinKehadiran,
    expiresAt: p.pinExpiresAt,
    dibuatPada: p.pinDibuatPada,
    isActive: !!(p.pinKehadiran && p.pinExpiresAt && p.pinExpiresAt > new Date()),
    hadirViaPin,
    totalHadir,
  });
});
