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

async function buatBeasiswa(extra: Partial<{ syaratIpk: number | null; syaratAngkatanMin: number | null; syaratAngkatanMax: number | null; kuota: number | null; pendaftaranBuka: boolean }> = {}) {
  return prisma.beasiswa.create({
    data: {
      kode: 'TEST-2026-1',
      nama: 'Beasiswa Tes',
      penyelenggara: 'Tazkia Foundation',
      nominal: 5_000_000,
      pendaftaranBuka: extra.pendaftaranBuka ?? true,
      syaratIpk: extra.syaratIpk ?? null,
      syaratAngkatanMin: extra.syaratAngkatanMin ?? null,
      syaratAngkatanMax: extra.syaratAngkatanMax ?? null,
      kuota: extra.kuota ?? null,
    },
  });
}

async function tambahNilaiA() {
  const krs = await prisma.krs.create({
    data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
  });
  await prisma.nilai.create({
    data: { krsId: krs.id, mahasiswaId: f.mahasiswa.id, status: 'finalized', nilaiHuruf: 'A', bobot: 4 },
  });
}

const motivasiPanjang = 'Saya bermotivasi tinggi untuk fokus pada studi data science dan kontribusi pada riset AI dari prodi TI Tazkia. Selama ini saya telah berkontribusi dalam berbagai kegiatan organisasi dan akademik.';

describe('Master Beasiswa CRUD (akademik)', () => {
  it('akademik create + edit + delete (belum dipakai)', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app)
      .post('/akademik/beasiswa')
      .set('Authorization', `Bearer ${token}`)
      .send({ kode: 'TEST-2026-1', nama: 'Tes Beasiswa', penyelenggara: 'Tazkia', nominal: 5_000_000 });
    expect(c.status).toBe(201);
    expect(c.body.nominal).toBe(5_000_000);

    const u = await request(app).patch(`/akademik/beasiswa/${c.body.id}`).set('Authorization', `Bearer ${token}`).send({ pendaftaranBuka: false });
    expect(u.body.pendaftaranBuka).toBe(false);

    const d = await request(app).delete(`/akademik/beasiswa/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(d.status).toBe(204);
  });

  it('kode duplikat → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const body = { kode: 'TEST-2026-1', nama: 'Tes Beasiswa', penyelenggara: 'Tazkia', nominal: 5_000_000 };
    await request(app).post('/akademik/beasiswa').set('Authorization', `Bearer ${token}`).send(body);
    const r = await request(app).post('/akademik/beasiswa').set('Authorization', `Bearer ${token}`).send(body);
    expect(r.status).toBe(409);
  });

  it('delete beasiswa yang dipakai → 400', async () => {
    const b = await buatBeasiswa();
    await tambahNilaiA();
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${mhsToken}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });

    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).delete(`/akademik/beasiswa/${b.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(400);
  });
});

describe('Mahasiswa daftar beasiswa', () => {
  it('daftar valid → status diajukan + snapshot IPK', async () => {
    await tambahNilaiA();
    const b = await buatBeasiswa();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('diajukan');
    expect(r.body.ipkSaatDaftar).toBe(4);
  });

  it('motivasi terlalu pendek → 400', async () => {
    const b = await buatBeasiswa();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: 'Pendek' });
    expect(r.status).toBe(400);
  });

  it('IPK kurang dari syarat → 400', async () => {
    // mahasiswa belum punya nilai, IPK = 0
    const b = await buatBeasiswa({ syaratIpk: 3.0 });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/IPK/);
  });

  it('angkatan terlalu lama → 400', async () => {
    await tambahNilaiA();
    const b = await buatBeasiswa({ syaratAngkatanMin: 2030 });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/angkatan/i);
  });

  it('pendaftaran tutup → 400', async () => {
    await tambahNilaiA();
    const b = await buatBeasiswa({ pendaftaranBuka: false });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/ditutup/);
  });

  it('duplikat daftar → 400', async () => {
    await tambahNilaiA();
    const b = await buatBeasiswa();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    const r = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/sudah terdaftar/i);
  });

  it('cancel saat diajukan → status batal', async () => {
    await tambahNilaiA();
    const b = await buatBeasiswa();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${token}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    const r = await request(app).delete(`/mahasiswa/beasiswa/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(204);
    const dp = await prisma.pendaftaranBeasiswa.findUnique({ where: { id: c.body.id } });
    expect(dp!.status).toBe('batal');
  });
});

describe('Akademik validasi pendaftaran', () => {
  async function setup() {
    await tambahNilaiA();
    const b = await buatBeasiswa();
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${mhsToken}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    return { mhsToken, akademikToken, beasiswaId: b.id, pendaftaranId: c.body.id };
  }

  it('PATCH status diterima + notif terkirim', async () => {
    const { akademikToken, pendaftaranId } = await setup();
    const r = await request(app)
      .patch(`/akademik/beasiswa/pendaftaran/${pendaftaranId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ status: 'diterima', catatan: 'Selamat' });
    expect(r.body.status).toBe('diterima');

    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'beasiswa' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/diterima/i);
  });

  it('PATCH ke diterima saat kuota penuh → 400', async () => {
    // buat beasiswa dengan kuota 1, daftar 2 mahasiswa, terima 1, terima 2 → fail
    await tambahNilaiA();
    const b = await buatBeasiswa({ kuota: 1 });
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c1 = await request(app).post('/mahasiswa/beasiswa/daftar').set('Authorization', `Bearer ${mhsToken}`).send({ beasiswaId: b.id, motivasi: motivasiPanjang });

    // buat mahasiswa lain via direct prisma
    const pw = await import('../../src/lib/password.js').then((m) => m.hashPassword('password123'));
    const otherU = await prisma.user.create({
      data: {
        email: 'mhs-besar@test.id', passwordHash: pw, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000050', nama: 'Mhs Besar', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
      include: { mahasiswa: true },
    });
    const c2 = await prisma.pendaftaranBeasiswa.create({
      data: { mahasiswaId: otherU.mahasiswa!.id, beasiswaId: b.id, motivasi: motivasiPanjang, ipkSaatDaftar: 3.5, semesterSaatDaftar: '20251' },
    });

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const ok = await request(app).patch(`/akademik/beasiswa/pendaftaran/${c1.body.id}`).set('Authorization', `Bearer ${akademikToken}`).send({ status: 'diterima' });
    expect(ok.body.status).toBe('diterima');

    const r = await request(app).patch(`/akademik/beasiswa/pendaftaran/${c2.id}`).set('Authorization', `Bearer ${akademikToken}`).send({ status: 'diterima' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/kuota/i);
  });
});
