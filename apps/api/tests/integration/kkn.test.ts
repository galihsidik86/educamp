import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });
beforeEach(async () => {
  await resetDb();
  f = await createFixtures();
});

describe('KKN — mahasiswa daftar', () => {
  it('daftar berhasil → status pendaftaran', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/kkn')
      .set('Authorization', `Bearer ${token}`)
      .send({ periode: '2026 Genap', lokasi: 'Bogor', desa: 'Curug', kecamatan: 'Tajurhalang', kabupaten: 'Bogor' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pendaftaran');
    expect(r.body.dplDosenId).toBeNull();
  });

  it('duplikat periode → 409', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/kkn').set('Authorization', `Bearer ${token}`).send({ periode: '2026 Genap', lokasi: 'Bogor' });
    const r = await request(app).post('/mahasiswa/kkn').set('Authorization', `Bearer ${token}`).send({ periode: '2026 Genap', lokasi: 'Bandung' });
    expect(r.status).toBe(409);
    expect(r.body.error.message).toMatch(/sudah mendaftar/);
  });

  it('format periode invalid → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/kkn').set('Authorization', `Bearer ${token}`).send({ periode: '2026', lokasi: 'Bogor' });
    expect(r.status).toBe(400);
  });
});

describe('KKN — akademik kelola', () => {
  it('assign DPL + status ditugaskan → mahasiswa dapat notifikasi', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/kkn').set('Authorization', `Bearer ${mhsToken}`).send({ periode: '2026 Genap', lokasi: 'Bogor' });

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const list = await request(app).get('/akademik/kkn').set('Authorization', `Bearer ${akademikToken}`);
    const kknId = list.body.items[0].id;

    const patch = await request(app)
      .patch(`/akademik/kkn/${kknId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ dplDosenId: f.dosen.id, status: 'ditugaskan', tanggalMulai: '2026-07-01', tanggalSelesai: '2026-08-15' });
    expect(patch.status).toBe(200);
    expect(patch.body.dplDosenId).toBe(f.dosen.id);
    expect(patch.body.status).toBe('ditugaskan');

    // beri waktu fire-and-forget notif
    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'kkn' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/ditugaskan/i);
  });

  it('beri nilai + status selesai', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/kkn').set('Authorization', `Bearer ${mhsToken}`).send({ periode: '2026 Genap', lokasi: 'Bogor' });

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const list = await request(app).get('/akademik/kkn').set('Authorization', `Bearer ${akademikToken}`);
    const id = list.body.items[0].id;

    const r = await request(app)
      .patch(`/akademik/kkn/${id}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ nilai: 'A', status: 'selesai' });
    expect(r.body.nilai).toBe('A');
    expect(r.body.status).toBe('selesai');
  });

  it('filter periode + status', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/kkn').set('Authorization', `Bearer ${mhsToken}`).send({ periode: '2026 Genap', lokasi: 'Bogor' });

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/kkn?periode=2026%20Genap&status=pendaftaran').set('Authorization', `Bearer ${akademikToken}`);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.periodeList).toContain('2026 Genap');
  });
});
