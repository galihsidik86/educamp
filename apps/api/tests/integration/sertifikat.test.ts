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

describe('Akademik create sertifikat manual', () => {
  it('POST sertifikat → auto-generate nomor + token', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${token}`).send({
      mahasiswaId: f.mahasiswa.id,
      jenis: 'workshop',
      judul: 'Workshop Pemrograman Lanjut',
      deskripsi: 'Telah mengikuti workshop pemrograman dengan baik.',
      periode: 'Ganjil 2025/2026',
    });
    expect(r.status).toBe(201);
    expect(r.body.nomorSertifikat).toMatch(/^SRT\/WORKSHOP\/\d{4}\/\d{4}$/);
    expect(r.body.verifikasiToken).toBeTruthy();
    expect(r.body.status).toBe('terbit');
  });

  it('nomor sertifikat increment per jenis', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const body = {
      mahasiswaId: f.mahasiswa.id,
      jenis: 'workshop' as const,
      judul: 'Workshop Test 1',
    };
    const r1 = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${token}`).send(body);
    const r2 = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${token}`).send({ ...body, judul: 'Workshop Test 2' });
    const nomor1 = r1.body.nomorSertifikat.split('/').pop();
    const nomor2 = r2.body.nomorSertifikat.split('/').pop();
    expect(Number(nomor2)).toBe(Number(nomor1) + 1);
  });

  it('mahasiswa tidak ditemukan → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${token}`).send({
      mahasiswaId: '00000000-0000-0000-0000-000000000000',
      jenis: 'workshop',
      judul: 'Mhs tidak ada',
    });
    expect(r.status).toBe(400);
  });

  it('judul terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${token}`).send({
      mahasiswaId: f.mahasiswa.id, jenis: 'workshop', judul: 'X',
    });
    expect(r.status).toBe(400);
  });
});

describe('Auto-issue saat KKN selesai', () => {
  it('PATCH KKN status → selesai → sertifikat KKN otomatis terbit + notif mahasiswa', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const kkn = await prisma.kkn.create({
      data: {
        mahasiswaId: f.mahasiswa.id, periode: '2026 Ganjil',
        lokasi: 'Desa Cikeas Udik', desa: 'Cikeas Udik', kecamatan: 'Gunung Putri', kabupaten: 'Bogor',
        status: 'berjalan',
      },
    });
    const r = await request(app).patch(`/akademik/kkn/${kkn.id}`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'selesai', nilai: 'A' });
    expect(r.status).toBe(200);

    await new Promise((res) => setTimeout(res, 800));
    const cert = await prisma.sertifikatDigital.findFirst({ where: { sumberEntity: 'kkn', sumberId: kkn.id } });
    expect(cert).toBeTruthy();
    expect(cert!.jenis).toBe('kkn');
    expect(cert!.judul).toMatch(/KKN/i);
    expect(cert!.status).toBe('terbit');

    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'sertifikat' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('idempotent: PATCH selesai dua kali → hanya 1 sertifikat', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const kkn = await prisma.kkn.create({
      data: {
        mahasiswaId: f.mahasiswa.id, periode: '2026 Ganjil',
        lokasi: 'Lokasi', desa: 'X', kecamatan: 'Y', kabupaten: 'Z',
        status: 'berjalan',
      },
    });
    await request(app).patch(`/akademik/kkn/${kkn.id}`).set('Authorization', `Bearer ${akdToken}`).send({ status: 'selesai' });
    await new Promise((res) => setTimeout(res, 200));
    // Set non-selesai lalu selesai lagi untuk uji idempotensi via helper sumberEntity+sumberId
    await prisma.kkn.update({ where: { id: kkn.id }, data: { status: 'berjalan' } });
    await request(app).patch(`/akademik/kkn/${kkn.id}`).set('Authorization', `Bearer ${akdToken}`).send({ status: 'selesai' });
    await new Promise((res) => setTimeout(res, 200));

    const certs = await prisma.sertifikatDigital.findMany({ where: { sumberEntity: 'kkn', sumberId: kkn.id } });
    expect(certs).toHaveLength(1);
  });
});

describe('Auto-issue saat MBKM selesai', () => {
  it('PATCH MBKM status → selesai → sertifikat MBKM terbit', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const mbkm = await prisma.mbkm.create({
      data: {
        mahasiswaId: f.mahasiswa.id,
        jenis: 'studi_independen',
        namaProgram: 'Bangkit Academy',
        mitra: 'Google/GoTo/Tokopedia',
        periode: '20251',
        status: 'berjalan',
      },
    });
    await request(app).patch(`/akademik/mbkm/${mbkm.id}`).set('Authorization', `Bearer ${akdToken}`).send({ status: 'selesai' });

    await new Promise((res) => setTimeout(res, 300));
    const cert = await prisma.sertifikatDigital.findFirst({ where: { sumberEntity: 'mbkm', sumberId: mbkm.id } });
    expect(cert).toBeTruthy();
    expect(cert!.jenis).toBe('mbkm');
  });
});

describe('Mahasiswa lihat sertifikat sendiri', () => {
  it('GET /mahasiswa/sertifikat → hanya milik sendiri + status terbit', async () => {
    await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: f.mahasiswa.id, jenis: 'workshop',
        judul: 'Workshop Tes', nomorSertifikat: 'SRT/TEST/2026/0001',
        verifikasiToken: 'TOKEN_PUBLIC_TES',
      },
    });
    const dicabut = await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: f.mahasiswa.id, jenis: 'workshop',
        judul: 'Workshop Dicabut', nomorSertifikat: 'SRT/TEST/2026/0002',
        verifikasiToken: 'TOKEN_DICABUT_TES',
        status: 'dicabut',
      },
    });

    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/sertifikat').set('Authorization', `Bearer ${token}`);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].judul).toBe('Workshop Tes');
    void dicabut;
  });

  it('detail sertifikat sendiri', async () => {
    const c = await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: f.mahasiswa.id, jenis: 'workshop',
        judul: 'Workshop Test Detail', nomorSertifikat: 'SRT/TEST/2026/0010',
        verifikasiToken: 'TOKEN_DETAIL_TES',
      },
    });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get(`/mahasiswa/sertifikat/${c.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.body.judul).toBe('Workshop Test Detail');
    expect(r.body.mahasiswa.nim).toBe(f.mahasiswa.nim);
  });

  it('mahasiswa lain tidak boleh akses → 403', async () => {
    const c = await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: f.mahasiswa.id, jenis: 'workshop',
        judul: 'Workshop Privat', nomorSertifikat: 'SRT/TEST/2026/0011',
        verifikasiToken: 'TOKEN_PRIVAT_TES',
      },
    });
    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'mhs2@test.id', passwordHash: h, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000002', nama: 'Mhs 2', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
    });
    const otherToken = await loginAs(request(app), '9999000002');
    const r = await request(app).get(`/mahasiswa/sertifikat/${c.id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(r.status).toBe(403);
  });
});

describe('Akademik cabut + aktifkan + regen-token', () => {
  it('cabut sertifikat → status dicabut + alasan tersimpan', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${akdToken}`).send({
      mahasiswaId: f.mahasiswa.id, jenis: 'panitia', judul: 'Panitia Wisuda 2026',
    });
    const r = await request(app).post(`/akademik/sertifikat/${c.body.id}/cabut`).set('Authorization', `Bearer ${akdToken}`)
      .send({ alasan: 'Terbukti palsu data kepanitiaan' });
    expect(r.body.status).toBe('dicabut');
    expect(r.body.alasanCabut).toMatch(/palsu/i);
  });

  it('cabut yang sudah dicabut → 400', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${akdToken}`).send({
      mahasiswaId: f.mahasiswa.id, jenis: 'panitia', judul: 'Panitia Test',
    });
    await request(app).post(`/akademik/sertifikat/${c.body.id}/cabut`).set('Authorization', `Bearer ${akdToken}`)
      .send({ alasan: 'Alasan dummy untuk uji idempoten cabut' });
    const r = await request(app).post(`/akademik/sertifikat/${c.body.id}/cabut`).set('Authorization', `Bearer ${akdToken}`)
      .send({ alasan: 'Alasan dummy untuk uji idempoten cabut lagi' });
    expect(r.status).toBe(400);
  });

  it('aktifkan kembali sertifikat dicabut', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${akdToken}`).send({
      mahasiswaId: f.mahasiswa.id, jenis: 'panitia', judul: 'Panitia X',
    });
    await request(app).post(`/akademik/sertifikat/${c.body.id}/cabut`).set('Authorization', `Bearer ${akdToken}`)
      .send({ alasan: 'Salah cabut' });
    const r = await request(app).post(`/akademik/sertifikat/${c.body.id}/aktifkan`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.status).toBe('terbit');
    expect(r.body.alasanCabut).toBeNull();
  });

  it('regen-token → token lama invalid', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${akdToken}`).send({
      mahasiswaId: f.mahasiswa.id, jenis: 'workshop', judul: 'Workshop Regen Token',
    });
    const tokenLama = c.body.verifikasiToken;
    const r = await request(app).post(`/akademik/sertifikat/${c.body.id}/regen-token`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.verifikasiToken).toBeTruthy();
    expect(r.body.verifikasiToken).not.toBe(tokenLama);
    const pub = await request(app).get(`/verifikasi/sertifikat/${tokenLama}`);
    expect(pub.status).toBe(404);
  });
});

describe('Public endpoint verifikasi sertifikat', () => {
  it('PUBLIK (no auth) → return data sertifikat', async () => {
    const c = await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: f.mahasiswa.id, jenis: 'kkn',
        judul: 'Sertifikat KKN 2026 Ganjil',
        nomorSertifikat: 'SRT/KKN/2026/0100',
        verifikasiToken: 'PUBLIC_VERIF_TOKEN_OK',
        periode: '2026 Ganjil',
      },
    });
    const r = await request(app).get('/verifikasi/sertifikat/PUBLIC_VERIF_TOKEN_OK');
    expect(r.status).toBe(200);
    expect(r.body.valid).toBe(true);
    expect(r.body.sertifikat.nomorSertifikat).toBe('SRT/KKN/2026/0100');
    expect(r.body.penerima.nim).toBe(f.mahasiswa.nim);
    void c;
  });

  it('sertifikat dicabut → 404', async () => {
    await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: f.mahasiswa.id, jenis: 'workshop',
        judul: 'Cabut', nomorSertifikat: 'SRT/X/2026/0001',
        verifikasiToken: 'TOKEN_CABUT_PUBLIC',
        status: 'dicabut',
      },
    });
    const r = await request(app).get('/verifikasi/sertifikat/TOKEN_CABUT_PUBLIC');
    expect(r.status).toBe(404);
  });

  it('format token invalid → 404', async () => {
    const r = await request(app).get('/verifikasi/sertifikat/<bad>');
    expect(r.status).toBe(404);
  });
});

describe('RBAC sertifikat', () => {
  it('mahasiswa tidak boleh create sertifikat', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/akademik/sertifikat').set('Authorization', `Bearer ${token}`).send({
      mahasiswaId: f.mahasiswa.id, jenis: 'workshop', judul: 'Sertifikat Sendiri',
    });
    expect(r.status).toBe(403);
  });
});
