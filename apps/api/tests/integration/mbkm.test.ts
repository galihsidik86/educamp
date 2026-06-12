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

const sampleProgram = {
  jenis: 'magang_industri',
  namaProgram: 'Magang BE Tokopedia',
  mitra: 'PT Tokopedia',
  periode: '20261',
  tanggalMulai: '2026-09-01',
  tanggalSelesai: '2026-12-31',
};

describe('MBKM — mahasiswa daftar', () => {
  it('daftar berhasil → status pengajuan', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send(sampleProgram);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pengajuan');
    expect(r.body.jenis).toBe('magang_industri');
  });

  it('duplikat jenis-periode aktif → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send(sampleProgram);
    const r = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send({ ...sampleProgram, namaProgram: 'Lain' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/sudah memiliki/);
  });

  it('jenis BKP berbeda di periode sama → boleh', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send(sampleProgram);
    const r = await request(app)
      .post('/mahasiswa/mbkm')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...sampleProgram, jenis: 'studi_independen', namaProgram: 'SIB Bangkit' });
    expect(r.status).toBe(201);
  });

  it('cancel pengajuan (status pengajuan) berhasil', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send(sampleProgram);
    const d = await request(app).delete(`/mahasiswa/mbkm/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(d.status).toBe(204);
    expect(await prisma.mbkm.count()).toBe(0);
  });

  it('cancel saat status berjalan → 403', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send(sampleProgram);
    await prisma.mbkm.update({ where: { id: c.body.id }, data: { status: 'berjalan' } });
    const d = await request(app).delete(`/mahasiswa/mbkm/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(d.status).toBe(403);
  });

  it('update link laporan setelah berjalan', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${token}`).send(sampleProgram);
    const r = await request(app)
      .patch(`/mahasiswa/mbkm/${c.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ linkLaporan: 'https://drive.google.com/laporan', linkSertifikat: 'https://drive.google.com/sertifikat' });
    expect(r.body.linkLaporan).toBe('https://drive.google.com/laporan');
    expect(r.body.linkSertifikat).toBe('https://drive.google.com/sertifikat');
  });
});

describe('MBKM — akademik kelola', () => {
  async function setup() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${mhsToken}`).send(sampleProgram);
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    return { mhsToken, akademikToken, mbkmId: c.body.id };
  }

  it('assign DPL + setujui → notifikasi mahasiswa', async () => {
    const { akademikToken, mbkmId } = await setup();
    const r = await request(app)
      .patch(`/akademik/mbkm/${mbkmId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ dplDosenId: f.dosen.id, status: 'disetujui', catatan: 'OK' });
    expect(r.body.status).toBe('disetujui');
    expect(r.body.dplDosenId).toBe(f.dosen.id);
    expect(r.body.catatan).toBe('OK');

    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'mbkm' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/disetujui/i);
  });

  it('add konversi MK → set nilai → bobot auto', async () => {
    const { akademikToken, mbkmId } = await setup();
    const add = await request(app)
      .post(`/akademik/mbkm/${mbkmId}/konversi`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ mataKuliahId: f.mk1.id });
    expect(add.status).toBe(201);
    const konversiId = add.body.id;

    const setNilai = await request(app)
      .patch(`/akademik/mbkm/${mbkmId}/konversi/${konversiId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ nilaiHuruf: 'A' });
    expect(setNilai.body.nilaiHuruf).toBe('A');
    expect(setNilai.body.bobot).toBe(4);
  });

  it('add konversi duplikat MK → 400', async () => {
    const { akademikToken, mbkmId } = await setup();
    await request(app).post(`/akademik/mbkm/${mbkmId}/konversi`).set('Authorization', `Bearer ${akademikToken}`).send({ mataKuliahId: f.mk1.id });
    const dup = await request(app).post(`/akademik/mbkm/${mbkmId}/konversi`).set('Authorization', `Bearer ${akademikToken}`).send({ mataKuliahId: f.mk1.id });
    expect(dup.status).toBe(400);
  });

  it('hapus konversi → list bersih', async () => {
    const { akademikToken, mbkmId } = await setup();
    const add = await request(app).post(`/akademik/mbkm/${mbkmId}/konversi`).set('Authorization', `Bearer ${akademikToken}`).send({ mataKuliahId: f.mk1.id });
    const del = await request(app).delete(`/akademik/mbkm/${mbkmId}/konversi/${add.body.id}`).set('Authorization', `Bearer ${akademikToken}`);
    expect(del.status).toBe(204);
    expect(await prisma.mbkmKonversi.count({ where: { mbkmId } })).toBe(0);
  });
});

describe('RBAC MBKM', () => {
  it('mahasiswa tidak boleh PATCH endpoint akademik', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mbkm').set('Authorization', `Bearer ${mhsToken}`).send(sampleProgram);
    const r = await request(app)
      .patch(`/akademik/mbkm/${c.body.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ status: 'disetujui' });
    expect(r.status).toBe(403);
  });
});
