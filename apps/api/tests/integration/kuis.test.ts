import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, seedKrsDraft, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });
beforeEach(async () => {
  await resetDb();
  f = await createFixtures();
});

const baseKuis = {
  judul: 'Kuis Bab 1',
  deskripsi: 'Kuis penyegar materi minggu pertama',
  durasiMenit: 30,
};

async function setupAcceptedKrs() {
  await seedKrsDraft(f.mahasiswa.id, [f.kelas1.id], f.semester.id);
  await prisma.krs.updateMany({ where: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id }, data: { status: 'disetujui' } });
}

describe('Dosen susun kuis', () => {
  it('create kuis valid → 201', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...baseKuis,
        mulai: new Date(Date.now() - 60_000).toISOString(),
        selesai: new Date(Date.now() + 60 * 60_000).toISOString(),
      });
    expect(r.status).toBe(201);
    expect(r.body.isPublished).toBe(false);
  });

  it('mulai >= selesai → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...baseKuis, mulai: new Date(Date.now() + 60_000).toISOString(), selesai: new Date(Date.now() + 60_000).toISOString() });
    expect(r.status).toBe(400);
  });

  it('publish tanpa soal → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`).set('Authorization', `Bearer ${token}`)
      .send({ ...baseKuis, mulai: new Date(Date.now() - 60_000).toISOString(), selesai: new Date(Date.now() + 60 * 60_000).toISOString() });
    const r = await request(app)
      .patch(`/dosen/kuis/${c.body.id}`).set('Authorization', `Bearer ${token}`)
      .send({ isPublished: true });
    expect(r.status).toBe(400);
  });

  it('tambah soal + publish + delete (no attempt)', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`).set('Authorization', `Bearer ${token}`)
      .send({ ...baseKuis, mulai: new Date(Date.now() - 60_000).toISOString(), selesai: new Date(Date.now() + 60 * 60_000).toISOString() });
    const kuisId = c.body.id;

    const soal = await request(app)
      .post(`/dosen/kuis/${kuisId}/soal`).set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: '1+1 = ?', opsi: ['1', '2', '3'], jawaban: 1, bobot: 2 });
    expect(soal.status).toBe(201);

    const pub = await request(app)
      .patch(`/dosen/kuis/${kuisId}`).set('Authorization', `Bearer ${token}`)
      .send({ isPublished: true });
    expect(pub.body.isPublished).toBe(true);

    const del = await request(app).delete(`/dosen/kuis/${kuisId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it('jawaban index melebihi opsi → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`).set('Authorization', `Bearer ${token}`)
      .send({ ...baseKuis, mulai: new Date(Date.now() - 60_000).toISOString(), selesai: new Date(Date.now() + 60 * 60_000).toISOString() });
    const r = await request(app)
      .post(`/dosen/kuis/${c.body.id}/soal`).set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: 'X?', opsi: ['a', 'b'], jawaban: 5 });
    expect(r.status).toBe(400);
  });
});

describe('Mahasiswa kerjakan kuis', () => {
  async function createPublishedKuis() {
    const token = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`).set('Authorization', `Bearer ${token}`)
      .send({ ...baseKuis, mulai: new Date(Date.now() - 60_000).toISOString(), selesai: new Date(Date.now() + 60 * 60_000).toISOString() });
    const kuisId = c.body.id;
    const s1 = await request(app).post(`/dosen/kuis/${kuisId}/soal`).set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: '1+1 = ?', opsi: ['1', '2', '3'], jawaban: 1, bobot: 2 });
    const s2 = await request(app).post(`/dosen/kuis/${kuisId}/soal`).set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: 'Capital Indonesia?', opsi: ['Bandung', 'Jakarta', 'Surabaya'], jawaban: 1, bobot: 3 });
    await request(app).patch(`/dosen/kuis/${kuisId}`).set('Authorization', `Bearer ${token}`).send({ isPublished: true });
    return { kuisId, soal1: s1.body.id, soal2: s2.body.id };
  }

  it('mahasiswa list kuis → muncul yang published dari kelasnya', async () => {
    await setupAcceptedKrs();
    await createPublishedKuis();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/kuis').set('Authorization', `Bearer ${token}`);
    expect(r.body.items.length).toBe(1);
    expect(r.body.items[0].kelas.kodeMK).toBeTruthy();
  });

  it('mahasiswa bukan peserta → start 403', async () => {
    const { kuisId } = await createPublishedKuis();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post(`/mahasiswa/kuis/${kuisId}/start`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('start → save → submit → auto-grade', async () => {
    await setupAcceptedKrs();
    const { kuisId, soal1, soal2 } = await createPublishedKuis();
    const token = await loginAs(request(app), f.mahasiswa.nim);

    const start = await request(app).post(`/mahasiswa/kuis/${kuisId}/start`).set('Authorization', `Bearer ${token}`);
    expect(start.status).toBe(200);
    expect(start.body.soal.length).toBe(2);
    // Jawaban tidak dibocorkan ke client saat start
    expect(start.body.soal[0]).not.toHaveProperty('jawaban');

    // Save progress (1 benar, 1 salah)
    await request(app).patch(`/mahasiswa/kuis/${kuisId}/jawaban`).set('Authorization', `Bearer ${token}`)
      .send({ jawaban: { [soal1]: 1, [soal2]: 0 } });

    const submit = await request(app).post(`/mahasiswa/kuis/${kuisId}/submit`).set('Authorization', `Bearer ${token}`).send({});
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('submit');
    expect(submit.body.maxSkor).toBe(5); // 2 + 3
    expect(submit.body.skor).toBe(2);    // hanya soal1 benar
    expect(submit.body.persen).toBe(40);
  });

  it('submit dua kali → 400', async () => {
    await setupAcceptedKrs();
    const { kuisId, soal1 } = await createPublishedKuis();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post(`/mahasiswa/kuis/${kuisId}/start`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/mahasiswa/kuis/${kuisId}/submit`).set('Authorization', `Bearer ${token}`).send({ jawaban: { [soal1]: 1 } });
    const r = await request(app).post(`/mahasiswa/kuis/${kuisId}/submit`).set('Authorization', `Bearer ${token}`).send({});
    expect(r.status).toBe(400);
  });

  it('hasil setelah submit reveal jawaban benar', async () => {
    await setupAcceptedKrs();
    const { kuisId, soal1, soal2 } = await createPublishedKuis();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post(`/mahasiswa/kuis/${kuisId}/start`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/mahasiswa/kuis/${kuisId}/submit`).set('Authorization', `Bearer ${token}`)
      .send({ jawaban: { [soal1]: 1, [soal2]: 1 } });
    const h = await request(app).get(`/mahasiswa/kuis/${kuisId}/hasil`).set('Authorization', `Bearer ${token}`);
    expect(h.body.skor).toBe(5);
    expect(h.body.soal[0].jawabanBenar).toBeDefined();
  });
});

describe('Dosen lihat hasil', () => {
  it('list peserta + attempt status', async () => {
    await setupAcceptedKrs();
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const c = await request(app).post(`/dosen/kelas/${f.kelas1.id}/kuis`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ ...baseKuis, mulai: new Date(Date.now() - 60_000).toISOString(), selesai: new Date(Date.now() + 60 * 60_000).toISOString() });
    await request(app).post(`/dosen/kuis/${c.body.id}/soal`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ pertanyaan: 'X?', opsi: ['a', 'b'], jawaban: 0 });
    await request(app).patch(`/dosen/kuis/${c.body.id}`).set('Authorization', `Bearer ${dosenToken}`).send({ isPublished: true });

    const r = await request(app).get(`/dosen/kuis/${c.body.id}/hasil`).set('Authorization', `Bearer ${dosenToken}`);
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBe(1); // ada 1 peserta (mahasiswa) — belum kerjakan
    expect(r.body.items[0].attempt).toBeNull();
  });
});

describe('RBAC kuis', () => {
  it('mahasiswa tidak boleh akses dosen endpoint', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/kuis`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...baseKuis, mulai: new Date().toISOString(), selesai: new Date(Date.now() + 60_000).toISOString() });
    expect(r.status).toBe(403);
  });
});
