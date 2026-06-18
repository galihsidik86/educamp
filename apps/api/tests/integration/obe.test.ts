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

describe('CPL CRUD', () => {
  it('akademik create + list + edit + delete', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id,
      kode: 'CPL-1',
      deskripsi: 'Menguasai konsep teoretis bidang informatika secara umum',
      aspek: 'pengetahuan',
    });
    expect(c.status).toBe(201);

    const list = await request(app).get(`/akademik/cpl?prodiId=${f.prodi.id}`).set('Authorization', `Bearer ${token}`);
    expect(list.body.items).toHaveLength(1);

    const upd = await request(app).patch(`/akademik/cpl/${c.body.id}`).set('Authorization', `Bearer ${token}`)
      .send({ urutan: 5 });
    expect(upd.body.urutan).toBe(5);

    const del = await request(app).delete(`/akademik/cpl/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it('kode CPL duplikat di prodi sama → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id, kode: 'CPL-1', deskripsi: 'Deskripsi CPL satu untuk uji', aspek: 'sikap',
    });
    const r = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id, kode: 'CPL-1', deskripsi: 'Deskripsi CPL satu yang lain', aspek: 'sikap',
    });
    expect(r.status).toBe(409);
  });

  it('hapus CPL yang dipakai CPMK → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const cpl = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id, kode: 'CPL-X', deskripsi: 'Deskripsi CPL X uji conflict', aspek: 'sikap',
    });
    const cpmk = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${token}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-1', deskripsi: 'Deskripsi CPMK satu untuk uji',
    });
    await request(app).post(`/akademik/cpmk/${cpmk.body.id}/cpl`).set('Authorization', `Bearer ${token}`)
      .send({ cplId: cpl.body.id, bobot: 0.5 });
    const r = await request(app).delete(`/akademik/cpl/${cpl.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(409);
  });
});

describe('CPMK CRUD + mapping', () => {
  it('akademik create CPMK + map ke CPL', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const cpl = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id, kode: 'CPL-A', deskripsi: 'CPL A deskripsi untuk uji mapping', aspek: 'pengetahuan',
    });
    const cpmk = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${token}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-A',
      deskripsi: 'Mahasiswa mampu menjelaskan dasar algoritma',
      bobotPenilaian: 0.3,
    });
    expect(cpmk.status).toBe(201);

    const map = await request(app).post(`/akademik/cpmk/${cpmk.body.id}/cpl`).set('Authorization', `Bearer ${token}`)
      .send({ cplId: cpl.body.id, bobot: 0.7 });
    expect(map.status).toBe(201);

    // List CPMK include cpl mapping
    const list = await request(app).get(`/akademik/cpmk?mataKuliahId=${f.mk1.id}`).set('Authorization', `Bearer ${token}`);
    expect(list.body.items[0].cpl).toHaveLength(1);
  });

  it('mapping CPL ke CPMK beda prodi → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    // Buat prodi+MK beda
    const fakultas = await prisma.fakultas.findFirst();
    const prodi2 = await prisma.prodi.create({
      data: { kode: '55202T', nama: 'Prodi 2 Test', jenjang: 's1', fakultasId: fakultas!.id },
    });
    const cplLain = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: prodi2.id, kode: 'CPL-LAIN', deskripsi: 'CPL prodi lain uji constraint', aspek: 'sikap',
    });
    const cpmk = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${token}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-B', deskripsi: 'Deskripsi CPMK B uji',
    });
    const r = await request(app).post(`/akademik/cpmk/${cpmk.body.id}/cpl`).set('Authorization', `Bearer ${token}`)
      .send({ cplId: cplLain.body.id, bobot: 0.5 });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/prodi/i);
  });

  it('mapping duplikat → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const cpl = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id, kode: 'CPL-D', deskripsi: 'CPL D deskripsi uji duplicate', aspek: 'sikap',
    });
    const cpmk = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${token}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-D', deskripsi: 'CPMK D deskripsi uji',
    });
    await request(app).post(`/akademik/cpmk/${cpmk.body.id}/cpl`).set('Authorization', `Bearer ${token}`)
      .send({ cplId: cpl.body.id, bobot: 0.5 });
    const r = await request(app).post(`/akademik/cpmk/${cpmk.body.id}/cpl`).set('Authorization', `Bearer ${token}`)
      .send({ cplId: cpl.body.id, bobot: 1.0 });
    expect(r.status).toBe(409);
  });
});

describe('Dosen input nilai CPMK', () => {
  async function setupNilaiCpmk() {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const cpl = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${akdToken}`).send({
      prodiId: f.prodi.id, kode: 'CPL-1', deskripsi: 'CPL satu untuk uji nilai cpmk', aspek: 'pengetahuan',
    });
    const cpmk = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${akdToken}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-1', deskripsi: 'CPMK satu uji nilai', ambangTercapai: 60,
    });
    await request(app).post(`/akademik/cpmk/${cpmk.body.id}/cpl`).set('Authorization', `Bearer ${akdToken}`)
      .send({ cplId: cpl.body.id, bobot: 1.0 });

    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    return { cplId: cpl.body.id, cpmkId: cpmk.body.id, krsId: krs.id };
  }

  it('GET list CPMK + peserta untuk kelas', async () => {
    const { cpmkId } = await setupNilaiCpmk();
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get(`/dosen/kelas/${f.kelas1.id}/cpmk`).set('Authorization', `Bearer ${token}`);
    expect(r.body.cpmk).toHaveLength(1);
    expect(r.body.cpmk[0].id).toBe(cpmkId);
    expect(r.body.peserta).toHaveLength(1);
  });

  it('POST nilai CPMK → auto-status berdasarkan ambang', async () => {
    const { cpmkId, krsId } = await setupNilaiCpmk();
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post(`/dosen/kelas/${f.kelas1.id}/cpmk/nilai`).set('Authorization', `Bearer ${token}`)
      .send({ items: [{ krsId, cpmkId, nilai: 75 }] });
    expect(r.body.updated).toBe(1);

    const nilai = await prisma.nilaiCpmk.findFirst();
    expect(nilai!.nilai).toBe(75);
    expect(nilai!.status).toBe('tercapai'); // 75 >= 60
  });

  it('nilai di bawah ambang → status belum_tercapai', async () => {
    const { cpmkId, krsId } = await setupNilaiCpmk();
    const token = await loginAs(request(app), f.dosenUser.email);
    await request(app).post(`/dosen/kelas/${f.kelas1.id}/cpmk/nilai`).set('Authorization', `Bearer ${token}`)
      .send({ items: [{ krsId, cpmkId, nilai: 50 }] });

    const nilai = await prisma.nilaiCpmk.findFirst();
    expect(nilai!.status).toBe('belum_tercapai');
  });

  it('upsert: input ulang update nilai existing', async () => {
    const { cpmkId, krsId } = await setupNilaiCpmk();
    const token = await loginAs(request(app), f.dosenUser.email);
    await request(app).post(`/dosen/kelas/${f.kelas1.id}/cpmk/nilai`).set('Authorization', `Bearer ${token}`)
      .send({ items: [{ krsId, cpmkId, nilai: 70 }] });
    await request(app).post(`/dosen/kelas/${f.kelas1.id}/cpmk/nilai`).set('Authorization', `Bearer ${token}`)
      .send({ items: [{ krsId, cpmkId, nilai: 90 }] });
    const all = await prisma.nilaiCpmk.findMany();
    expect(all).toHaveLength(1);
    expect(all[0]!.nilai).toBe(90);
  });

  it('cpmkId dari MK lain → 400', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    // CPMK untuk MK2 (kelas2)
    const cpmkLain = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${akdToken}`).send({
      mataKuliahId: f.mk2.id, kode: 'CPMK-2', deskripsi: 'CPMK MK2 uji',
    });
    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });

    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post(`/dosen/kelas/${f.kelas1.id}/cpmk/nilai`).set('Authorization', `Bearer ${token}`)
      .send({ items: [{ krsId: krs.id, cpmkId: cpmkLain.body.id, nilai: 80 }] });
    expect(r.status).toBe(400);
  });
});

describe('Laporan OBE — capaian CPL', () => {
  it('rata-rata skor CPL dihitung dari CPMK weighted', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const cpl = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${akdToken}`).send({
      prodiId: f.prodi.id, kode: 'CPL-1', deskripsi: 'CPL satu uji laporan', aspek: 'pengetahuan',
    });
    const cpmk1 = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${akdToken}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-1', deskripsi: 'CPMK satu uji laporan',
    });
    const cpmk2 = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${akdToken}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-2', deskripsi: 'CPMK dua uji laporan',
    });
    await request(app).post(`/akademik/cpmk/${cpmk1.body.id}/cpl`).set('Authorization', `Bearer ${akdToken}`)
      .send({ cplId: cpl.body.id, bobot: 0.6 });
    await request(app).post(`/akademik/cpmk/${cpmk2.body.id}/cpl`).set('Authorization', `Bearer ${akdToken}`)
      .send({ cplId: cpl.body.id, bobot: 0.4 });

    const krs = await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
    });
    await prisma.nilaiCpmk.create({ data: { krsId: krs.id, cpmkId: cpmk1.body.id, nilai: 80, status: 'tercapai' } });
    await prisma.nilaiCpmk.create({ data: { krsId: krs.id, cpmkId: cpmk2.body.id, nilai: 60, status: 'tercapai' } });

    const r = await request(app).get(`/akademik/obe/laporan?prodiId=${f.prodi.id}`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.cpl).toHaveLength(1);
    // Weighted avg = (80*0.6 + 60*0.4) / (0.6+0.4) = 72
    expect(r.body.cpl[0].rataRataSkor).toBe(72);
    expect(r.body.cpl[0].mhsDinilai).toBe(1);
    expect(r.body.cpl[0].persenTercapai).toBe(100); // 72 >= 56
  });

  it('filter angkatan', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get(`/akademik/obe/laporan?prodiId=${f.prodi.id}&angkatan=2024`).set('Authorization', `Bearer ${akdToken}`);
    expect(r.body.angkatan).toBe(2024);
    expect(r.body.totalMahasiswa).toBe(1);
  });

  it('tanpa prodiId → 400', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/obe/laporan').set('Authorization', `Bearer ${akdToken}`);
    expect(r.status).toBe(400);
  });
});

describe('RBAC OBE', () => {
  it('mahasiswa tidak boleh CRUD CPL', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/akademik/cpl').set('Authorization', `Bearer ${token}`).send({
      prodiId: f.prodi.id, kode: 'CPL-X', deskripsi: 'X', aspek: 'sikap',
    });
    expect(r.status).toBe(403);
  });

  it('dosen tidak boleh CRUD CPMK akademik endpoint', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).post('/akademik/cpmk').set('Authorization', `Bearer ${token}`).send({
      mataKuliahId: f.mk1.id, kode: 'CPMK-Y', deskripsi: 'Y',
    });
    expect(r.status).toBe(403);
  });
});
