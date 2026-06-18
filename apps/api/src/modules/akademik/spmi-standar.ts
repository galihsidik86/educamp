import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { evalStatus, measureStandar } from '../../lib/spmi.js';

export const spmiStandarRouter = Router();

const KATEGORI = [
  'pendidikan', 'penelitian', 'pengabdian', 'pengelolaan',
  'sarpras', 'pembiayaan', 'spmi_tambahan', 'non_akademik',
  'standar_internasional',
] as const;

const SUMBER = [
  'manual', 'ipk_lulusan', 'masa_studi', 'tingkat_kelulusan', 'edom_dosen',
  'kehadiran_dosen', 'kehadiran_mahasiswa', 'rasio_dosen_mhs', 'bkd_compliance', 'capaian_cpl',
] as const;

const standarSchema = z.object({
  kode: z.string().min(3).max(40),
  nama: z.string().min(5).max(200),
  kategori: z.enum(KATEGORI),
  deskripsi: z.string().min(5).max(5000),
  rumusan: z.string().max(5000).optional().nullable(),
  satuan: z.string().max(30).optional().nullable(),
  targetMin: z.number().optional().nullable(),
  targetMax: z.number().optional().nullable(),
  ambangCukup: z.number().optional().nullable(),
  sumberData: z.enum(SUMBER).default('manual'),
  prodiId: z.string().uuid().optional().nullable(),
  isAktif: z.boolean().optional(),
});

spmiStandarRouter.get('/spmi/standar', async (req, res) => {
  const kategori = req.query.kategori as string | undefined;
  const prodiId = req.query.prodiId as string | undefined;
  const aktif = req.query.aktif as string | undefined;
  const items = await prisma.standarMutu.findMany({
    where: {
      ...(kategori && { kategori: kategori as any }),
      ...(prodiId === 'null' ? { prodiId: null } : prodiId ? { prodiId } : {}),
      ...(aktif === 'true' ? { isAktif: true } : aktif === 'false' ? { isAktif: false } : {}),
    },
    include: {
      prodi: { select: { kode: true, nama: true } },
      pengukuran: { orderBy: { periode: 'desc' }, take: 1 },
      _count: { select: { pengukuran: true } },
    },
    orderBy: [{ kategori: 'asc' }, { kode: 'asc' }],
  });
  res.json({ items });
});

spmiStandarRouter.post('/spmi/standar', async (req, res) => {
  const body = standarSchema.parse(req.body);
  if (body.prodiId) {
    const p = await prisma.prodi.findUnique({ where: { id: body.prodiId } });
    if (!p) throw BadRequest('Prodi tidak ditemukan');
  }
  try {
    const created = await prisma.standarMutu.create({
      data: {
        kode: body.kode,
        nama: body.nama,
        kategori: body.kategori,
        deskripsi: body.deskripsi,
        rumusan: body.rumusan ?? null,
        satuan: body.satuan ?? null,
        targetMin: body.targetMin ?? null,
        targetMax: body.targetMax ?? null,
        ambangCukup: body.ambangCukup ?? null,
        sumberData: body.sumberData,
        prodiId: body.prodiId ?? null,
        isAktif: body.isAktif ?? true,
      },
    });
    void writeAudit(req, { action: 'spmi.standar.create', entity: 'standar-mutu', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode standar sudah dipakai');
    throw e;
  }
});

spmiStandarRouter.patch('/spmi/standar/:id', async (req, res) => {
  const exists = await prisma.standarMutu.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Standar tidak ditemukan');
  const body = standarSchema.partial().parse(req.body);
  try {
    const updated = await prisma.standarMutu.update({ where: { id: exists.id }, data: body as any });
    void writeAudit(req, { action: 'spmi.standar.update', entity: 'standar-mutu', entityId: exists.id, metadata: { fields: Object.keys(body) } });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode standar sudah dipakai');
    throw e;
  }
});

spmiStandarRouter.delete('/spmi/standar/:id', async (req, res) => {
  const exists = await prisma.standarMutu.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Standar tidak ditemukan');
  const refTemuan = await prisma.temuanAmi.count({ where: { standarId: exists.id } });
  if (refTemuan > 0) throw Conflict(`Standar masih direferensi ${refTemuan} temuan AMI`);
  await prisma.standarMutu.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'spmi.standar.delete', entity: 'standar-mutu', entityId: exists.id });
  res.status(204).end();
});

const measureSchema = z.object({
  periode: z.string().min(2).max(30),
});

/** Trigger auto-measure dari sumber data internal. */
spmiStandarRouter.post('/spmi/standar/:id/ukur', async (req, res) => {
  const body = measureSchema.parse(req.body);
  const std = await prisma.standarMutu.findUnique({ where: { id: req.params.id } });
  if (!std) throw NotFound('Standar tidak ditemukan');

  const result = await measureStandar(std, body.periode);
  const status = evalStatus(result.nilai, std.targetMin, std.targetMax, std.ambangCukup);

  const sumberDataJson = result.sumberData ? (result.sumberData as any) : undefined;
  const saved = await prisma.pengukuranStandar.upsert({
    where: { standarId_periode: { standarId: std.id, periode: body.periode } },
    create: {
      standarId: std.id,
      periode: body.periode,
      nilai: result.nilai ?? 0,
      status,
      catatan: result.catatan ?? null,
      sumberData: sumberDataJson,
    },
    update: {
      nilai: result.nilai ?? 0,
      status,
      catatan: result.catatan ?? null,
      sumberData: sumberDataJson,
    },
  });

  void writeAudit(req, {
    action: 'spmi.standar.ukur',
    entity: 'standar-mutu',
    entityId: std.id,
    metadata: { periode: body.periode, status, nilai: result.nilai },
  });
  res.json({ pengukuran: saved, autoMeasured: result.nilai != null });
});

const manualSchema = z.object({
  periode: z.string().min(2).max(30),
  nilai: z.number(),
  catatan: z.string().max(2000).optional().nullable(),
});

/** Input pengukuran manual (utk sumberData='manual'). */
spmiStandarRouter.post('/spmi/standar/:id/pengukuran', async (req, res) => {
  const body = manualSchema.parse(req.body);
  const std = await prisma.standarMutu.findUnique({ where: { id: req.params.id } });
  if (!std) throw NotFound('Standar tidak ditemukan');

  const status = evalStatus(body.nilai, std.targetMin, std.targetMax, std.ambangCukup);
  const saved = await prisma.pengukuranStandar.upsert({
    where: { standarId_periode: { standarId: std.id, periode: body.periode } },
    create: {
      standarId: std.id,
      periode: body.periode,
      nilai: body.nilai,
      status,
      catatan: body.catatan ?? null,
    },
    update: {
      nilai: body.nilai,
      status,
      catatan: body.catatan ?? null,
    },
  });
  void writeAudit(req, {
    action: 'spmi.standar.pengukuran.manual',
    entity: 'standar-mutu',
    entityId: std.id,
    metadata: { periode: body.periode, nilai: body.nilai, status },
  });
  res.status(201).json(saved);
});

/** Hapus pengukuran (periode tertentu) — utk koreksi data salah input. Audit trail tetap di AuditLog. */
spmiStandarRouter.delete('/spmi/standar/:id/pengukuran/:periode', async (req, res) => {
  const std = await prisma.standarMutu.findUnique({ where: { id: req.params.id } });
  if (!std) throw NotFound('Standar tidak ditemukan');
  const existing = await prisma.pengukuranStandar.findUnique({
    where: { standarId_periode: { standarId: std.id, periode: req.params.periode } },
  });
  if (!existing) throw NotFound('Pengukuran tidak ditemukan');
  await prisma.pengukuranStandar.delete({ where: { id: existing.id } });
  void writeAudit(req, {
    action: 'spmi.standar.pengukuran.delete',
    entity: 'standar-mutu',
    entityId: std.id,
    metadata: { periode: req.params.periode, nilai: existing.nilai, status: existing.status },
  });
  res.status(204).end();
});

/** Detail standar + riwayat pengukuran. */
spmiStandarRouter.get('/spmi/standar/:id', async (req, res) => {
  const std = await prisma.standarMutu.findUnique({
    where: { id: req.params.id },
    include: {
      prodi: { select: { kode: true, nama: true } },
      pengukuran: { orderBy: { periode: 'desc' } },
    },
  });
  if (!std) throw NotFound('Standar tidak ditemukan');
  res.json(std);
});
