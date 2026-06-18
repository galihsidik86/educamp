import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';
import { mapKrsToFeeder, mapMahasiswaToFeeder, statusKrsToPddikti, statusMahasiswaToPddikti } from '../../src/lib/feeder/mapping.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });
beforeEach(async () => {
  await resetDb();
  f = await createFixtures();
});

describe('Mapping enum SIAKAD → PDDikti', () => {
  it('status mahasiswa: aktif→A, cuti→C, lulus→L', () => {
    expect(statusMahasiswaToPddikti.aktif).toBe('A');
    expect(statusMahasiswaToPddikti.cuti).toBe('C');
    expect(statusMahasiswaToPddikti.lulus).toBe('L');
  });

  it('status KRS: disetujui→A, ditolak→T', () => {
    expect(statusKrsToPddikti.disetujui).toBe('A');
    expect(statusKrsToPddikti.ditolak).toBe('T');
  });

  it('mapMahasiswaToFeeder bentuk payload dengan kode yang valid', () => {
    const payload = mapMahasiswaToFeeder({
      nim: '2021110001', nama: 'Aisyah Putri', jenisKelamin: 'P',
      tempatLahir: 'Bogor', tanggalLahir: new Date('2003-05-01'),
      angkatan: 2021, status: 'aktif',
      prodi: { kode: '55201', jenjang: 's1' },
    });
    expect(payload.nim).toBe('2021110001');
    expect(payload.jenis_kelamin).toBe('2');
    expect(payload.id_status_mahasiswa).toBe('A');
    expect(payload.id_jenjang_pendidikan).toBe('30'); // s1
    expect(payload.tanggal_lahir).toBe('2003-05-01');
  });

  it('mapKrsToFeeder include feederId untuk update', () => {
    const payload = mapKrsToFeeder({
      feederId: 'remote-uuid-123',
      mahasiswa: { feederId: 'mhs-feeder-id', nim: '2021110001' },
      kelas: { feederId: 'kelas-feeder-id', kodeKelas: 'A' },
      semester: { kode: '20251' },
      status: 'disetujui',
    });
    expect(payload.id_aktivitas_kuliah_mahasiswa).toBe('remote-uuid-123');
    expect(payload.status_krs).toBe('A');
  });
});

describe('Config + test koneksi', () => {
  it('GET default config kalau belum diset', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/feeder/config').set('Authorization', `Bearer ${token}`);
    expect(r.body.dryRun).toBe(true);
    expect(r.body.isEnabled).toBe(false);
    expect(r.body.hasPassword).toBe(false);
  });

  it('PATCH config + test connection (stub success)', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const cfg = await request(app).patch('/akademik/feeder/config').set('Authorization', `Bearer ${token}`).send({
      baseUrl: 'https://feeder-stub.tazkia.ac.id', username: 'kampus_ws', password: 'rahasia',
      semesterAktif: '20251', dryRun: false, isEnabled: true,
    });
    expect(cfg.body.baseUrl).toBe('https://feeder-stub.tazkia.ac.id');
    expect(cfg.body.hasPassword).toBe(true);
    expect(cfg.body.passwordEnc).toBeUndefined(); // tidak diekspose

    const t = await request(app).post('/akademik/feeder/test-connection').set('Authorization', `Bearer ${token}`);
    expect(t.body.ok).toBe(true);
  });

  it('test connection tanpa config → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post('/akademik/feeder/test-connection').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(400);
  });
});

describe('Enqueue saat KRS approve', () => {
  it('akademik setujui KRS → entry queue krs create', async () => {
    // Bypass mahasiswa flow — buat KRS langsung dengan status diajukan
    await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'diajukan' },
    });

    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post(`/akademik/krs/${f.mahasiswa.id}/validasi`).set('Authorization', `Bearer ${akdToken}`)
      .send({ action: 'setujui' });
    expect(r.status).toBe(200);

    await new Promise((res) => setTimeout(res, 300));
    const queue = await prisma.feederQueue.findMany({ where: { entity: 'krs', operation: 'create' } });
    expect(queue.length).toBe(1);
    expect(queue[0]!.status).toBe('pending');
  });
});

describe('Enqueue saat nilai finalize', () => {
  it('dosen finalize nilai → entry queue nilai create', async () => {
    // Buat KRS disetujui
    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });

    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).patch(`/dosen/nilai/${krs.id}`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ nilaiAngka: 85, status: 'finalized' });
    expect(r.status).toBe(200);

    await new Promise((res) => setTimeout(res, 200));
    const queue = await prisma.feederQueue.findMany({ where: { entity: 'nilai' } });
    expect(queue.length).toBe(1);
  });
});

describe('Process queue (stub mode)', () => {
  async function setupConfig(dryRun: boolean) {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await request(app).patch('/akademik/feeder/config').set('Authorization', `Bearer ${akdToken}`).send({
      baseUrl: 'https://feeder-stub.local', username: 'ws', password: 'pw',
      semesterAktif: '20251', dryRun, isEnabled: true,
    });
    return akdToken;
  }

  it('dry-run mode → status skipped + log skipped, tidak ada feederId di entity', async () => {
    const akdToken = await setupConfig(true);
    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    await prisma.feederQueue.create({
      data: { entity: 'krs', entityId: krs.id, operation: 'create', payload: { stub: true } },
    });

    const r = await request(app).post('/akademik/feeder/queue/process').set('Authorization', `Bearer ${akdToken}`).send({});
    expect(r.body.processed).toBe(1);
    expect(r.body.skipped).toBe(1);

    const queue = await prisma.feederQueue.findMany();
    expect(queue[0]!.status).toBe('skipped');

    const k = await prisma.krs.findUnique({ where: { id: krs.id } });
    expect(k!.feederId).toBeNull(); // dry-run tidak set feederId
  });

  it('live stub mode → status success + feederId terisi di entity + log success', async () => {
    const akdToken = await setupConfig(false);
    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    await prisma.feederQueue.create({
      data: { entity: 'krs', entityId: krs.id, operation: 'create', payload: { stub: true } },
    });

    const r = await request(app).post('/akademik/feeder/queue/process').set('Authorization', `Bearer ${akdToken}`).send({});
    expect(r.body.success).toBe(1);

    const k = await prisma.krs.findUnique({ where: { id: krs.id } });
    expect(k!.feederId).toBeTruthy();
    expect(k!.lastSyncedAt).not.toBeNull();

    const log = await prisma.feederSyncLog.findMany();
    expect(log[0]!.status).toBe('success');
  });

  it('failure path → status pending dengan backoff, attempts naik', async () => {
    // Force simulasi failure via env
    process.env.FEEDER_STUB_FAIL = 'true';
    try {
      const akdToken = await setupConfig(false);
      const krs = await prisma.krs.create({
        data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
      });
      await prisma.feederQueue.create({
        data: { entity: 'krs', entityId: krs.id, operation: 'create', payload: { stub: true } },
      });

      const r = await request(app).post('/akademik/feeder/queue/process').set('Authorization', `Bearer ${akdToken}`).send({});
      expect(r.body.failed).toBe(1);

      const q = await prisma.feederQueue.findFirst();
      expect(q!.status).toBe('pending'); // belum mencapai maxAttempts
      expect(q!.attempts).toBe(1);
      expect(q!.nextRetryAt).not.toBeNull();
      expect(q!.lastError).toMatch(/simulasi/i);

      // Log failed terbuat
      const log = await prisma.feederSyncLog.findMany();
      expect(log[0]!.status).toBe('failed');
    } finally {
      delete process.env.FEEDER_STUB_FAIL;
    }
  });

  it('config tidak enabled → tidak proses apapun', async () => {
    // Tetap pakai config dengan isEnabled=false (default)
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await prisma.feederQueue.create({
      data: { entity: 'krs', entityId: f.kelas1.id, operation: 'create', payload: {} },
    });
    const r = await request(app).post('/akademik/feeder/queue/process').set('Authorization', `Bearer ${akdToken}`).send({});
    expect(r.body.processed).toBe(0);
  });
});

describe('Queue management', () => {
  it('retry item failed', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const q = await prisma.feederQueue.create({
      data: { entity: 'krs', entityId: 'x', operation: 'create', payload: {}, status: 'failed', attempts: 5, lastError: 'previous error' },
    });
    const r = await request(app).post(`/akademik/feeder/queue/${q.id}/retry`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.status).toBe('pending');
    expect(r.body.attempts).toBe(0);
  });

  it('retry item yang bukan failed → 400', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const q = await prisma.feederQueue.create({
      data: { entity: 'krs', entityId: 'x', operation: 'create', payload: {}, status: 'success' },
    });
    const r = await request(app).post(`/akademik/feeder/queue/${q.id}/retry`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.status).toBe(400);
  });

  it('stats counter per status', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await prisma.feederQueue.createMany({
      data: [
        { entity: 'krs', entityId: 'a', operation: 'create', payload: {}, status: 'pending' },
        { entity: 'krs', entityId: 'b', operation: 'create', payload: {}, status: 'pending' },
        { entity: 'krs', entityId: 'c', operation: 'create', payload: {}, status: 'success' },
      ],
    });
    const r = await request(app).get('/akademik/feeder/queue/stats').set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.pending).toBe(2);
    expect(r.body.success).toBe(1);
  });
});

describe('RBAC feeder', () => {
  it('mahasiswa tidak boleh akses endpoint feeder', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/akademik/feeder/config').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});
