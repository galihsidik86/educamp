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
  // Approve KRS Aisyah ke kelas1 supaya jadi peserta EDOM
  await prisma.krs.create({
    data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
  });
});

async function setupKuesionerAktif(jumlahAspek = 3) {
  const token = await loginAs(request(app), f.akademikUser.email);
  const created = await request(app)
    .post('/akademik/edom/kuesioner')
    .set('Authorization', `Bearer ${token}`)
    .send({ judul: 'EDOM Test', semesterId: f.semester.id });
  const kuesionerId = created.body.id;
  for (let i = 1; i <= jumlahAspek; i++) {
    await request(app)
      .post(`/akademik/edom/kuesioner/${kuesionerId}/aspek`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: `Aspek nomor ${i}` });
  }
  await request(app)
    .patch(`/akademik/edom/kuesioner/${kuesionerId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isAktif: true });
  return { kuesionerId, akademikToken: token };
}

describe('EDOM kuesioner CRUD', () => {
  it('akademik create + tambah aspek + aktifkan', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app)
      .post('/akademik/edom/kuesioner')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'EDOM 2026 Ganjil', semesterId: f.semester.id });
    expect(c.status).toBe(201);

    const a1 = await request(app)
      .post(`/akademik/edom/kuesioner/${c.body.id}/aspek`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: 'Materi jelas' });
    expect(a1.body.urutan).toBe(1);

    const a2 = await request(app)
      .post(`/akademik/edom/kuesioner/${c.body.id}/aspek`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pertanyaan: 'Disiplin' });
    expect(a2.body.urutan).toBe(2);

    const up = await request(app)
      .patch(`/akademik/edom/kuesioner/${c.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAktif: true });
    expect(up.body.isAktif).toBe(true);
  });

  it('aktifkan kuesioner baru → kuesioner lama di semester sama otomatis nonaktif', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const old = await request(app)
      .post('/akademik/edom/kuesioner')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Lama', semesterId: f.semester.id });
    await request(app)
      .patch(`/akademik/edom/kuesioner/${old.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAktif: true });

    const baru = await request(app)
      .post('/akademik/edom/kuesioner')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Baru', semesterId: f.semester.id });
    await request(app)
      .patch(`/akademik/edom/kuesioner/${baru.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isAktif: true });

    const lama = await prisma.edomKuesioner.findUnique({ where: { id: old.body.id } });
    const masihAktif = await prisma.edomKuesioner.findUnique({ where: { id: baru.body.id } });
    expect(lama!.isAktif).toBe(false);
    expect(masihAktif!.isAktif).toBe(true);
  });

  it('hapus aspek setelah ada jawaban → cascade jawaban', async () => {
    const { kuesionerId, akademikToken } = await setupKuesionerAktif(1);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const detail = await request(app)
      .get(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`);
    const aspekId = detail.body.aspek[0].id;
    await request(app)
      .post(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ jawaban: [{ aspekId, nilai: 5 }] });
    expect(await prisma.edomJawaban.count()).toBe(1);

    const del = await request(app)
      .delete(`/akademik/edom/aspek/${aspekId}`)
      .set('Authorization', `Bearer ${akademikToken}`);
    expect(del.status).toBe(204);
    expect(await prisma.edomJawaban.count()).toBe(0);
    void kuesionerId;
  });
});

describe('EDOM submit mahasiswa', () => {
  it('mahasiswa lihat kelas dengan flag sudahDiisi', async () => {
    await setupKuesionerAktif(2);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/edom').set('Authorization', `Bearer ${mhsToken}`);
    expect(r.body.kuesioner).not.toBeNull();
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].sudahDiisi).toBe(false);
  });

  it('submit lengkap → tersimpan, kelas berikutnya jadi sudahDiisi', async () => {
    await setupKuesionerAktif(2);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const detail = await request(app)
      .get(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`);
    const r = await request(app)
      .post(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({
        jawaban: detail.body.aspek.map((a: any) => ({ aspekId: a.id, nilai: 4 })),
      });
    expect(r.status).toBe(200);

    const list = await request(app).get('/mahasiswa/edom').set('Authorization', `Bearer ${mhsToken}`);
    expect(list.body.items[0].sudahDiisi).toBe(true);
  });

  it('submit tidak lengkap → 400', async () => {
    await setupKuesionerAktif(3);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const detail = await request(app)
      .get(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`);
    const r = await request(app)
      .post(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ jawaban: [{ aspekId: detail.body.aspek[0].id, nilai: 5 }] });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/aspek/);
  });

  it('submit ulang → replace jawaban (idempotent), tetap 1 response', async () => {
    await setupKuesionerAktif(2);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const detail = await request(app)
      .get(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`);
    const body1 = { jawaban: detail.body.aspek.map((a: any) => ({ aspekId: a.id, nilai: 3 })) };
    const body2 = { jawaban: detail.body.aspek.map((a: any) => ({ aspekId: a.id, nilai: 5 })) };
    await request(app).post(`/mahasiswa/edom/${f.kelas1.id}`).set('Authorization', `Bearer ${mhsToken}`).send(body1);
    await request(app).post(`/mahasiswa/edom/${f.kelas1.id}`).set('Authorization', `Bearer ${mhsToken}`).send(body2);

    expect(await prisma.edomResponse.count()).toBe(1);
    const jawaban = await prisma.edomJawaban.findMany();
    expect(jawaban).toHaveLength(2);
    expect(jawaban.every((j) => j.nilai === 5)).toBe(true);
  });

  it('submit untuk kelas yang bukan KRS-nya → 400', async () => {
    await setupKuesionerAktif(1);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const detail = await request(app)
      .get(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`);
    const r = await request(app)
      .post(`/mahasiswa/edom/${f.kelas2.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ jawaban: [{ aspekId: detail.body.aspek[0].id, nilai: 4 }] });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/tidak terdaftar/i);
  });
});

describe('EDOM rekap akademik', () => {
  it('rata-rata per aspek + response rate dihitung benar', async () => {
    const { kuesionerId, akademikToken } = await setupKuesionerAktif(2);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const detail = await request(app)
      .get(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`);
    await request(app)
      .post(`/mahasiswa/edom/${f.kelas1.id}`)
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({
        jawaban: [
          { aspekId: detail.body.aspek[0].id, nilai: 5 },
          { aspekId: detail.body.aspek[1].id, nilai: 3 },
        ],
      });

    const rekap = await request(app)
      .get(`/akademik/edom/kuesioner/${kuesionerId}/rekap`)
      .set('Authorization', `Bearer ${akademikToken}`);
    expect(rekap.status).toBe(200);
    expect(rekap.body.items).toHaveLength(1);
    const k = rekap.body.items[0];
    expect(k.totalResponse).toBe(1);
    expect(k.peserta).toBe(1);
    expect(k.responseRate).toBe(100);
    expect(k.rataAgregat).toBe(4);
  });
});
