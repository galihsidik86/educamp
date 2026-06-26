// ============================================================
// Feeder outbox helpers — enqueue & process.
// Pattern: modul lain (krs, nilai, mahasiswa) panggil enqueue()
// saat ada perubahan. Worker batch baca pending → push ke Feeder
// → update status entity (set feederId).
// ============================================================

import { prisma } from '../../db.js';
import {
  mapKrsToFeeder, mapMahasiswaToFeeder, mapNilaiToFeeder,
  mapDosenToFeeder, mapMataKuliahToFeeder, mapKelasToFeeder, mapYudisiumToFeeder,
  // Phase 2 mappers
  mapAkmToFeeder, mapKomponenEvaluasiToFeeder, mapNilaiKomponenToFeeder,
  mapAktivitasToFeeder, mapDayaTampungToFeeder, mapMahasiswaInboundToFeeder,
  mapNilaiTransferToFeeder,
} from './mapping.js';
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
        include: {
          prodi: { select: { kode: true, jenjang: true } },
          orangTua: { select: { jenis: true, nama: true, nik: true, tahunLahir: true, pendidikan: true, pekerjaan: true, penghasilan: true } },
        },
      });
      if (!m) return null;
      return mapMahasiswaToFeeder({
        ...m,
        prodi: { kode: m.prodi.kode, jenjang: m.prodi.jenjang },
        orangTua: m.orangTua.map((o) => ({ ...o, penghasilan: o.penghasilan })),
      });
    }
    case 'dosen': {
      const d = await prisma.dosen.findUnique({
        where: { id: entityId },
        include: { prodi: { select: { kode: true } } },
      });
      return d ? mapDosenToFeeder(d) : null;
    }
    case 'mata_kuliah': {
      const mk = await prisma.mataKuliah.findUnique({
        where: { id: entityId },
        include: { prodi: { select: { kode: true } } },
      });
      return mk ? mapMataKuliahToFeeder(mk) : null;
    }
    case 'kelas': {
      const k = await prisma.kelas.findUnique({
        where: { id: entityId },
        include: {
          mataKuliah: { select: { feederId: true, kode: true } },
          dosen: { select: { feederId: true, nidn: true } },
          semester: { select: { kode: true } },
          ruangan: { select: { kode: true } },
          _count: { select: { krs: true } },
        },
      });
      return k ? mapKelasToFeeder(k) : null;
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
    case 'yudisium': {
      const y = await prisma.yudisium.findUnique({
        where: { id: entityId },
        include: { mahasiswa: { select: { feederId: true, nim: true } } },
      });
      return y ? mapYudisiumToFeeder(y) : null;
    }
    case 'akm': {
      const a = await prisma.aktivitasKuliahMahasiswa.findUnique({
        where: { id: entityId },
        include: {
          mahasiswa: { select: { feederId: true, nim: true } },
          semester: { select: { kode: true } },
        },
      });
      return a ? mapAkmToFeeder(a) : null;
    }
    case 'komponen_evaluasi': {
      const k = await prisma.komponenEvaluasiKelas.findUnique({
        where: { id: entityId },
        include: { kelas: { select: { feederId: true } } },
      });
      return k ? mapKomponenEvaluasiToFeeder(k) : null;
    }
    case 'nilai_komponen': {
      const n = await prisma.nilaiKomponenEvaluasi.findUnique({
        where: { id: entityId },
        include: {
          komponenEvaluasi: { select: { feederId: true } },
          krs: { select: { feederId: true } },
        },
      });
      return n ? mapNilaiKomponenToFeeder(n) : null;
    }
    case 'aktivitas': {
      const a = await prisma.aktivitasMahasiswa.findUnique({
        where: { id: entityId },
        include: {
          semester: { select: { kode: true } },
          peserta: {
            include: { mahasiswa: { select: { feederId: true, nim: true } } },
          },
          pembimbing: {
            include: { dosen: { select: { feederId: true, nidn: true } } },
          },
        },
      });
      return a ? mapAktivitasToFeeder(a) : null;
    }
    case 'daya_tampung': {
      const d = await prisma.dayaTampungProdi.findUnique({
        where: { id: entityId },
        include: {
          prodi: { select: { kode: true } },
          semester: { select: { kode: true } },
        },
      });
      return d ? mapDayaTampungToFeeder(d) : null;
    }
    case 'mahasiswa_inbound': {
      const m = await prisma.mahasiswaInbound.findUnique({
        where: { id: entityId },
        include: {
          prodiTujuan: { select: { kode: true } },
          semester: { select: { kode: true } },
        },
      });
      return m ? mapMahasiswaInboundToFeeder(m) : null;
    }
    case 'nilai_transfer': {
      const n = await prisma.nilaiTransfer.findUnique({
        where: { id: entityId },
        include: {
          mahasiswa: { select: { feederId: true, nim: true } },
          mataKuliah: { select: { feederId: true, kode: true } },
        },
      });
      return n ? mapNilaiTransferToFeeder(n) : null;
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
    case 'mahasiswa':         return prisma.mahasiswa.update({ where: { id: entityId }, data });
    case 'dosen':             return prisma.dosen.update({ where: { id: entityId }, data });
    case 'mata_kuliah':       return prisma.mataKuliah.update({ where: { id: entityId }, data });
    case 'kelas':             return prisma.kelas.update({ where: { id: entityId }, data });
    case 'krs':               return prisma.krs.update({ where: { id: entityId }, data });
    case 'nilai':             return prisma.nilai.update({ where: { id: entityId }, data });
    case 'yudisium':          return prisma.yudisium.update({ where: { id: entityId }, data });
    // Phase 2 entities
    case 'akm':               return prisma.aktivitasKuliahMahasiswa.update({ where: { id: entityId }, data });
    case 'komponen_evaluasi': return prisma.komponenEvaluasiKelas.update({ where: { id: entityId }, data });
    case 'nilai_komponen':    return prisma.nilaiKomponenEvaluasi.update({ where: { id: entityId }, data });
    case 'aktivitas':         return prisma.aktivitasMahasiswa.update({ where: { id: entityId }, data });
    case 'daya_tampung':      return prisma.dayaTampungProdi.update({ where: { id: entityId }, data });
    case 'mahasiswa_inbound': return prisma.mahasiswaInbound.update({ where: { id: entityId }, data });
    case 'nilai_transfer':    return prisma.nilaiTransfer.update({ where: { id: entityId }, data });
    default:                  return prisma.feederQueue.findFirst(); // noop
  }
}
