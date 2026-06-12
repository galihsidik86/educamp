import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { Role } from '@prisma/client';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';
import { hashPassword } from '../../src/lib/password.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });
beforeEach(async () => {
  await resetDb();
  f = await createFixtures();
});

async function buatDosenLain() {
  const pw = await hashPassword('password123');
  const u = await prisma.user.create({
    data: {
      email: 'dosen-lain@test.id', passwordHash: pw, role: Role.dosen,
      dosen: { create: { nidn: '9999999990', nama: 'Dosen Lain', prodiId: f.prodi.id } },
    },
    include: { dosen: true },
  });
  return u;
}

describe('Bahan ajar dosen CRUD', () => {
  it('create link → tersimpan dengan url', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'link', judul: 'Slide Pertemuan 1', url: 'https://drive.google.com/abc' });
    expect(r.status).toBe(201);
    expect(r.body.jenis).toBe('link');
    expect(r.body.url).toBe('https://drive.google.com/abc');
  });

  it('create link tanpa url → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'link', judul: 'Slide' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/url/i);
  });

  it('create text tanpa konten → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'text', judul: 'Catatan' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/konten/i);
  });

  it('create dengan pertemuanId dari kelas lain → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const p = await prisma.pertemuan.create({
      data: { kelasId: f.kelas2.id, pertemuanKe: 1, tanggal: new Date('2026-06-09') },
    });
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'link', judul: 'Pertanyaan', url: 'https://x', pertemuanId: p.id });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/pertemuan/i);
  });

  it('dosen lain tidak boleh CRUD bahan ajar kelas yang bukan miliknya', async () => {
    await buatDosenLain();
    const lainToken = await loginAs(request(app), 'dosen-lain@test.id');
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${lainToken}`)
      .send({ jenis: 'link', judul: 'Materi awal', url: 'https://x' });
    expect(r.status).toBe(403);
  });

  it('edit + delete dosen pemilik kelas', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'link', judul: 'Awal', url: 'https://a' });

    const u = await request(app)
      .patch(`/dosen/bahan-ajar/${c.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Diubah' });
    expect(u.body.judul).toBe('Diubah');

    const d = await request(app).delete(`/dosen/bahan-ajar/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(d.status).toBe(204);
  });

  it('cascade delete bila kelas dihapus', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'link', judul: 'Materi awal', url: 'https://x' });
    expect(await prisma.bahanAjar.count()).toBe(1);
    await prisma.kelas.delete({ where: { id: f.kelas1.id } });
    expect(await prisma.bahanAjar.count()).toBe(0);
  });
});

describe('Bahan ajar mahasiswa read', () => {
  it('peserta KRS disetujui lihat list materi', async () => {
    await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/bahan-ajar`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ jenis: 'link', judul: 'M1', url: 'https://m1' });

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const list = await request(app).get('/mahasiswa/materi').set('Authorization', `Bearer ${mhsToken}`);
    const k1 = list.body.items.find((k: any) => k.kelasId === f.kelas1.id);
    expect(k1).toBeDefined();
    expect(k1.totalBahanAjar).toBe(1);

    const detail = await request(app).get(`/mahasiswa/materi/${f.kelas1.id}`).set('Authorization', `Bearer ${mhsToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.items).toHaveLength(1);
    expect(detail.body.items[0].judul).toBe('M1');
  });

  it('non-peserta → 403', async () => {
    // mahasiswa belum KRS disetujui di kelas1
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get(`/mahasiswa/materi/${f.kelas1.id}`).set('Authorization', `Bearer ${mhsToken}`);
    expect(r.status).toBe(403);
  });

  it('list kelas kosong bila tidak ada KRS disetujui', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/materi').set('Authorization', `Bearer ${mhsToken}`);
    expect(r.body.items).toHaveLength(0);
  });
});
