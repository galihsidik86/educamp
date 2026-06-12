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
  await prisma.krs.create({
    data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
  });
});

const baseTugas = {
  judul: 'Tugas Diagram Use Case E-commerce',
  deskripsi: 'Buat diagram use case sistem e-commerce sederhana.',
  deadline: '2026-12-31T23:59',
  maxNilai: 100,
};

async function buatDosenLain() {
  const pw = await hashPassword('password123');
  const u = await prisma.user.create({
    data: {
      email: 'dosen-lain-tg@test.id', passwordHash: pw, role: Role.dosen,
      dosen: { create: { nidn: '9888888888', nama: 'Dosen Lain', prodiId: f.prodi.id } },
    },
    include: { dosen: true },
  });
  return u;
}

describe('Dosen CRUD tugas', () => {
  it('create + edit + delete oleh owner kelas', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app).post(`/dosen/kelas/${f.kelas1.id}/tugas`).set('Authorization', `Bearer ${token}`).send(baseTugas);
    expect(c.status).toBe(201);

    const u = await request(app).patch(`/dosen/tugas/${c.body.id}`).set('Authorization', `Bearer ${token}`).send({ maxNilai: 80 });
    expect(u.body.maxNilai).toBe(80);

    const d = await request(app).delete(`/dosen/tugas/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(d.status).toBe(204);
  });

  it('dosen lain tidak boleh CRUD tugas kelas yang bukan miliknya', async () => {
    await buatDosenLain();
    const lainToken = await loginAs(request(app), 'dosen-lain-tg@test.id');
    const r = await request(app).post(`/dosen/kelas/${f.kelas1.id}/tugas`).set('Authorization', `Bearer ${lainToken}`).send(baseTugas);
    expect(r.status).toBe(403);
  });

  it('pertemuanId dari kelas lain ditolak', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const p = await prisma.pertemuan.create({
      data: { kelasId: f.kelas2.id, pertemuanKe: 1, tanggal: new Date('2026-06-09') },
    });
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/tugas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...baseTugas, pertemuanId: p.id });
    expect(r.status).toBe(400);
  });

  it('list tugas + count submit/dinilai', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app).post(`/dosen/kelas/${f.kelas1.id}/tugas`).set('Authorization', `Bearer ${token}`).send(baseTugas);

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post(`/mahasiswa/tugas/${c.body.id}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://x' });

    const list = await request(app).get(`/dosen/kelas/${f.kelas1.id}/tugas`).set('Authorization', `Bearer ${token}`);
    expect(list.body.items[0].totalSubmit).toBe(1);
    expect(list.body.items[0].totalDinilai).toBe(0);
  });
});

describe('Mahasiswa submit + Dosen grading', () => {
  async function setup() {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app).post(`/dosen/kelas/${f.kelas1.id}/tugas`).set('Authorization', `Bearer ${dosenToken}`).send(baseTugas);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    return { dosenToken, mhsToken, tugasId: c.body.id };
  }

  it('submit valid dengan link → status terkumpul', async () => {
    const { mhsToken, tugasId } = await setup();
    const r = await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://drive.google.com/x' });
    expect(r.body.status).toBe('terkumpul');
    expect(r.body.terlambat).toBe(false);
  });

  it('submit tanpa link maupun isi → 400', async () => {
    const { mhsToken, tugasId } = await setup();
    const r = await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(r.status).toBe(400);
  });

  it('resubmit replace jawaban sebelum dinilai', async () => {
    const { mhsToken, tugasId } = await setup();
    await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://v1' });
    const r = await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://v2' });
    expect(r.body.linkJawaban).toBe('https://v2');
    expect(await prisma.submitTugas.count()).toBe(1);
  });

  it('submit setelah dinilai → 403', async () => {
    const { dosenToken, mhsToken, tugasId } = await setup();
    await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://x' });
    const list = await request(app).get(`/dosen/tugas/${tugasId}/submission`).set('Authorization', `Bearer ${dosenToken}`);
    const subId = list.body.peserta[0].submission.id;
    await request(app).patch(`/dosen/submission/${subId}`).set('Authorization', `Bearer ${dosenToken}`).send({ nilai: 80 });

    const r = await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://x2' });
    expect(r.status).toBe(403);
  });

  it('mahasiswa non-peserta → 403', async () => {
    const { tugasId } = await setup();
    // buat mahasiswa lain belum KRS
    const pw = await hashPassword('password123');
    await prisma.user.create({
      data: {
        email: 'mhs-lain@test.id', passwordHash: pw, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000098', nama: 'Lain', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
    });
    const lainToken = await loginAs(request(app), 'mhs-lain@test.id');
    const r = await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${lainToken}`).send({ linkJawaban: 'https://x' });
    expect(r.status).toBe(403);
  });

  it('grade nilai > maxNilai → 400', async () => {
    const { dosenToken, mhsToken, tugasId } = await setup();
    await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://x' });
    const list = await request(app).get(`/dosen/tugas/${tugasId}/submission`).set('Authorization', `Bearer ${dosenToken}`);
    const subId = list.body.peserta[0].submission.id;
    const r = await request(app).patch(`/dosen/submission/${subId}`).set('Authorization', `Bearer ${dosenToken}`).send({ nilai: 150 });
    expect(r.status).toBe(400);
  });

  it('grade valid → status dinilai + nilai tersimpan', async () => {
    const { dosenToken, mhsToken, tugasId } = await setup();
    await request(app).post(`/mahasiswa/tugas/${tugasId}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://x' });
    const list = await request(app).get(`/dosen/tugas/${tugasId}/submission`).set('Authorization', `Bearer ${dosenToken}`);
    const subId = list.body.peserta[0].submission.id;
    const r = await request(app).patch(`/dosen/submission/${subId}`).set('Authorization', `Bearer ${dosenToken}`).send({ nilai: 85, catatan: 'Bagus' });
    expect(r.body.status).toBe('dinilai');
    expect(r.body.nilai).toBe(85);
  });

  it('submit lewat deadline → terlambat true', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/tugas`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ ...baseTugas, deadline: '2020-01-01T00:00' });
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post(`/mahasiswa/tugas/${c.body.id}/submit`).set('Authorization', `Bearer ${mhsToken}`).send({ linkJawaban: 'https://x' });
    expect(r.body.terlambat).toBe(true);
    expect(r.body.status).toBe('terlambat');
  });
});
