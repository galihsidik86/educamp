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

async function buatPeriode(extra: Partial<{ batasIpk: number | null; batasSks: number | null; isPendaftaranBuka: boolean }> = {}) {
  return prisma.periodeWisuda.create({
    data: {
      kode: '2026-1',
      nama: 'Wisuda Periode I 2026',
      tanggal: new Date('2026-09-15'),
      isPendaftaranBuka: extra.isPendaftaranBuka ?? true,
      batasIpk: extra.batasIpk ?? 2.0,
      batasSks: extra.batasSks ?? null,
    },
  });
}

async function setLulusSkripsi() {
  await prisma.skripsi.create({
    data: {
      mahasiswaId: f.mahasiswa.id,
      judul: 'Skripsi judul yang cukup panjang untuk validasi',
      status: 'lulus',
      nilaiHuruf: 'A',
      tanggalDisetujui: new Date('2026-01-01'),
      tanggalSidang: new Date('2026-05-01'),
    },
  });
}

async function tambahNilai(huruf: string, sks: number) {
  // Buat krs+nilai finalized untuk mahasiswa
  const krs = await prisma.krs.create({
    data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
  });
  await prisma.nilai.create({
    data: { krsId: krs.id, mahasiswaId: f.mahasiswa.id, status: 'finalized', nilaiHuruf: huruf, bobot: huruf === 'A' ? 4 : huruf === 'E' ? 0 : 3 },
  });
  void sks; // sks dari MK (kelas1 → mk1)
}

describe('Periode Wisuda CRUD (akademik)', () => {
  it('akademik create + edit + delete (saat belum dipakai)', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app)
      .post('/akademik/periode-wisuda')
      .set('Authorization', `Bearer ${token}`)
      .send({ kode: '2026-1', nama: 'Wisuda 2026 I', tanggal: '2026-09-15', batasIpk: 2.0 });
    expect(c.status).toBe(201);

    const u = await request(app)
      .patch(`/akademik/periode-wisuda/${c.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isPendaftaranBuka: false });
    expect(u.body.isPendaftaranBuka).toBe(false);

    const d = await request(app).delete(`/akademik/periode-wisuda/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(d.status).toBe(204);
  });

  it('kode duplikat → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    await request(app).post('/akademik/periode-wisuda').set('Authorization', `Bearer ${token}`).send({ kode: '2026-1', nama: 'Wisuda Pertama 2026', tanggal: '2026-09-15' });
    const r = await request(app).post('/akademik/periode-wisuda').set('Authorization', `Bearer ${token}`).send({ kode: '2026-1', nama: 'Wisuda Kedua 2026', tanggal: '2026-10-15' });
    expect(r.status).toBe(409);
  });

  it('delete periode yang dipakai → 400', async () => {
    const p = await buatPeriode();
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${mhsToken}`).send({ periodeWisudaId: p.id });

    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).delete(`/akademik/periode-wisuda/${p.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(400);
  });
});

describe('Kelayakan mahasiswa', () => {
  it('belum lulus skripsi → layak false, tapi predikat tetap muncul', async () => {
    await tambahNilai('A', 3);
    await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/yudisium/kelayakan').set('Authorization', `Bearer ${token}`);
    expect(r.body.lulusSkripsi).toBe(false);
    expect(r.body.layak).toBe(false);
    expect(r.body.predikat).toBe('cumlaude');
  });

  it('ada nilai E → tidak layak', async () => {
    await setLulusSkripsi();
    await tambahNilai('E', 3);
    await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/yudisium/kelayakan').set('Authorization', `Bearer ${token}`);
    expect(r.body.adaE).toBe(true);
    expect(r.body.layak).toBe(false);
  });

  it('semua syarat terpenuhi → layak true, periode memenuhi syarat true', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    await buatPeriode({ batasIpk: 2.0, batasSks: null });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/yudisium/kelayakan').set('Authorization', `Bearer ${token}`);
    expect(r.body.layak).toBe(true);
    expect(r.body.periodeTersedia).toHaveLength(1);
    expect(r.body.periodeTersedia[0].memenuhiSyarat).toBe(true);
  });
});

describe('Daftar yudisium', () => {
  it('daftar valid → status pendaftaran + snapshot IPK + predikat', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const p = await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pendaftaran');
    expect(r.body.ipk).toBe(4);
    expect(r.body.predikat).toBe('cumlaude');
  });

  it('skripsi belum lulus → 400', async () => {
    await tambahNilai('A', 3);
    const p = await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/skripsi/i);
  });

  it('ada nilai E → 400', async () => {
    await setLulusSkripsi();
    await tambahNilai('E', 3);
    const p = await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/nilai E/i);
  });

  it('pendaftaran tutup → 400', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const p = await buatPeriode({ isPendaftaranBuka: false });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/ditutup/i);
  });

  it('duplikat daftar → 400', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const p = await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    const r = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/sudah terdaftar/i);
  });
});

describe('Cancel + akademik PATCH', () => {
  it('cancel saat pendaftaran → status batal', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const p = await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });

    const r = await request(app).delete(`/mahasiswa/yudisium/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(204);
    const y = await prisma.yudisium.findUnique({ where: { id: c.body.id } });
    expect(y!.status).toBe('batal');
  });

  it('cancel saat layak → 403', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const p = await buatPeriode();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${token}`).send({ periodeWisudaId: p.id });
    await prisma.yudisium.update({ where: { id: c.body.id }, data: { status: 'layak' } });

    const r = await request(app).delete(`/mahasiswa/yudisium/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('akademik PATCH status layak + noSkl + notif terkirim', async () => {
    await setLulusSkripsi();
    await tambahNilai('A', 3);
    const p = await buatPeriode();
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/yudisium/daftar').set('Authorization', `Bearer ${mhsToken}`).send({ periodeWisudaId: p.id });

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .patch(`/akademik/yudisium/${c.body.id}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ status: 'layak', noSkl: 'SKL/2026/001', catatan: 'Selamat' });
    expect(r.body.status).toBe('layak');
    expect(r.body.noSkl).toBe('SKL/2026/001');

    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'yudisium' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/layak/i);
  });
});
