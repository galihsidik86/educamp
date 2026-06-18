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

const baseSertifikat = {
  jenis: 'bahasa' as const,
  nama: 'TOEFL ITP',
  penerbit: 'ETS Institutional',
  tanggalTerbit: '2025-06-15',
  level: 'internasional' as const,
  skor: '550',
};

const basePrestasi = {
  jenis: 'lomba_akademik' as const,
  nama: 'Juara 2 GEMASTIK 2024 — Pemrograman',
  penyelenggara: 'Kemdikbud',
  tanggal: '2024-10-01',
  level: 'nasional' as const,
  peran: 'Anggota Tim',
};

describe('Mahasiswa kelola sertifikasi', () => {
  it('CRUD valid + submit + workflow draft→diajukan', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);

    const c = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${token}`).send(baseSertifikat);
    expect(c.status).toBe(201);
    expect(c.body.status).toBe('draft');

    const upd = await request(app).patch(`/mahasiswa/sertifikasi/${c.body.id}`).set('Authorization', `Bearer ${token}`).send({ skor: '575' });
    expect(upd.body.skor).toBe('575');

    const submit = await request(app).post(`/mahasiswa/sertifikasi/${c.body.id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(submit.body.status).toBe('diajukan');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.akademikUser.id, type: 'skpi' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('nama terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${token}`).send({ ...baseSertifikat, nama: 'X' });
    expect(r.status).toBe(400);
  });

  it('edit setelah diverifikasi → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${token}`).send(baseSertifikat);
    await prisma.sertifikasi.update({ where: { id: c.body.id }, data: { status: 'diverifikasi' } });
    const r = await request(app).patch(`/mahasiswa/sertifikasi/${c.body.id}`).set('Authorization', `Bearer ${token}`).send({ skor: 'X' });
    expect(r.status).toBe(400);
  });

  it('mahasiswa lain tidak boleh edit', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${token}`).send(baseSertifikat);

    // mahasiswa kedua
    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'mhs2@test.id', passwordHash: h, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000002', nama: 'Mhs 2', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
    });
    const otherToken = await loginAs(request(app), '9999000002');
    const r = await request(app).patch(`/mahasiswa/sertifikasi/${c.body.id}`).set('Authorization', `Bearer ${otherToken}`).send({ skor: 'X' });
    expect(r.status).toBe(403);
  });
});

describe('Mahasiswa kelola prestasi', () => {
  it('CRUD + submit', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/prestasi').set('Authorization', `Bearer ${token}`).send(basePrestasi);
    expect(c.status).toBe(201);
    const submit = await request(app).post(`/mahasiswa/prestasi/${c.body.id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(submit.body.status).toBe('diajukan');
  });
});

describe('Akademik verifikasi sertifikat & prestasi', () => {
  async function ajukanSertifikat() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${mhsToken}`).send(baseSertifikat);
    await request(app).post(`/mahasiswa/sertifikasi/${c.body.id}/submit`).set('Authorization', `Bearer ${mhsToken}`);
    return c.body.id;
  }

  it('akademik approve → status diverifikasi + notif', async () => {
    const id = await ajukanSertifikat();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .patch(`/akademik/skpi/sertifikasi/${id}`)
      .set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'diverifikasi' });
    expect(r.body.status).toBe('diverifikasi');
    expect(r.body.diverifikasiOleh).not.toBeNull();

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'skpi' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/disetujui/i);
  });

  it('akademik reject → status ditolak + mahasiswa boleh edit lagi', async () => {
    const id = await ajukanSertifikat();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await request(app)
      .patch(`/akademik/skpi/sertifikasi/${id}`)
      .set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'ditolak', catatanVerifikator: 'Skor tidak sesuai bukti' });

    // mahasiswa edit setelah tolak
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const upd = await request(app).patch(`/mahasiswa/sertifikasi/${id}`).set('Authorization', `Bearer ${mhsToken}`).send({ skor: '600' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('draft'); // kembali ke draft
  });

  it('verifikasi item yang masih draft → 400', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${mhsToken}`).send(baseSertifikat);
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .patch(`/akademik/skpi/sertifikasi/${c.body.id}`)
      .set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'diverifikasi' });
    expect(r.status).toBe(400);
  });

  it('list pending hanya yang status=diajukan', async () => {
    await ajukanSertifikat();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/skpi/sertifikasi?status=diajukan').set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.items).toHaveLength(1);
  });
});

describe('SKPI data assembly (mahasiswa)', () => {
  it('hanya item diverifikasi yang muncul', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const s1 = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${mhsToken}`).send(baseSertifikat);
    // belum di-submit, masih draft

    const s2 = await request(app).post('/mahasiswa/sertifikasi').set('Authorization', `Bearer ${mhsToken}`)
      .send({ ...baseSertifikat, nama: 'MTCNA', penerbit: 'Mikrotik', jenis: 'kompetensi' });
    await request(app).post(`/mahasiswa/sertifikasi/${s2.body.id}/submit`).set('Authorization', `Bearer ${mhsToken}`);
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await request(app).patch(`/akademik/skpi/sertifikasi/${s2.body.id}`).set('Authorization', `Bearer ${akdToken}`).send({ status: 'diverifikasi' });

    const r = await request(app).get('/mahasiswa/skpi').set('Authorization', `Bearer ${mhsToken}`);
    expect(r.status).toBe(200);
    expect(r.body.mahasiswa.nim).toBe(f.mahasiswa.nim);
    expect(r.body.sertifikasi).toHaveLength(1);
    expect(r.body.sertifikasi[0].nama).toBe('MTCNA');
    expect(r.body.sertifikasi.find((s: any) => s.id === s1.body.id)).toBeUndefined();
  });
});

describe('RBAC SKPI', () => {
  it('mahasiswa tidak boleh akses endpoint akademik', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/akademik/skpi/sertifikasi').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});
