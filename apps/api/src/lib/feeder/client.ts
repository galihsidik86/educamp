// ============================================================
// Neo Feeder client adapter.
//
// Real implementation memanggil REST API Feeder kampus.
// Untuk development, default ke STUB yang:
//   - return success dengan id_feeder palsu untuk operasi push
//   - return error ditentukan via env FEEDER_STUB_FAIL=true
//
// Di production, set env FEEDER_USE_REAL=true dan implementasikan
// real HTTP call sesuai dokumentasi Neo Feeder kampus.
// ============================================================

import crypto from 'node:crypto';
import type { FeederEntity, FeederOperation } from '@prisma/client';

export type FeederConfigInput = {
  baseUrl: string;
  username: string;
  password: string;
};

export type PushResult = {
  ok: boolean;
  feederId?: string;
  message?: string;
};

export interface FeederClient {
  testConnection(): Promise<PushResult>;
  push(entity: FeederEntity, operation: FeederOperation, payload: unknown): Promise<PushResult>;
}

/**
 * Stub client: tidak melakukan HTTP call sungguhan. Cocok untuk dev/test.
 * - create: return feederId palsu (UUID)
 * - update/delete: return ok
 * - simulasi failure: env FEEDER_STUB_FAIL=true → error
 */
export class StubFeederClient implements FeederClient {
  constructor(private cfg: FeederConfigInput, private opts: { simulateFailure?: boolean } = {}) {}

  async testConnection(): Promise<PushResult> {
    if (this.shouldFail()) return { ok: false, message: 'Stub: gagal koneksi (simulasi)' };
    return { ok: true, message: `Stub OK · target ${this.cfg.baseUrl}` };
  }

  async push(_entity: FeederEntity, operation: FeederOperation, _payload: unknown): Promise<PushResult> {
    if (this.shouldFail()) {
      return { ok: false, message: 'Stub: push gagal (simulasi)' };
    }
    return {
      ok: true,
      feederId: operation === 'create' ? crypto.randomUUID() : undefined,
      message: `Stub ${operation} OK`,
    };
  }

  private shouldFail(): boolean {
    return this.opts.simulateFailure ?? process.env.FEEDER_STUB_FAIL === 'true';
  }
}

/**
 * Real Feeder client — skeleton yang TANPA memanggil API sungguhan.
 * Untuk implementasi: ganti method body dengan fetch ke endpoint Feeder kampus.
 */
export class RealFeederClient implements FeederClient {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(private cfg: FeederConfigInput) {}

  async testConnection(): Promise<PushResult> {
    // TODO production: POST /ws/live/feeder/login dengan username/password,
    // simpan token dengan TTL pendek (60 mnt).
    return { ok: false, message: 'Real client belum diimplementasikan — kontak vendor Feeder' };
  }

  async push(_entity: FeederEntity, _operation: FeederOperation, _payload: unknown): Promise<PushResult> {
    // TODO production: route ke endpoint Feeder sesuai entity+operation,
    // mis. POST /ws/live/feeder/InsertMahasiswa, /UpdateNilai, /DeleteAktivitasKuliahMahasiswa.
    return { ok: false, message: 'Real client belum diimplementasikan — kontak vendor Feeder' };
  }
}

/** Factory client berdasarkan env. */
export function getFeederClient(cfg: FeederConfigInput): FeederClient {
  if (process.env.FEEDER_USE_REAL === 'true') {
    return new RealFeederClient(cfg);
  }
  return new StubFeederClient(cfg);
}
