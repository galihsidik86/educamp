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

const cutiBody = {
  jenis: 'cuti' as const,
  alasan: 'Sakit panjang yang memerlukan istirahat satu semester sesuai rekomendasi dokter.',
};

describe('Mahasiswa ajukan mutasi', () => {
  it('cuti valid → 201 + notif ke akademik', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send(cutiBody);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('diajukan');
    expect(r.body.statusSebelum).toBe('aktif');
    expect(r.body.statusSesudah).toBe('cuti');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.akademikUser.id, type: 'mutasi' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('alasan terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send({ ...cutiBody, alasan: 'X' });
    expect(r.status).toBe(400);
  });

  it('cuti dari status non-aktif → 400', async () => {
    await prisma.mahasiswa.update({ where: { id: f.mahasiswa.id }, data: { status: 'cuti' } });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send(cutiBody);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/aktif/i);
  });

  it('aktif_kembali dari status aktif → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'aktif_kembali', alasan: 'Sudah pulih, ingin aktif kembali untuk semester depan.' });
    expect(r.status).toBe(400);
  });

  it('aktif_kembali dari status cuti → 201', async () => {
    await prisma.mahasiswa.update({ where: { id: f.mahasiswa.id }, data: { status: 'cuti' } });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'aktif_kembali', alasan: 'Sudah pulih dan siap melanjutkan studi semester depan.' });
    expect(r.status).toBe(201);
    expect(r.body.statusSesudah).toBe('aktif');
  });

  it('mahasiswa lulus tidak boleh ajukan mutasi', async () => {
    await prisma.mahasiswa.update({ where: { id: f.mahasiswa.id }, data: { status: 'lulus' } });
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send(cutiBody);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/lulus/i);
  });

  it('pindah prodi tanpa prodi tujuan → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'pindah_prodi', alasan: 'Ingin pindah prodi karena minat lebih sesuai dengan target karir.' });
    expect(r.status).toBe(400);
  });

  it('double request → 400 (sudah punya pending)', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send(cutiBody);
    const r = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send(cutiBody);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/belum diproses/i);
  });

  it('cancel saat diajukan → status batal', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${token}`).send(cutiBody);
    const r = await request(app).delete(`/mahasiswa/mutasi/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(204);
    const after = await prisma.mutasiMahasiswa.findUnique({ where: { id: c.body.id } });
    expect(after!.status).toBe('batal');
  });
});

describe('Akademik proses mutasi', () => {
  async function ajukanCuti() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${mhsToken}`).send(cutiBody);
    return c.body.id;
  }

  it('approve cuti → status mahasiswa berubah ke cuti atomik', async () => {
    const id = await ajukanCuti();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .patch(`/akademik/mutasi/${id}/respond`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'disetujui', catatanAkademik: 'Disetujui dengan kondisi melapor tiap akhir bulan.' });
    expect(r.body.status).toBe('disetujui');
    expect(r.body.diprosesPada).not.toBeNull();

    const mhs = await prisma.mahasiswa.findUnique({ where: { id: f.mahasiswa.id } });
    expect(mhs!.status).toBe('cuti');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'mutasi' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/disetujui/i);
  });

  it('reject → status mahasiswa tetap', async () => {
    const id = await ajukanCuti();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .patch(`/akademik/mutasi/${id}/respond`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'ditolak', catatanAkademik: 'Surat rekomendasi belum lengkap.' });
    expect(r.body.status).toBe('ditolak');
    const mhs = await prisma.mahasiswa.findUnique({ where: { id: f.mahasiswa.id } });
    expect(mhs!.status).toBe('aktif');
  });

  it('approve race condition: status mahasiswa berubah di luar → 400', async () => {
    const id = await ajukanCuti();
    // Status mahasiswa berubah di luar (mis. update manual)
    await prisma.mahasiswa.update({ where: { id: f.mahasiswa.id }, data: { status: 'cuti' } });
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .patch(`/akademik/mutasi/${id}/respond`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'disetujui' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/berubah/i);
  });

  it('pindah prodi disetujui → prodi mahasiswa berpindah', async () => {
    // buat prodi tujuan
    const targetProdi = await prisma.prodi.create({
      data: { kode: '55301T', nama: 'SI Test', jenjang: 's1', fakultasId: (await prisma.fakultas.findFirst())!.id },
    });
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app)
      .post('/mahasiswa/mutasi').set('Authorization', `Bearer ${mhsToken}`)
      .send({ jenis: 'pindah_prodi', prodiTujuanId: targetProdi.id, alasan: 'Minat lebih sesuai dengan rencana karir saya ke depan.' });
    expect(c.status).toBe(201);

    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await request(app).patch(`/akademik/mutasi/${c.body.id}/respond`).set('Authorization', `Bearer ${akdToken}`).send({ status: 'disetujui' });

    const after = await prisma.mahasiswa.findUnique({ where: { id: f.mahasiswa.id } });
    expect(after!.prodiId).toBe(targetProdi.id);
    expect(after!.status).toBe('aktif');
  });

  it('filter status', async () => {
    await ajukanCuti();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/mutasi?status=diajukan').set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.items).toHaveLength(1);
  });
});

describe('RBAC mutasi', () => {
  it('mahasiswa tidak boleh akses endpoint akademik', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/akademik/mutasi').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('mahasiswa tidak boleh batalkan mutasi mahasiswa lain', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/mutasi').set('Authorization', `Bearer ${mhsToken}`).send(cutiBody);

    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'mhs2@test.id', passwordHash: h, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000002', nama: 'Mhs 2', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
    });
    const otherToken = await loginAs(request(app), '9999000002');
    const r = await request(app).delete(`/mahasiswa/mutasi/${c.body.id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(r.status).toBe(403);
  });
});
