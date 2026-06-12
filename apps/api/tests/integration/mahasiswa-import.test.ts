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

function baseRow(extra: Partial<Record<string, string>> = {}) {
  return {
    nim: '2026110010',
    nama: 'Baru Satu',
    email: 'baru1@stu.test',
    jenisKelamin: 'L',
    angkatan: '2026',
    prodiKode: f.prodi.kode,
    ...extra,
  };
}

describe('Import CSV mahasiswa', () => {
  it('1 baris valid → created', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow()] });
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(1);
    expect(r.body.failed).toBe(0);

    const u = await prisma.mahasiswa.findUnique({ where: { nim: '2026110010' } });
    expect(u).not.toBeNull();
    expect(u!.nama).toBe('Baru Satu');
  });

  it('row tanpa DPA NIDN tetap dibuat (dpaId null)', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow({ dpaNidn: '' })] });
    expect(r.body.created).toBe(1);
    const u = await prisma.mahasiswa.findUnique({ where: { nim: '2026110010' } });
    expect(u!.dpaId).toBeNull();
  });

  it('row dengan DPA NIDN valid → dpaId terisi', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow({ dpaNidn: f.dosen.nidn })] });
    expect(r.body.created).toBe(1);
    const u = await prisma.mahasiswa.findUnique({ where: { nim: '2026110010' } });
    expect(u!.dpaId).toBe(f.dosen.id);
  });

  it('NIM regex invalid → failed', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow({ nim: '12' })] });
    expect(r.body.created).toBe(0);
    expect(r.body.failed).toBe(1);
    expect(r.body.results[0].message).toMatch(/nim/i);
  });

  it('prodi kode unknown → failed dengan pesan eksplisit', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow({ prodiKode: '99999' })] });
    expect(r.body.failed).toBe(1);
    expect(r.body.results[0].message).toMatch(/Kode prodi/);
  });

  it('DPA NIDN unknown → failed', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow({ dpaNidn: '0000000000' })] });
    expect(r.body.failed).toBe(1);
    expect(r.body.results[0].message).toMatch(/NIDN DPA/);
  });

  it('duplikat NIM dalam batch → row pertama created, row kedua failed', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rows: [
          baseRow(),
          baseRow({ email: 'baru1-alt@stu.test' }), // NIM sama
        ],
      });
    expect(r.body.created).toBe(1);
    expect(r.body.failed).toBe(1);
    expect(r.body.results[1].message).toMatch(/NIM sudah dipakai/);
  });

  it('email duplikat dalam batch → row kedua failed', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rows: [
          baseRow(),
          baseRow({ nim: '2026110011' }), // email sama
        ],
      });
    expect(r.body.created).toBe(1);
    expect(r.body.failed).toBe(1);
    expect(r.body.results[1].message).toMatch(/Email/);
  });

  it('mixed batch: 2 valid + 2 invalid → report per row', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rows: [
          baseRow({ nim: '2026110020', email: 'a@stu.test' }),
          baseRow({ nim: 'x', email: 'b@stu.test' }), // invalid NIM
          baseRow({ nim: '2026110022', email: 'c@stu.test', prodiKode: 'ZZZ' }), // bad prodi
          baseRow({ nim: '2026110023', email: 'd@stu.test' }),
        ],
      });
    expect(r.body.totalRows).toBe(4);
    expect(r.body.created).toBe(2);
    expect(r.body.failed).toBe(2);
    expect(r.body.results.map((x: any) => x.status)).toEqual(['created', 'failed', 'failed', 'created']);
  });

  it('mahasiswa tidak boleh akses endpoint', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/akademik/mahasiswa/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: [baseRow()] });
    expect(r.status).toBe(403);
  });
});
