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

describe('Pengumuman CRUD (akademik)', () => {
  it('akademik create + list + edit + delete', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);

    const created = await request(app)
      .post('/akademik/pengumuman')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Libur', isi: 'Libur Senin', target: 'all', isPenting: true });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await request(app).get('/akademik/pengumuman').set('Authorization', `Bearer ${token}`);
    expect(list.body.items.some((p: any) => p.id === id)).toBe(true);

    const upd = await request(app)
      .patch(`/akademik/pengumuman/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'Libur (revisi)' });
    expect(upd.body.judul).toBe('Libur (revisi)');

    const del = await request(app).delete(`/akademik/pengumuman/${id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
    expect(await prisma.pengumuman.count({ where: { id } })).toBe(0);
  });

  it('target invalid → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app)
      .post('/akademik/pengumuman')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'X', isi: 'Y', target: 'prodi:invalid' });
    expect(r.status).toBe(400);
  });
});

describe('Pengumuman filter berdasarkan target', () => {
  beforeEach(async () => {
    await prisma.pengumuman.createMany({
      data: [
        { judul: 'Umum', isi: 'untuk semua', target: 'all' },
        { judul: 'Khusus Mahasiswa', isi: 'untuk mhs', target: 'mahasiswa' },
        { judul: 'Khusus Dosen', isi: 'untuk dosen', target: 'dosen' },
        { judul: 'Khusus Prodi', isi: 'utk prodi tertentu', target: `prodi:${f.prodi.id}` },
        { judul: 'Prodi Lain', isi: 'tidak relevan', target: 'prodi:00000000-0000-0000-0000-000000000000' },
      ],
    });
  });

  it('mahasiswa lihat: all + mahasiswa + prodi terkait, BUKAN dosen / prodi lain', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/mahasiswa/pengumuman').set('Authorization', `Bearer ${token}`);
    const judul = r.body.items.map((p: any) => p.judul);
    expect(judul).toContain('Umum');
    expect(judul).toContain('Khusus Mahasiswa');
    expect(judul).toContain('Khusus Prodi');
    expect(judul).not.toContain('Khusus Dosen');
    expect(judul).not.toContain('Prodi Lain');
  });

  it('dosen lihat: all + dosen + prodi dosen', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dosen/pengumuman').set('Authorization', `Bearer ${token}`);
    const judul = r.body.items.map((p: any) => p.judul);
    expect(judul).toContain('Umum');
    expect(judul).toContain('Khusus Dosen');
    expect(judul).toContain('Khusus Prodi');
    expect(judul).not.toContain('Khusus Mahasiswa');
    expect(judul).not.toContain('Prodi Lain');
  });
});

describe('RBAC pengumuman', () => {
  it('mahasiswa tidak boleh akses endpoint akademik', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app)
      .post('/akademik/pengumuman')
      .set('Authorization', `Bearer ${token}`)
      .send({ judul: 'X', isi: 'Y', target: 'all' });
    expect(r.status).toBe(403);
  });
});
