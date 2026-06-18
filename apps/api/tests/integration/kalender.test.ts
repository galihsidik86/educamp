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

describe('Kalender akademik CRUD (akademik)', () => {
  it('create + list + edit + delete', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);

    const created = await request(app)
      .post('/akademik/kalender')
      .set('Authorization', `Bearer ${token}`)
      .send({
        judul: 'UTS Semester Ganjil 2025/2026',
        jenis: 'ujian',
        tanggalMulai: new Date('2025-10-10').toISOString(),
        tanggalSelesai: new Date('2025-10-17').toISOString(),
        target: 'all',
      });
    expect(created.status).toBe(201);
    expect(created.body.judul).toContain('UTS');
    const id = created.body.id;

    const list = await request(app).get('/akademik/kalender').set('Authorization', `Bearer ${token}`);
    expect(list.body.items.some((e: any) => e.id === id)).toBe(true);

    const upd = await request(app)
      .patch(`/akademik/kalender/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'UTS (revisi)' });
    expect(upd.body.judul).toBe('UTS (revisi)');

    const del = await request(app).delete(`/akademik/kalender/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
    expect(await prisma.kalenderAkademik.count({ where: { id } })).toBe(0);
  });

  it('judul pendek → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/kalender')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'X', jenis: 'ujian', tanggalMulai: new Date().toISOString(), target: 'all' });
    expect(r.status).toBe(400);
  });
});

describe('Kalender shared (filter target per role)', () => {
  beforeEach(async () => {
    await prisma.kalenderAkademik.createMany({
      data: [
        { judul: 'UTS', jenis: 'ujian', tanggalMulai: new Date('2026-10-10'), target: 'all' },
        { judul: 'Buka KRS', jenis: 'registrasi', tanggalMulai: new Date('2026-08-01'), target: 'mahasiswa' },
        { judul: 'Rapat Dosen', jenis: 'akademik', tanggalMulai: new Date('2026-09-01'), target: 'dosen' },
        { judul: 'Libur Idul Fitri', jenis: 'libur', tanggalMulai: new Date('2026-04-01'), target: 'all' },
      ],
    });
  });

  it('mahasiswa lihat: all + mahasiswa, BUKAN dosen', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/kalender').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    const judul = r.body.items.map((e: any) => e.judul);
    expect(judul).toContain('UTS');
    expect(judul).toContain('Buka KRS');
    expect(judul).toContain('Libur Idul Fitri');
    expect(judul).not.toContain('Rapat Dosen');
  });

  it('dosen lihat: all + dosen, BUKAN mahasiswa', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/kalender').set('Authorization', `Bearer ${token}`);
    const judul = r.body.items.map((e: any) => e.judul);
    expect(judul).toContain('UTS');
    expect(judul).toContain('Rapat Dosen');
    expect(judul).not.toContain('Buka KRS');
  });

  it('akademik lihat semua', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/kalender').set('Authorization', `Bearer ${token}`);
    expect(r.body.items.length).toBe(4);
  });

  it('upcoming=N hanya event masa depan, terurut, terbatas', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    // tambah satu event masa lalu yang seharusnya tidak masuk upcoming
    await prisma.kalenderAkademik.create({
      data: { judul: 'Event Lampau', jenis: 'lain', tanggalMulai: new Date('2020-01-01'), target: 'all' },
    });
    const r = await request(app).get('/kalender?upcoming=2').set('Authorization', `Bearer ${token}`);
    expect(r.body.items.length).toBe(2);
    expect(r.body.items.map((e: any) => e.judul)).not.toContain('Event Lampau');
  });
});

describe('RBAC kalender', () => {
  it('mahasiswa tidak boleh akses endpoint akademik', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/akademik/kalender')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'X', jenis: 'lain', tanggalMulai: new Date().toISOString(), target: 'all' });
    expect(r.status).toBe(403);
  });
});
