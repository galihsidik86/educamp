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

async function buatPeriodeDanYudisium(status: 'pendaftaran' | 'wisuda' = 'pendaftaran') {
  const periode = await prisma.periodeWisuda.create({
    data: { kode: '2026-1', nama: 'Wisuda Periode I 2026', tanggal: new Date('2026-09-15') },
  });
  const y = await prisma.yudisium.create({
    data: {
      mahasiswaId: f.mahasiswa.id,
      periodeWisudaId: periode.id,
      status,
      ipk: 3.75,
      sksLulus: 144,
      predikat: 'cumlaude',
      noIjazah: 'IJZ/2026/001',
      noSkl: 'SKL/2026/001',
      tanggalLulus: new Date('2026-09-15'),
    },
  });
  return { periode, y };
}

describe('Token verifikasi ijazah', () => {
  it('PATCH status ke wisuda → token auto-generated', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const { y } = await buatPeriodeDanYudisium('layak' as any);
    const r = await request(app).patch(`/akademik/yudisium/${y.id}`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'wisuda' });
    expect(r.body.status).toBe('wisuda');
    expect(r.body.verifikasiToken).toBeTruthy();
    expect(r.body.verifikasiToken.length).toBeGreaterThanOrEqual(12);
  });

  it('PATCH status non-wisuda → token tidak di-generate', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const { y } = await buatPeriodeDanYudisium();
    const r = await request(app).patch(`/akademik/yudisium/${y.id}`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'verifikasi' });
    expect(r.body.verifikasiToken).toBeNull();
  });

  it('PATCH ke wisuda kedua kali → token TIDAK berubah', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const { y } = await buatPeriodeDanYudisium('wisuda');
    // Set token awal
    await prisma.yudisium.update({ where: { id: y.id }, data: { verifikasiToken: 'INITIAL_TOKEN' } });
    const r = await request(app).patch(`/akademik/yudisium/${y.id}`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'wisuda', noIjazah: 'IJZ/2026/REV' });
    expect(r.body.verifikasiToken).toBe('INITIAL_TOKEN');
  });

  it('regen-token → token lama invalidated', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const { y } = await buatPeriodeDanYudisium('wisuda');
    await prisma.yudisium.update({ where: { id: y.id }, data: { verifikasiToken: 'OLD_TOKEN_12' } });

    const r = await request(app).post(`/akademik/yudisium/${y.id}/regen-token`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.verifikasiToken).toBeTruthy();
    expect(r.body.verifikasiToken).not.toBe('OLD_TOKEN_12');

    // Endpoint publik tolak token lama
    const pub = await request(app).get('/verifikasi/OLD_TOKEN_12');
    expect(pub.status).toBe(404);
  });
});

describe('Public endpoint verifikasi ijazah', () => {
  it('endpoint PUBLIK (tanpa auth) — return data lulusan untuk token valid', async () => {
    const { y } = await buatPeriodeDanYudisium('wisuda');
    await prisma.yudisium.update({ where: { id: y.id }, data: { verifikasiToken: 'VALID_TOKEN_12' } });

    // Tanpa Authorization header
    const r = await request(app).get('/verifikasi/VALID_TOKEN_12');
    expect(r.status).toBe(200);
    expect(r.body.valid).toBe(true);
    expect(r.body.lulusan.nim).toBe(f.mahasiswa.nim);
    expect(r.body.lulusan.nama).toBe(f.mahasiswa.nama);
    expect(r.body.pendidikan.ipk).toBe(3.75);
    expect(r.body.pendidikan.predikat).toBe('cumlaude');
    expect(r.body.ijazah.noIjazah).toBe('IJZ/2026/001');
  });

  it('TIDAK expose data sensitif (alamat/email/telepon/catatan)', async () => {
    const { y } = await buatPeriodeDanYudisium('wisuda');
    await prisma.yudisium.update({ where: { id: y.id }, data: {
      verifikasiToken: 'TOKEN_SAFE_LONG_ENOUGH',
      catatan: 'Catatan internal akademik',
    } });
    await prisma.mahasiswa.update({ where: { id: f.mahasiswa.id }, data: {
      alamat: 'Jalan Rahasia', telepon: '08-RAHASIA',
    } });

    const r = await request(app).get('/verifikasi/TOKEN_SAFE_LONG_ENOUGH');
    expect(r.body.lulusan.alamat).toBeUndefined();
    expect(r.body.lulusan.telepon).toBeUndefined();
    expect(r.body.lulusan.email).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain('Rahasia');
    expect(JSON.stringify(r.body)).not.toContain('Catatan internal');
  });

  it('status bukan wisuda → 404 (belum dilulus-resmi-kan)', async () => {
    const { y } = await buatPeriodeDanYudisium();
    await prisma.yudisium.update({ where: { id: y.id }, data: { verifikasiToken: 'NOT_GRADUATED_X' } });
    const r = await request(app).get('/verifikasi/NOT_GRADUATED_X');
    expect(r.status).toBe(404);
  });

  it('token tidak ada → 404', async () => {
    const r = await request(app).get('/verifikasi/TOKEN_TIDAK_ADA_BENERAN');
    expect(r.status).toBe(404);
  });

  it('format token invalid → 404 (cegah probing)', async () => {
    const r = await request(app).get('/verifikasi/<script>alert(1)</script>');
    expect(r.status).toBe(404);
  });
});

describe('RBAC verifikasi', () => {
  it('mahasiswa tidak boleh regen-token', async () => {
    const { y } = await buatPeriodeDanYudisium('wisuda');
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post(`/akademik/yudisium/${y.id}/regen-token`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});
