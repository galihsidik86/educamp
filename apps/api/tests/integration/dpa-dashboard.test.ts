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

describe('DPA dashboard', () => {
  it('dosen DPA lihat ringkasan + per-mahasiswa breakdown', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/dpa-dashboard').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.ringkasan.totalMahasiswa).toBe(1);
    expect(r.body.items[0].nim).toBe(f.mahasiswa.nim);
    expect(r.body.items[0].ipk).toBeNull(); // belum ada nilai finalized
  });

  it('IPK + at-risk flag terhitung dari nilai finalized', async () => {
    // Set nilai finalized D (di bawah threshold 2.0)
    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    await prisma.nilai.create({
      data: {
        krsId: krs.id, mahasiswaId: f.mahasiswa.id,
        nilaiAngka: 50, nilaiHuruf: 'D', bobot: 1.0, status: 'finalized',
      },
    });

    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/dpa-dashboard').set('Authorization', `Bearer ${token}`);
    expect(r.body.items[0].ipk).toBeCloseTo(1.0, 1);
    expect(r.body.items[0].atRiskIpk).toBe(true);
    expect(r.body.ringkasan.atRiskIpk).toBe(1);
  });

  it('krs pending flag terdeteksi', async () => {
    await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'diajukan' },
    });
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/dpa-dashboard').set('Authorization', `Bearer ${token}`);
    expect(r.body.items[0].krsPending).toBe(true);
    expect(r.body.ringkasan.krsPending).toBe(1);
  });

  it('kehadiran < 75% → kritisKehadiran=true', async () => {
    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    void krs;
    const p1 = await prisma.pertemuan.create({ data: { kelasId: f.kelas1.id, pertemuanKe: 1, tanggal: new Date('2025-09-01') } });
    const p2 = await prisma.pertemuan.create({ data: { kelasId: f.kelas1.id, pertemuanKe: 2, tanggal: new Date('2025-09-08') } });
    await prisma.absensi.createMany({
      data: [
        { pertemuanId: p1.id, mahasiswaId: f.mahasiswa.id, status: 'hadir' },
        { pertemuanId: p2.id, mahasiswaId: f.mahasiswa.id, status: 'alpa' },
      ],
    });
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/dpa-dashboard').set('Authorization', `Bearer ${token}`);
    expect(r.body.items[0].persenHadir).toBe(50);
    expect(r.body.items[0].kritisKehadiran).toBe(true);
    expect(r.body.ringkasan.kritisKehadiran).toBe(1);
  });
});

describe('RBAC DPA dashboard', () => {
  it('mahasiswa tidak boleh akses endpoint dosen', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/dosen/dpa-dashboard').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});
