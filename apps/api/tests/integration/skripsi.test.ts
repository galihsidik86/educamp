import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';
import { Role } from '@prisma/client';
import { hashPassword } from '../../src/lib/password.js';

const app = createApp();
let f: Fixtures;

const sampleJudul = 'Implementasi Algoritma Decision Tree untuk Klasifikasi Mahasiswa Berisiko Drop Out';

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });
beforeEach(async () => {
  await resetDb();
  f = await createFixtures();
});

async function makeDosen2() {
  const pw = await hashPassword('password123');
  const u = await prisma.user.create({
    data: {
      email: 'dosen2-t@test.id', passwordHash: pw, role: Role.dosen,
      dosen: { create: { nidn: '9999999999', nama: 'Dosen Dua', prodiId: f.prodi.id } },
    },
    include: { dosen: true },
  });
  return u.dosen!;
}

describe('Skripsi mahasiswa', () => {
  it('ajukan judul valid → diajukan', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/skripsi')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: sampleJudul, topik: 'Machine Learning' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('diajukan');
  });

  it('judul < 10 char → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/skripsi')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Pendek' });
    expect(r.status).toBe(400);
  });

  it('ajukan kedua saat sudah punya yang aktif → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${token}`).send({ judul: sampleJudul });
    const r = await request(app)
      .post('/mahasiswa/skripsi')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Judul kedua yang juga cukup panjang' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/aktif/i);
  });

  it('ajukan kedua setelah pertama dibatalkan → boleh', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${token}`).send({ judul: sampleJudul });
    await request(app).delete(`/mahasiswa/skripsi/${c.body.id}`).set('Authorization', `Bearer ${token}`);

    const r = await request(app)
      .post('/mahasiswa/skripsi')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Judul kedua yang juga cukup panjang' });
    expect(r.status).toBe(201);
  });

  it('cancel saat status berjalan → 403', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${token}`).send({ judul: sampleJudul });
    await prisma.skripsi.update({ where: { id: c.body.id }, data: { status: 'proposal' } });
    const r = await request(app).delete(`/mahasiswa/skripsi/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('mahasiswa update link dokumen', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${token}`).send({ judul: sampleJudul });
    const r = await request(app)
      .patch(`/mahasiswa/skripsi/${c.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ linkDokumen: 'https://drive.google.com/draft' });
    expect(r.body.linkDokumen).toBe('https://drive.google.com/draft');
  });
});

describe('Skripsi akademik validasi', () => {
  async function ajukan() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${mhsToken}`).send({ judul: sampleJudul });
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    return { mhsToken, akademikToken, skripsiId: c.body.id };
  }

  it('assign 2 pembimbing + setujui → tanggalDisetujui auto, notif terkirim', async () => {
    const { akademikToken, skripsiId } = await ajukan();
    const d2 = await makeDosen2();
    const r = await request(app)
      .patch(`/akademik/skripsi/${skripsiId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ pembimbing1Id: f.dosen.id, pembimbing2Id: d2.id, status: 'disetujui', catatan: 'OK' });
    expect(r.body.status).toBe('disetujui');
    expect(r.body.tanggalDisetujui).not.toBeNull();

    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'skripsi' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/disetujui/i);
  });

  it('pembimbing1 dan 2 sama dosen → 400', async () => {
    const { akademikToken, skripsiId } = await ajukan();
    const r = await request(app)
      .patch(`/akademik/skripsi/${skripsiId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ pembimbing1Id: f.dosen.id, pembimbing2Id: f.dosen.id });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/sama/i);
  });

  it('set nilai akhir + status lulus', async () => {
    const { akademikToken, skripsiId } = await ajukan();
    const r = await request(app)
      .patch(`/akademik/skripsi/${skripsiId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ nilaiHuruf: 'A', status: 'lulus' });
    expect(r.body.nilaiHuruf).toBe('A');
    expect(r.body.status).toBe('lulus');
  });

  it('filter by status', async () => {
    const { akademikToken } = await ajukan();
    const r = await request(app)
      .get('/akademik/skripsi?status=diajukan')
      .set('Authorization', `Bearer ${akademikToken}`);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].status).toBe('diajukan');
  });
});

describe('Skripsi dosen bimbingan', () => {
  it('dosen pembimbing1 lihat mahasiswa di list dengan peran pembimbing1', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${mhsToken}`).send({ judul: sampleJudul });
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    await request(app)
      .patch(`/akademik/skripsi/${c.body.id}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ pembimbing1Id: f.dosen.id, status: 'disetujui' });

    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/skripsi').set('Authorization', `Bearer ${dosenToken}`);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].peran).toBe('pembimbing1');
    expect(r.body.items[0].status).toBe('disetujui');
  });

  it('dosen sebagai pembimbing2 ditandai peran pembimbing2', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${mhsToken}`).send({ judul: sampleJudul });
    const d2 = await makeDosen2();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    await request(app)
      .patch(`/akademik/skripsi/${c.body.id}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ pembimbing1Id: d2.id, pembimbing2Id: f.dosen.id, status: 'disetujui' });

    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/skripsi').set('Authorization', `Bearer ${dosenToken}`);
    expect(r.body.items[0].peran).toBe('pembimbing2');
  });
});

describe('RBAC Skripsi', () => {
  it('mahasiswa tidak boleh PATCH endpoint akademik', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/skripsi').set('Authorization', `Bearer ${mhsToken}`).send({ judul: sampleJudul });
    const r = await request(app)
      .patch(`/akademik/skripsi/${c.body.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ status: 'disetujui' });
    expect(r.status).toBe(403);
  });
});
