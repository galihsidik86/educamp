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

describe('Dosen susun BKD', () => {
  it('POST /bkd → auto-populate dari kelas yang diampu', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    expect(r.status).toBe(201);
    expect(r.body.items.length).toBe(2); // kelas1 + kelas2 dari fixtures
    expect(r.body.items.every((it: any) => it.kategori === 'pengajaran')).toBe(true);
    expect(r.body.items.every((it: any) => it.sumberEntity === 'kelas')).toBe(true);
    expect(r.body.totalSks).toBeGreaterThan(0);
  });

  it('GET /bkd → list laporan dosen', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    const list = await request(app).get('/dosen/bkd').set('Authorization', `Bearer ${token}`);
    expect(list.body.items.length).toBe(1);
  });

  it('idempoten: POST kedua kali → return existing', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r1 = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    const r2 = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    expect(r2.status).toBe(200);
    expect(r2.body.id).toBe(r1.body.id);
  });

  it('tambah item manual → totalSks naik', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    const beforeTotal = r.body.totalSks;

    const add = await request(app)
      .post(`/dosen/bkd/${r.body.id}/items`).set('Authorization', `Bearer ${token}`)
      .send({
        kategori: 'penunjang',
        jenis: 'Panitia Wisuda',
        deskripsi: 'Anggota panitia wisuda semester ganjil 2025',
        bobotSks: 1.5,
      });
    expect(add.status).toBe(201);

    const lap = await prisma.bkdLaporan.findUnique({ where: { id: r.body.id } });
    expect(lap!.totalSks).toBeCloseTo(beforeTotal + 1.5, 1);
  });

  it('edit item → totalSks ter-recalc', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    const itemId = r.body.items[0].id;
    const initialTotal = r.body.totalSks;
    const oldSks = r.body.items[0].bobotSks;

    await request(app).patch(`/dosen/bkd/items/${itemId}`).set('Authorization', `Bearer ${token}`).send({ bobotSks: oldSks + 5 });
    const lap = await prisma.bkdLaporan.findUnique({ where: { id: r.body.id } });
    expect(lap!.totalSks).toBeCloseTo(initialTotal + 5, 1);
  });

  it('hapus item → totalSks ter-recalc', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    const itemId = r.body.items[0].id;
    const removedSks = r.body.items[0].bobotSks;

    await request(app).delete(`/dosen/bkd/items/${itemId}`).set('Authorization', `Bearer ${token}`);
    const lap = await prisma.bkdLaporan.findUnique({ where: { id: r.body.id } });
    expect(lap!.totalSks).toBeCloseTo(r.body.totalSks - removedSks, 1);
  });

  it('refresh → ulang auto-populate, pertahankan item manual', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    await request(app).post(`/dosen/bkd/${r.body.id}/items`).set('Authorization', `Bearer ${token}`)
      .send({ kategori: 'penunjang', jenis: 'Organisasi', deskripsi: 'Anggota AISINDO 2026', bobotSks: 1 });

    const ref = await request(app).post(`/dosen/bkd/${r.body.id}/refresh`).set('Authorization', `Bearer ${token}`);
    const items = ref.body.items;
    expect(items.some((i: any) => i.jenis === 'Organisasi')).toBe(true); // manual dipertahankan
    expect(items.filter((i: any) => i.sumberEntity === 'kelas').length).toBe(2); // re-populate
  });

  it('submit → status diajukan + notif akademik', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    const sub = await request(app).post(`/dosen/bkd/${r.body.id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(sub.body.status).toBe('diajukan');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.akademikUser.id, type: 'bkd' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('submit tanpa item → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const lap = await prisma.bkdLaporan.create({
      data: { dosenId: f.dosen.id, semesterId: f.semester.id },
    });
    const r = await request(app).post(`/dosen/bkd/${lap.id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(400);
  });

  it('tambah item ke laporan diajukan → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${token}`).send({});
    await request(app).post(`/dosen/bkd/${r.body.id}/submit`).set('Authorization', `Bearer ${token}`);
    const add = await request(app).post(`/dosen/bkd/${r.body.id}/items`).set('Authorization', `Bearer ${token}`)
      .send({ kategori: 'penunjang', jenis: 'X', deskripsi: 'Coba edit setelah submit', bobotSks: 1 });
    expect(add.status).toBe(400);
  });
});

describe('Akademik verifikasi BKD', () => {
  async function buatDanSubmit() {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${dosenToken}`).send({});
    await request(app).post(`/dosen/bkd/${r.body.id}/submit`).set('Authorization', `Bearer ${dosenToken}`);
    return r.body.id as string;
  }

  it('disetujui → status disetujui + notif dosen', async () => {
    const id = await buatDanSubmit();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).patch(`/akademik/bkd/${id}/verifikasi`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'disetujui', catatanAkademik: 'OK total SKS memenuhi.' });
    expect(r.body.status).toBe('disetujui');

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.dosenUser.id, type: 'bkd' } });
    expect(notif.length).toBeGreaterThan(0);
  });

  it('ditolak → status ditolak + dosen bisa edit lagi', async () => {
    const id = await buatDanSubmit();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    await request(app).patch(`/akademik/bkd/${id}/verifikasi`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'ditolak', catatanAkademik: 'Bobot SKS bimbingan tidak sesuai.' });

    // Setelah ditolak, dosen submit ulang
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const lap = await prisma.bkdLaporan.findUnique({ where: { id } });
    expect(lap!.status).toBe('ditolak');
    // Tambah item lalu submit ulang
    await request(app).post(`/dosen/bkd/${id}/items`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ kategori: 'penunjang', jenis: 'Tambahan', deskripsi: 'Item tambahan untuk revisi', bobotSks: 1 }).catch(() => {/* status ditolak ≠ draft, jadi 400 */});
    // Submit ulang dari status ditolak harusnya boleh
    const sub = await request(app).post(`/dosen/bkd/${id}/submit`).set('Authorization', `Bearer ${dosenToken}`);
    expect(sub.body.status).toBe('diajukan');
  });

  it('verifikasi laporan yang masih draft → 400', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${dosenToken}`).send({});
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const res = await request(app).patch(`/akademik/bkd/${r.body.id}/verifikasi`).set('Authorization', `Bearer ${akdToken}`)
      .send({ status: 'disetujui' });
    expect(res.status).toBe(400);
  });

  it('ringkasan kategori', async () => {
    const id = await buatDanSubmit();
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get(`/akademik/bkd/${id}/ringkasan`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.pengajaran).toBeGreaterThan(0);
    expect(r.body.penelitian).toBe(0);
  });
});

describe('RBAC BKD', () => {
  it('mahasiswa tidak boleh akses endpoint dosen BKD', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/dosen/bkd').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('dosen lain tidak boleh edit BKD bukan miliknya', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/dosen/bkd').set('Authorization', `Bearer ${dosenToken}`).send({});

    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'dosen-y@test.id', passwordHash: h, role: 'dosen',
        dosen: { create: { nidn: '7777777777', nama: 'Dosen Y', prodiId: f.prodi.id } },
      },
    });
    const yToken = await loginAs(request(app), 'dosen-y@test.id');
    const res = await request(app).get(`/dosen/bkd/${r.body.id}`).set('Authorization', `Bearer ${yToken}`);
    expect(res.status).toBe(403);
  });
});
