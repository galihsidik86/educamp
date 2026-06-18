// ============================================================
// Feeder outbox helpers — enqueue & process.
// Pattern: modul lain (krs, nilai, mahasiswa) panggil enqueue()
// saat ada perubahan. Worker batch baca pending → push ke Feeder
// → update status entity (set feederId).
// ============================================================

import { prisma } from '../../db.js';
import { mapKrsToFeeder, mapMahasiswaToFeeder, mapNilaiToFeeder } from './mapping.js';
import { getFeederClient } from './client.js';
import type { FeederEntity, FeederOperation } from '@prisma/client';

/**
 * Enqueue 1 perubahan ke outbox. Fire-and-forget — gagal di-log saja.
 * Dipanggil dari handler (krs.approve, nilai.finalize, dll).
 */
export async function enqueueFeederChange(input: {
  entity: FeederEntity;
  entityId: string;
  operation: FeederOperation;
  payload: unknown;
}) {
  try {
    await prisma.feederQueue.create({
      data: {
        entity: input.entity,
        entityId: input.entityId,
        operation: input.operation,
        payload: input.payload as any,
      },
    });
  } catch (e) {
    console.error('[feeder] enqueue gagal:', e);
  }
}

/**
 * Bangun payload Feeder berdasarkan entity. Dipakai saat enqueue
 * dan saat re-build payload (kalau ingin selalu refresh data).
 */
export async function buildFeederPayload(entity: FeederEntity, entityId: string) {
  switch (entity) {
    case 'mahasiswa': {
      const m = await prisma.mahasiswa.findUnique({
        where: { id: entityId },
        include: { prodi: { select: { kode: true, jenjang: true } } },
      });
      return m ? mapMahasiswaToFeeder({ ...m, prodi: { kode: m.prodi.kode, jenjang: m.prodi.jenjang } }) : null;
    }
    case 'krs': {
      const k = await prisma.krs.findUnique({
        where: { id: entityId },
        include: {
          mahasiswa: { select: { feederId: true, nim: true } },
          kelas: { select: { feederId: true, kodeKelas: true } },
          semester: { select: { kode: true } },
        },
      });
      return k ? mapKrsToFeeder(k) : null;
    }
    case 'nilai': {
      const n = await prisma.nilai.findUnique({
        where: { id: entityId },
        include: { krs: { select: { feederId: true } } },
      });
      return n ? mapNilaiToFeeder(n) : null;
    }
    default:
      return null;
  }
}

/**
 * Worker batch: ambil queue pending (yang sudah waktunya retry),
 * push ke Feeder, update status & log. Aman dipanggil berulang.
 */
export async function processFeederQueue(opts: { take?: number } = {}): Promise<{
  processed: number; success: number; failed: number; skipped: number;
}> {
  const cfg = await prisma.feederConfig.findUnique({ where: { id: 'singleton' } });
  if (!cfg || !cfg.isEnabled) {
    return { processed: 0, success: 0, failed: 0, skipped: 0 };
  }

  // Bila dry-run: tandai semua pending sebagai skipped + sync log, jangan call client
  const take = opts.take ?? 50;
  const now = new Date();
  const items = await prisma.feederQueue.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take,
  });

  let success = 0, failed = 0, skipped = 0;

  // Bila tidak ada config baseUrl/username, anggap dry-run
  const dryRun = cfg.dryRun || !cfg.baseUrl || !cfg.username;
  const client = dryRun ? null : getFeederClient({
    baseUrl: cfg.baseUrl!,
    username: cfg.username!,
    password: cfg.passwordEnc ?? '',
  });

  for (const q of items) {
    const started = Date.now();
    await prisma.feederQueue.update({ where: { id: q.id }, data: { status: 'processing' } });

    if (dryRun) {
      // Tandai skipped — payload sudah dianggap "tersinkron" untuk simulasi
      await prisma.$transaction([
        prisma.feederQueue.update({
          where: { id: q.id },
          data: { status: 'skipped', processedAt: new Date(), lastError: null },
        }),
        prisma.feederSyncLog.create({
          data: {
            entity: q.entity, entityId: q.entityId, operation: q.operation,
            status: 'skipped', message: 'Dry-run mode — tidak dikirim ke Feeder',
            durationMs: Date.now() - started,
          },
        }),
      ]);
      skipped++;
      continue;
    }

    try {
      const result = await client!.push(q.entity, q.operation, q.payload);
      if (result.ok) {
        await prisma.$transaction([
          prisma.feederQueue.update({
            where: { id: q.id },
            data: { status: 'success', processedAt: new Date(), lastError: null },
          }),
          prisma.feederSyncLog.create({
            data: {
              entity: q.entity, entityId: q.entityId, operation: q.operation,
              status: 'success', feederId: result.feederId ?? null,
              message: result.message, durationMs: Date.now() - started,
            },
          }),
          // Update entity lokal dengan feederId hasil create
          ...(result.feederId && q.operation === 'create'
            ? [updateEntityFeederId(q.entity, q.entityId, result.feederId)]
            : []),
        ]);
        success++;
      } else {
        throw new Error(result.message ?? 'Push gagal tanpa pesan');
      }
    } catch (err: any) {
      const attempts = q.attempts + 1;
      const isLast = attempts >= q.maxAttempts;
      // Exponential backoff: 1m, 5m, 30m, 2h, 12h
      const backoffMin = [1, 5, 30, 120, 720][Math.min(attempts - 1, 4)]!;
      const nextRetryAt = new Date(Date.now() + backoffMin * 60_000);
      await prisma.$transaction([
        prisma.feederQueue.update({
          where: { id: q.id },
          data: {
            status: isLast ? 'failed' : 'pending',
            attempts,
            lastError: String(err?.message ?? err).slice(0, 1000),
            nextRetryAt: isLast ? null : nextRetryAt,
            processedAt: isLast ? new Date() : null,
          },
        }),
        prisma.feederSyncLog.create({
          data: {
            entity: q.entity, entityId: q.entityId, operation: q.operation,
            status: 'failed', message: String(err?.message ?? err).slice(0, 1000),
            durationMs: Date.now() - started,
          },
        }),
      ]);
      failed++;
    }
  }

  return { processed: items.length, success, failed, skipped };
}

/** Helper: update kolom feederId+lastSyncedAt pada entity sesuai jenisnya. */
function updateEntityFeederId(entity: FeederEntity, entityId: string, feederId: string) {
  const data = { feederId, lastSyncedAt: new Date() };
  switch (entity) {
    case 'mahasiswa':  return prisma.mahasiswa.update({ where: { id: entityId }, data });
    case 'dosen':      return prisma.dosen.update({ where: { id: entityId }, data });
    case 'mata_kuliah':return prisma.mataKuliah.update({ where: { id: entityId }, data });
    case 'kelas':      return prisma.kelas.update({ where: { id: entityId }, data });
    case 'krs':        return prisma.krs.update({ where: { id: entityId }, data });
    case 'nilai':      return prisma.nilai.update({ where: { id: entityId }, data });
    default:           return prisma.feederQueue.findFirst(); // noop
  }
}
