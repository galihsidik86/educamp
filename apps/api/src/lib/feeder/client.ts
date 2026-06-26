// ============================================================
// Neo Feeder client adapter.
//
// Pattern: Neo Feeder web service di endpoint `/ws/live2.php`
// dengan JSON-RPC sederhana — action dipilih lewat field `act`,
// auth via token bearer yg di-issue lewat act=GetToken.
//
// Default ke STUB untuk dev/test. Untuk production set env
// FEEDER_USE_REAL=true; client akan otomatis call HTTP ke baseUrl
// yg disimpan di FeederConfig (singleton).
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

// ============================================================
// REAL CLIENT
// Mapping entity+operation → method name Neo Feeder (act value).
// Sumber: dokumentasi web service Neo Feeder 2.4 (act list).
// Untuk operasi update Neo Feeder pakai "Update<Entity>" dgn key
// id_<entity>; delete pakai "Delete<Entity>" dgn filter id_<entity>.
// ============================================================

const ENTITY_KEY: Record<FeederEntity, string> = {
  mahasiswa: 'id_mahasiswa',
  dosen: 'id_dosen',
  mata_kuliah: 'id_matkul',
  kelas: 'id_kelas',
  krs: 'id_aktivitas_kuliah_mahasiswa',
  nilai: 'id_nilai',
  aktivitas: 'id_aktivitas',
  yudisium: 'id_lulusan',
  akm: 'id_aktivitas_kuliah_mahasiswa',
  komponen_evaluasi: 'id_komponen_evaluasi',
  nilai_komponen: 'id_nilai_komponen',
  daya_tampung: 'id_daya_tampung',
  mahasiswa_inbound: 'id_mahasiswa_inbound',
  nilai_transfer: 'id_nilai_transfer',
};

const ACT_BY_ENTITY_OP: Record<FeederEntity, Record<FeederOperation, string>> = {
  mahasiswa: {
    create: 'InsertMahasiswa',
    update: 'UpdateMahasiswa',
    delete: 'DeleteMahasiswa',
  },
  dosen: {
    create: 'InsertDosen',
    update: 'UpdateDosen',
    delete: 'DeleteDosen',
  },
  mata_kuliah: {
    create: 'InsertMataKuliah',
    update: 'UpdateMataKuliah',
    delete: 'DeleteMataKuliah',
  },
  kelas: {
    create: 'InsertKelasKuliah',
    update: 'UpdateKelasKuliah',
    delete: 'DeleteKelasKuliah',
  },
  krs: {
    create: 'InsertAktivitasKuliahMahasiswa',
    update: 'UpdateAktivitasKuliahMahasiswa',
    delete: 'DeleteAktivitasKuliahMahasiswa',
  },
  nilai: {
    create: 'UpdateNilaiPerkuliahanKelas',
    update: 'UpdateNilaiPerkuliahanKelas',
    delete: 'DeleteNilaiPerkuliahanKelas',
  },
  aktivitas: {
    create: 'InsertAktivitasMahasiswa',
    update: 'UpdateAktivitasMahasiswa',
    delete: 'DeleteAktivitasMahasiswa',
  },
  yudisium: {
    create: 'InsertLulusan',
    update: 'UpdateLulusan',
    delete: 'DeleteLulusan',
  },
  akm: {
    // AKM == AktivitasKuliahMahasiswa di Neo Feeder
    create: 'InsertAktivitasKuliahMahasiswa',
    update: 'UpdateAktivitasKuliahMahasiswa',
    delete: 'DeleteAktivitasKuliahMahasiswa',
  },
  komponen_evaluasi: {
    create: 'InsertKomponenEvaluasiKelas',
    update: 'UpdateRencanaEvaluasiKelas',
    delete: 'DeleteKomponenEvaluasiKelas',
  },
  nilai_komponen: {
    create: 'UpdateNilaiPerkuliahanKelasKomponenEvaluasi',
    update: 'UpdateNilaiPerkuliahanKelasKomponenEvaluasi',
    delete: 'DeleteNilaiPerkuliahanKelasKomponenEvaluasi',
  },
  daya_tampung: {
    create: 'InsertDayaTampung',
    update: 'UpdateDayaTampung',
    delete: 'DeleteDayaTampung',
  },
  mahasiswa_inbound: {
    create: 'InsertMahasiswaInbound',
    update: 'UpdateMahasiswaInbound',
    delete: 'DeleteMahasiswaInbound',
  },
  nilai_transfer: {
    create: 'InsertNilaiTransferPendidikanMahasiswa',
    update: 'UpdateNilaiTransferPendidikanMahasiswa',
    delete: 'DeleteNilaiTransferPendidikanMahasiswa',
  },
};

type NeoResponse = {
  error_code?: number;
  error_desc?: string;
  data?: unknown;
};

/**
 * Real Feeder client — HTTP JSON-RPC ke Neo Feeder 2.4.
 *
 * Pattern auth: cache token in-memory (TTL 50 menit), auto-refresh
 * kalau respon 401/expired. Single client instance per request batch,
 * jadi tidak perlu mutex.
 */
export class RealFeederClient implements FeederClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private static readonly TOKEN_TTL_MS = 50 * 60 * 1000; // 50 menit (Neo Feeder default 60)

  constructor(private cfg: FeederConfigInput) {}

  async testConnection(): Promise<PushResult> {
    try {
      await this.ensureToken(true);
      return { ok: true, message: `Login OK · ${this.cfg.baseUrl}` };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Login gagal' };
    }
  }

  async push(entity: FeederEntity, operation: FeederOperation, payload: unknown): Promise<PushResult> {
    const act = ACT_BY_ENTITY_OP[entity]?.[operation];
    if (!act) {
      return { ok: false, message: `Tidak ada mapping act untuk ${entity}/${operation}` };
    }

    const body: Record<string, unknown> = { act, token: await this.ensureToken() };
    if (operation === 'delete') {
      // Neo Feeder convention: delete pakai filter "key='value'"
      const obj = payload as Record<string, unknown>;
      const key = ENTITY_KEY[entity];
      const val = obj?.[key];
      if (!val) return { ok: false, message: `Field ${key} required untuk delete` };
      body.filter = `${key}='${String(val).replace(/'/g, "''")}'`;
    } else {
      body.record = payload;
    }

    try {
      const res = await this.call(body);
      // Convention: data berisi { id_<entity>: '...' } pada insert sukses.
      const data = res.data as Record<string, unknown> | string | null;
      let feederId: string | undefined;
      if (operation === 'create' && data && typeof data === 'object') {
        const idVal = data[ENTITY_KEY[entity]];
        if (typeof idVal === 'string') feederId = idVal;
      }
      return { ok: true, feederId, message: res.error_desc || `${act} OK` };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? `${act} gagal` };
    }
  }

  /** Login + cache token. Kalau token masih fresh, skip. */
  private async ensureToken(force = false): Promise<string> {
    const now = Date.now();
    if (!force && this.token && now < this.tokenExpiresAt) return this.token;

    const res = await this.call({
      act: 'GetToken',
      username: this.cfg.username,
      password: this.cfg.password,
    }, /* withToken */ false);

    const token = typeof res.data === 'string' ? res.data : null;
    if (!token) {
      throw new Error('Neo Feeder GetToken tidak mengembalikan token');
    }
    this.token = token;
    this.tokenExpiresAt = now + RealFeederClient.TOKEN_TTL_MS;
    return token;
  }

  /** Low-level HTTP call ke Neo Feeder web service. */
  private async call(body: Record<string, unknown>, withToken = true): Promise<NeoResponse> {
    if (withToken && !body.token) body.token = await this.ensureToken();

    const url = this.cfg.baseUrl.replace(/\/$/, '') + '/ws/live2.php';
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30_000);

    let httpRes: Response;
    try {
      httpRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      throw new Error(`Network error: ${e?.message ?? 'unknown'}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!httpRes.ok) {
      throw new Error(`HTTP ${httpRes.status} ${httpRes.statusText}`);
    }

    let res: NeoResponse;
    try {
      res = (await httpRes.json()) as NeoResponse;
    } catch {
      throw new Error('Respon Neo Feeder bukan JSON valid');
    }

    if (typeof res.error_code === 'number' && res.error_code !== 0) {
      // Token expired → invalidate cache, throw retryable error
      if (/token|expired|kadaluarsa/i.test(res.error_desc ?? '')) {
        this.token = null;
        this.tokenExpiresAt = 0;
      }
      throw new Error(`Neo Feeder error ${res.error_code}: ${res.error_desc ?? 'unknown'}`);
    }
    return res;
  }
}

/** Factory client berdasarkan env. */
export function getFeederClient(cfg: FeederConfigInput): FeederClient {
  if (process.env.FEEDER_USE_REAL === 'true') {
    return new RealFeederClient(cfg);
  }
  return new StubFeederClient(cfg);
}
