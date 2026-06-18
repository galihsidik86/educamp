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

const future = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const baseBody = {
  topik: 'Konsultasi pengambilan SKS semester ganjil',
  agenda: 'Diskusi pilihan MK pilihan dan prasyarat',
  durasiMenit: 30,
};

describe('Mahasiswa request konsultasi', () => {
  it('request valid → status diajukan + notif ke DPA', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/konsultasi')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...baseBody, waktuMulai: future() });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('diajukan');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.dosenUser.id, type: 'konsultasi' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('waktu lampau → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/konsultasi')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...baseBody, waktuMulai: new Date('2020-01-01').toISOString() });
    expect(r.status).toBe(400);
  });

  it('topik terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/konsultasi')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...baseBody, topik: 'X', waktuMulai: future() });
    expect(r.status).toBe(400);
  });

  it('mahasiswa cancel saat diajukan → status batal', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/konsultasi').set('Authorization', `Bearer ${token}`)
      .send({ ...baseBody, waktuMulai: future() });
    const r = await request(app).delete(`/mahasiswa/konsultasi/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(204);
    const k = await prisma.konsultasiDpa.findUnique({ where: { id: c.body.id } });
    expect(k!.status).toBe('batal');
  });
});

describe('DPA respond konsultasi', () => {
  async function ajukan() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/konsultasi').set('Authorization', `Bearer ${mhsToken}`)
      .send({ ...baseBody, waktuMulai: future() });
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    return { mhsToken, dosenToken, konsultasiId: c.body.id };
  }

  it('DPA terima → status diterima + notif ke mahasiswa', async () => {
    const { dosenToken, konsultasiId } = await ajukan();
    const r = await request(app)
      .patch(`/dosen/konsultasi/${konsultasiId}/respond`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ status: 'diterima', catatanDpa: 'OK, datang ke ruangan 205' });
    expect(r.body.status).toBe('diterima');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'konsultasi' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/diterima/i);
  });

  it('DPA tolak → status ditolak', async () => {
    const { dosenToken, konsultasiId } = await ajukan();
    const r = await request(app)
      .patch(`/dosen/konsultasi/${konsultasiId}/respond`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ status: 'ditolak', catatanDpa: 'Sedang tidak available' });
    expect(r.body.status).toBe('ditolak');
  });

  it('PATCH selesai tanpa terima dulu → 400', async () => {
    const { dosenToken, konsultasiId } = await ajukan();
    const r = await request(app)
      .patch(`/dosen/konsultasi/${konsultasiId}/selesai`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ catatanDpa: 'Hasil konsultasi' });
    expect(r.status).toBe(400);
  });

  it('selesai setelah diterima → status selesai + tanggalSelesai', async () => {
    const { dosenToken, konsultasiId } = await ajukan();
    await request(app).patch(`/dosen/konsultasi/${konsultasiId}/respond`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ status: 'diterima' });
    const r = await request(app)
      .patch(`/dosen/konsultasi/${konsultasiId}/selesai`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ catatanDpa: 'Disetujui ambil 20 SKS dengan catatan IP semester lalu 3.2' });
    expect(r.body.status).toBe('selesai');
    expect(r.body.tanggalSelesai).not.toBeNull();
  });

  it('filter status', async () => {
    await ajukan();
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/konsultasi?status=diajukan').set('Authorization', `Bearer ${dosenToken}`);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].status).toBe('diajukan');
  });
});

describe('RBAC konsultasi', () => {
  it('mahasiswa tidak boleh PATCH endpoint dosen', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/konsultasi').set('Authorization', `Bearer ${mhsToken}`)
      .send({ ...baseBody, waktuMulai: future() });
    const r = await request(app)
      .patch(`/dosen/konsultasi/${c.body.id}/respond`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ status: 'diterima' });
    expect(r.status).toBe(403);
  });

  it('dosen bukan DPA tidak boleh respond', async () => {
    // Buat dosen kedua yang BUKAN DPA mahasiswa
    const pwHash = (await import('../../src/lib/password.js')).hashPassword;
    const ph = await pwHash('password123');
    await prisma.user.create({
      data: {
        email: 'dosen-lain@test.id', passwordHash: ph, role: 'dosen',
        dosen: { create: { nidn: '9999999999', nama: 'Dosen Lain', prodiId: f.prodi.id } },
      },
    });
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/konsultasi').set('Authorization', `Bearer ${mhsToken}`)
      .send({ ...baseBody, waktuMulai: future() });

    const otherToken = await loginAs(request(app), 'dosen-lain@test.id');
    const r = await request(app)
      .patch(`/dosen/konsultasi/${c.body.id}/respond`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'diterima' });
    expect(r.status).toBe(403);
  });
});
