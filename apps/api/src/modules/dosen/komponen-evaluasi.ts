// ============================================================
// Komponen Evaluasi Kelas — IKU 7 / Neo Feeder 2.3+.
// Dosen pengampu setup per-kelas: nama komponen, jenis,
// bobot %, flag case_method/team_based_project.
// Nilai per komponen di-input per mahasiswa (krs).
// ============================================================
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound, Forbidden } from '../../lib/errors.js';
import { getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { writeAudit } from '../../lib/audit.js';
import { enqueueFeederChange, buildFeederPayload } from '../../lib/feeder/queue.js';

export const komponenEvaluasiRouter = Router();

// GET /kelas/:kelasId/komponen-evaluasi
komponenEvaluasiRouter.get('/kelas/:kelasId/komponen-evaluasi', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const items = await prisma.komponenEvaluasiKelas.findMany({
    where: { kelasId: req.params.kelasId },
    orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ items });
});

const upsertSchema = z.object({
  nama: z.string().min(1).max(120),
  jenis: z.enum([
    'tugas', 'uts', 'uas', 'quiz', 'praktikum', 'kehadiran',
    'proyek', 'presentasi', 'laporan', 'case_method', 'team_based_project', 'lainnya',
  ]),
  bobotPersen: z.number().min(0).max(100),
  deskripsi: z.string().max(1000).optional().nullable(),
  metodeCaseMethod: z.boolean().optional(),
  metodeTeamBased: z.boolean().optional(),
  urutan: z.number().int().min(0).optional(),
});

// POST /kelas/:kelasId/komponen-evaluasi
komponenEvaluasiRouter.post('/kelas/:kelasId/komponen-evaluasi', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const body = upsertSchema.parse(req.body);
  const created = await prisma.komponenEvaluasiKelas.create({
    data: {
      kelasId: req.params.kelasId,
      nama: body.nama,
      jenis: body.jenis,
      bobotPersen: body.bobotPersen,
      deskripsi: body.deskripsi ?? null,
      metodeCaseMethod: body.metodeCaseMethod ?? false,
      metodeTeamBased: body.metodeTeamBased ?? false,
      urutan: body.urutan ?? 0,
    },
  });
  void enqueueKomponenPayload(created.id, 'create');
  void writeAudit(req, { action: 'komponen_evaluasi.create', entity: 'komponen_evaluasi' as any, entityId: created.id });
  res.status(201).json(created);
});

komponenEvaluasiRouter.patch('/komponen-evaluasi/:id', async (req, res) => {
  const body = upsertSchema.partial().parse(req.body);
  const d = await getDosenForUser(req.user!.sub);
  const ke = await prisma.komponenEvaluasiKelas.findUnique({
    where: { id: req.params.id },
    include: { kelas: { select: { id: true } } },
  });
  if (!ke) throw NotFound();
  await requireKelasOwnership(d.id, ke.kelas.id);

  const updated = await prisma.komponenEvaluasiKelas.update({
    where: { id: req.params.id },
    data: {
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.jenis !== undefined && { jenis: body.jenis }),
      ...(body.bobotPersen !== undefined && { bobotPersen: body.bobotPersen }),
      ...(body.deskripsi !== undefined && { deskripsi: body.deskripsi }),
      ...(body.metodeCaseMethod !== undefined && { metodeCaseMethod: body.metodeCaseMethod }),
      ...(body.metodeTeamBased !== undefined && { metodeTeamBased: body.metodeTeamBased }),
      ...(body.urutan !== undefined && { urutan: body.urutan }),
    },
  });
  void enqueueKomponenPayload(updated.id, 'update');
  void writeAudit(req, { action: 'komponen_evaluasi.update', entity: 'komponen_evaluasi' as any, entityId: updated.id });
  res.json(updated);
});

komponenEvaluasiRouter.delete('/komponen-evaluasi/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const ke = await prisma.komponenEvaluasiKelas.findUnique({
    where: { id: req.params.id },
    include: { kelas: { select: { id: true } } },
  });
  if (!ke) throw NotFound();
  await requireKelasOwnership(d.id, ke.kelas.id);

  if (ke.feederId) {
    void enqueueKomponenPayload(ke.id, 'delete');
  }
  await prisma.komponenEvaluasiKelas.delete({ where: { id: req.params.id } });
  void writeAudit(req, { action: 'komponen_evaluasi.delete', entity: 'komponen_evaluasi' as any, entityId: req.params.id });
  res.json({ ok: true });
});

// ============================================================
// NILAI per komponen — matrix per mahasiswa (krs) × komponen
// GET /kelas/:kelasId/nilai-komponen — return matrix lengkap
// PUT /kelas/:kelasId/nilai-komponen — bulk upsert
// ============================================================

komponenEvaluasiRouter.get('/kelas/:kelasId/nilai-komponen', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);

  const [komponen, krsList] = await Promise.all([
    prisma.komponenEvaluasiKelas.findMany({
      where: { kelasId: req.params.kelasId },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.krs.findMany({
      where: { kelasId: req.params.kelasId, status: { in: ['disetujui'] } as any },
      include: {
        mahasiswa: { select: { id: true, nim: true, nama: true } },
        nilaiKomponen: true,
      },
      orderBy: { mahasiswa: { nim: 'asc' } },
    }),
  ]);

  const rows = krsList.map((k) => ({
    krsId: k.id,
    mahasiswa: k.mahasiswa,
    nilai: Object.fromEntries(
      k.nilaiKomponen.map((n) => [n.komponenEvaluasiId, n.nilai]),
    ),
  }));

  res.json({ komponen, rows });
});

const bulkNilaiSchema = z.object({
  items: z.array(z.object({
    krsId: z.string().uuid(),
    komponenEvaluasiId: z.string().uuid(),
    nilai: z.number().min(0).max(100).nullable(),
  })).max(2000),
});

komponenEvaluasiRouter.put('/kelas/:kelasId/nilai-komponen', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const body = bulkNilaiSchema.parse(req.body);

  // Validasi: semua krsId & komponenId memang milik kelas ini
  const komponenIds = await prisma.komponenEvaluasiKelas.findMany({
    where: { kelasId: req.params.kelasId },
    select: { id: true },
  });
  const validKomponen = new Set(komponenIds.map((k) => k.id));
  const krsIds = await prisma.krs.findMany({
    where: { kelasId: req.params.kelasId },
    select: { id: true },
  });
  const validKrs = new Set(krsIds.map((k) => k.id));

  for (const item of body.items) {
    if (!validKomponen.has(item.komponenEvaluasiId)) throw BadRequest(`Komponen ${item.komponenEvaluasiId} bukan milik kelas ini`);
    if (!validKrs.has(item.krsId)) throw BadRequest(`KRS ${item.krsId} bukan milik kelas ini`);
  }

  // Upsert by (komponenId, krsId)
  for (const item of body.items) {
    const existing = await prisma.nilaiKomponenEvaluasi.findUnique({
      where: { komponenEvaluasiId_krsId: { komponenEvaluasiId: item.komponenEvaluasiId, krsId: item.krsId } },
    });
    if (existing) {
      const updated = await prisma.nilaiKomponenEvaluasi.update({
        where: { id: existing.id },
        data: { nilai: item.nilai },
      });
      void enqueueNilaiKomponenPayload(updated.id, 'update');
    } else {
      const created = await prisma.nilaiKomponenEvaluasi.create({
        data: {
          komponenEvaluasiId: item.komponenEvaluasiId,
          krsId: item.krsId,
          nilai: item.nilai,
        },
      });
      void enqueueNilaiKomponenPayload(created.id, 'create');
    }
  }

  void writeAudit(req, {
    action: 'nilai_komponen.bulk_upsert',
    entity: 'nilai_komponen' as any,
    metadata: { kelasId: req.params.kelasId, count: body.items.length },
  });

  res.json({ ok: true, processed: body.items.length });
});

async function enqueueKomponenPayload(id: string, op: 'create' | 'update' | 'delete') {
  const payload = await buildFeederPayload('komponen_evaluasi' as any, id);
  if (!payload) return;
  await enqueueFeederChange({ entity: 'komponen_evaluasi' as any, entityId: id, operation: op, payload });
}

async function enqueueNilaiKomponenPayload(id: string, op: 'create' | 'update' | 'delete') {
  const payload = await buildFeederPayload('nilai_komponen' as any, id);
  if (!payload) return;
  await enqueueFeederChange({ entity: 'nilai_komponen' as any, entityId: id, operation: op, payload });
}
