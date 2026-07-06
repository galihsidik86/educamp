import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { httpUrl, intParam } from '../../lib/validators.js';
import { getFeederClient } from '../../lib/feeder/client.js';
import { processFeederQueue, buildFeederPayload, enqueueFeederChange } from '../../lib/feeder/queue.js';
import type { FeederEntity } from '@prisma/client';

export const feederRouter = Router();

const SINGLETON = 'singleton';

const configSchema = z.object({
  // httpUrl: batasi ke http/https (bukan z.string().url() yg terima skema apa
  // pun). Catatan: ini TIDAK memblok SSRF ke IP internal — lihat EVALUASI.md.
  baseUrl: httpUrl.optional().nullable(),
  username: z.string().max(120).optional().nullable(),
  password: z.string().max(200).optional().nullable(),
  semesterAktif: z.string().max(20).optional().nullable(),
  dryRun: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
});

/** GET config (tanpa password). */
feederRouter.get('/feeder/config', async (_req, res) => {
  const c = await prisma.feederConfig.findUnique({ where: { id: SINGLETON } });
  if (!c) {
    return res.json({
      id: SINGLETON, baseUrl: null, username: null,
      hasPassword: false, semesterAktif: null,
      dryRun: true, isEnabled: false,
      lastTestAt: null, lastTestStatus: null, lastTestMessage: null,
    });
  }
  const { passwordEnc, ...safe } = c;
  res.json({ ...safe, hasPassword: !!passwordEnc });
});

/** PATCH config (upsert singleton). Password kosong = jangan ubah. */
feederRouter.patch('/feeder/config', async (req, res) => {
  const body = configSchema.parse(req.body);
  const data: any = {
    baseUrl: body.baseUrl ?? null,
    username: body.username ?? null,
    semesterAktif: body.semesterAktif ?? null,
    dryRun: body.dryRun ?? true,
    isEnabled: body.isEnabled ?? false,
  };
  if (body.password !== undefined && body.password !== null && body.password !== '') {
    data.passwordEnc = body.password;
  }
  const updated = await prisma.feederConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...data },
    update: data,
  });
  void writeAudit(req, { action: 'feeder.config.update', entity: 'feeder', entityId: SINGLETON, metadata: { isEnabled: updated.isEnabled, dryRun: updated.dryRun } });
  const { passwordEnc, ...safe } = updated;
  res.json({ ...safe, hasPassword: !!passwordEnc });
});

/** Test koneksi ke Feeder (pakai stub atau real client). */
feederRouter.post('/feeder/test-connection', async (req, res) => {
  const c = await prisma.feederConfig.findUnique({ where: { id: SINGLETON } });
  if (!c || !c.baseUrl || !c.username) {
    throw BadRequest('Konfigurasi belum lengkap (baseUrl & username wajib)');
  }
  const client = getFeederClient({ baseUrl: c.baseUrl, username: c.username, password: c.passwordEnc ?? '' });
  const r = await client.testConnection();
  await prisma.feederConfig.update({
    where: { id: SINGLETON },
    data: {
      lastTestAt: new Date(),
      lastTestStatus: r.ok ? 'success' : 'failed',
      lastTestMessage: r.message ?? null,
    },
  });
  void writeAudit(req, { action: 'feeder.test', entity: 'feeder', entityId: SINGLETON, metadata: { ok: r.ok } });
  res.json(r);
});

/** Statistik queue: counter per status. */
feederRouter.get('/feeder/queue/stats', async (_req, res) => {
  const rows = await prisma.feederQueue.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const stats: Record<string, number> = { pending: 0, processing: 0, success: 0, failed: 0, skipped: 0 };
  for (const r of rows) stats[r.status] = r._count._all;
  res.json(stats);
});

/** List queue dengan filter status. */
feederRouter.get('/feeder/queue', async (req, res) => {
  const status = req.query.status as string | undefined;
  const items = await prisma.feederQueue.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ items });
});

/** Trigger manual worker batch. */
feederRouter.post('/feeder/queue/process', async (req, res) => {
  const result = await processFeederQueue({ take: intParam(req.body?.take, 50, { min: 1, max: 500 }) });
  void writeAudit(req, { action: 'feeder.queue.process', entity: 'feeder', metadata: result });
  res.json(result);
});

/** Retry item yang gagal. */
feederRouter.post('/feeder/queue/:id/retry', async (req, res) => {
  const q = await prisma.feederQueue.findUnique({ where: { id: req.params.id } });
  if (!q) throw NotFound('Item tidak ditemukan');
  if (q.status !== 'failed') throw BadRequest('Hanya item failed yang dapat di-retry manual');
  const updated = await prisma.feederQueue.update({
    where: { id: q.id },
    data: { status: 'pending', nextRetryAt: null, attempts: 0, lastError: null, processedAt: null },
  });
  res.json(updated);
});

/** Hapus item (mis. sudah tidak relevan). */
feederRouter.delete('/feeder/queue/:id', async (req, res) => {
  const q = await prisma.feederQueue.findUnique({ where: { id: req.params.id } });
  if (!q) throw NotFound('Item tidak ditemukan');
  await prisma.feederQueue.delete({ where: { id: q.id } });
  res.status(204).end();
});

/** Sync log terakhir. */
feederRouter.get('/feeder/log', async (req, res) => {
  const take = intParam(req.query.take, 100, { min: 1, max: 500 });
  const items = await prisma.feederSyncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json({ items });
});

/** Enqueue manual: kirim 1 entity sekarang. */
const enqueueSchema = z.object({
  entity: z.enum(['mahasiswa', 'dosen', 'mata_kuliah', 'kelas', 'krs', 'nilai']),
  entityId: z.string().uuid(),
});
feederRouter.post('/feeder/enqueue', async (req, res) => {
  const body = enqueueSchema.parse(req.body);
  const payload = await buildFeederPayload(body.entity as FeederEntity, body.entityId);
  if (!payload) throw BadRequest('Entity tidak ditemukan atau belum didukung');
  // Operation otomatis: ada feederId → update, else create
  const hasFeederId = (payload as any).id_mahasiswa
    ?? (payload as any).id_aktivitas_kuliah_mahasiswa
    ?? (payload as any).id_nilai;
  await enqueueFeederChange({
    entity: body.entity as FeederEntity,
    entityId: body.entityId,
    operation: hasFeederId ? 'update' : 'create',
    payload,
  });
  res.status(201).json({ ok: true });
});
