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

const baseBody = {
  kategori: 'krs' as const,
  judul: 'Tidak bisa input KRS — error 500',
  deskripsi: 'Saat klik tombol submit di KRS, muncul pesan error 500. Sudah coba refresh berkali-kali.',
};

describe('Mahasiswa buat tiket', () => {
  it('buat valid → 201 + notif ke akademik', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/tiket').set('Authorization', `Bearer ${token}`).send(baseBody);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('terbuka');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.akademikUser.id, type: 'tiket' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('judul terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/tiket').set('Authorization', `Bearer ${token}`).send({ ...baseBody, judul: 'X' });
    expect(r.status).toBe(400);
  });

  it('kategori invalid → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/tiket').set('Authorization', `Bearer ${token}`).send({ ...baseBody, kategori: 'aneh' });
    expect(r.status).toBe(400);
  });

  it('mahasiswa lihat detail miliknya', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/tiket').set('Authorization', `Bearer ${token}`).send(baseBody);
    const r = await request(app).get(`/mahasiswa/tiket/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.body.judul).toBe(baseBody.judul);
    expect(r.body.replies).toEqual([]);
  });
});

describe('Akademik handle tiket', () => {
  async function buat() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/tiket').set('Authorization', `Bearer ${mhsToken}`).send(baseBody);
    return { mhsToken, tiketId: c.body.id };
  }

  it('reply akademik → status terbuka → proses + notif ke mahasiswa', async () => {
    const { tiketId } = await buat();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post(`/akademik/tiket/${tiketId}/reply`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ isi: 'Halo, mohon coba bersihkan cache browser dulu, jika masih error kirim screenshot.' });
    expect(r.status).toBe(201);

    const t = await prisma.tiket.findUnique({ where: { id: tiketId } });
    expect(t!.status).toBe('proses');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'tiket' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('akademik PATCH status → menunggu_user, lalu mahasiswa reply → kembali ke proses', async () => {
    const { mhsToken, tiketId } = await buat();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    await request(app).patch(`/akademik/tiket/${tiketId}`).set('Authorization', `Bearer ${akademikToken}`).send({ status: 'menunggu_user' });

    const r = await request(app)
      .post(`/mahasiswa/tiket/${tiketId}/reply`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ isi: 'Sudah bersihkan cache tapi masih error 500.' });
    expect(r.status).toBe(201);

    const t = await prisma.tiket.findUnique({ where: { id: tiketId } });
    expect(t!.status).toBe('proses');
  });

  it('PATCH ke selesai → tanggalTutup auto', async () => {
    const { tiketId } = await buat();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).patch(`/akademik/tiket/${tiketId}`).set('Authorization', `Bearer ${akademikToken}`).send({ status: 'selesai' });
    expect(r.body.status).toBe('selesai');
    expect(r.body.tanggalTutup).not.toBeNull();
  });

  it('reply ke tiket ditutup → 400', async () => {
    const { tiketId } = await buat();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    await request(app).patch(`/akademik/tiket/${tiketId}`).set('Authorization', `Bearer ${akademikToken}`).send({ status: 'ditutup' });
    const r = await request(app).post(`/akademik/tiket/${tiketId}/reply`).set('Authorization', `Bearer ${akademikToken}`).send({ isi: 'X' });
    expect(r.status).toBe(400);
  });

  it('filter status & kategori', async () => {
    await buat();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const r1 = await request(app).get('/akademik/tiket?status=terbuka').set('Authorization', `Bearer ${akademikToken}`);
    expect(r1.body.items).toHaveLength(1);
    const r2 = await request(app).get('/akademik/tiket?kategori=keuangan').set('Authorization', `Bearer ${akademikToken}`);
    expect(r2.body.items).toHaveLength(0);
  });
});

describe('RBAC tiket', () => {
  it('mahasiswa tidak boleh akses endpoint akademik', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/akademik/tiket').set('Authorization', `Bearer ${mhsToken}`);
    expect(r.status).toBe(403);
  });

  it('mahasiswa tidak boleh akses tiket mahasiswa lain', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/tiket').set('Authorization', `Bearer ${mhsToken}`).send(baseBody);

    // buat mahasiswa kedua
    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'mhs2@test.id', passwordHash: h, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000002', nama: 'Mhs 2', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
    });
    const otherToken = await loginAs(request(app), '9999000002');
    const r = await request(app).get(`/mahasiswa/tiket/${c.body.id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(r.status).toBe(403);
  });
});
