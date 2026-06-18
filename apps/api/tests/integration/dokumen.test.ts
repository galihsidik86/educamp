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

async function buatKategori(token: string, kode = 'panduan-akademik', nama = 'Panduan Akademik') {
  const r = await request(app).post('/akademik/dokumen/kategori').set('Authorization', `Bearer ${token}`).send({ kode, nama });
  return r.body.id as string;
}

describe('Akademik kelola kategori', () => {
  it('CRUD kategori valid', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const c = await request(app).post('/akademik/dokumen/kategori').set('Authorization', `Bearer ${token}`)
      .send({ kode: 'tata-tertib', nama: 'Tata Tertib', deskripsi: 'Aturan akademik' });
    expect(c.status).toBe(201);

    const list = await request(app).get('/akademik/dokumen/kategori').set('Authorization', `Bearer ${token}`);
    expect(list.body.items.some((k: any) => k.kode === 'tata-tertib')).toBe(true);

    const upd = await request(app).patch(`/akademik/dokumen/kategori/${c.body.id}`).set('Authorization', `Bearer ${token}`)
      .send({ nama: 'Tata Tertib Mahasiswa' });
    expect(upd.body.nama).toBe('Tata Tertib Mahasiswa');

    const del = await request(app).delete(`/akademik/dokumen/kategori/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it('kode duplikat → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    await buatKategori(token, 'pedoman-skripsi', 'Pedoman Skripsi');
    const r = await request(app).post('/akademik/dokumen/kategori').set('Authorization', `Bearer ${token}`)
      .send({ kode: 'pedoman-skripsi', nama: 'Lain' });
    expect(r.status).toBe(409);
  });

  it('kode format invalid → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post('/akademik/dokumen/kategori').set('Authorization', `Bearer ${token}`)
      .send({ kode: 'INVALID UPPER', nama: 'X' });
    expect(r.status).toBe(400);
  });

  it('hapus kategori yang masih dipakai → 409', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(token);
    await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${token}`).send({
      kategoriId: katId, judul: 'Panduan KRS 2025', target: 'all',
      fileUrl: 'https://example.com/panduan-krs.pdf',
    });
    const r = await request(app).delete(`/akademik/dokumen/kategori/${katId}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(409);
  });
});

describe('Akademik kelola dokumen', () => {
  it('CRUD dokumen + filter kategori/status/search', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(token);
    const c = await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${token}`).send({
      kategoriId: katId, judul: 'Panduan Akademik 2026', deskripsi: 'Versi terbaru', versi: '2.0',
      target: 'all', fileUrl: 'https://example.com/panduan.pdf', jenisFile: 'pdf',
    });
    expect(c.status).toBe(201);

    const list = await request(app).get(`/akademik/dokumen?kategoriId=${katId}`).set('Authorization', `Bearer ${token}`);
    expect(list.body.items).toHaveLength(1);

    const search = await request(app).get('/akademik/dokumen?q=panduan').set('Authorization', `Bearer ${token}`);
    expect(search.body.items).toHaveLength(1);

    const upd = await request(app).patch(`/akademik/dokumen/${c.body.id}`).set('Authorization', `Bearer ${token}`)
      .send({ isAktif: false });
    expect(upd.body.isAktif).toBe(false);

    const nonaktif = await request(app).get('/akademik/dokumen?status=nonaktif').set('Authorization', `Bearer ${token}`);
    expect(nonaktif.body.items).toHaveLength(1);
  });

  it('judul terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(token);
    const r = await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${token}`)
      .send({ kategoriId: katId, judul: 'X', target: 'all', fileUrl: 'https://example.com/x.pdf' });
    expect(r.status).toBe(400);
  });

  it('target prodi:<invalid> → 400', async () => {
    const token = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(token);
    const r = await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${token}`).send({
      kategoriId: katId, judul: 'Pedoman Skripsi TI', target: 'prodi:00000000-0000-0000-0000-000000000000',
      fileUrl: 'https://example.com/p.pdf',
    });
    expect(r.status).toBe(400);
  });
});

describe('Shared list dokumen (filter target)', () => {
  async function buatBeberapaDokumen() {
    const token = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(token);
    const buatDok = (target: string, judul: string) => request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${token}`)
      .send({ kategoriId: katId, judul, target, fileUrl: `https://example.com/${target}.pdf` });
    await buatDok('all', 'Panduan Umum');
    await buatDok('mahasiswa', 'Tata Tertib Mahasiswa');
    await buatDok('dosen', 'Pedoman Dosen');
    await buatDok(`prodi:${f.prodi.id}`, 'Pedoman Prodi TI');
    return katId;
  }

  it('mahasiswa lihat: all + mahasiswa + prodi-nya', async () => {
    await buatBeberapaDokumen();
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/dokumen').set('Authorization', `Bearer ${token}`);
    const judul = r.body.items.map((d: any) => d.judul);
    expect(judul).toContain('Panduan Umum');
    expect(judul).toContain('Tata Tertib Mahasiswa');
    expect(judul).toContain('Pedoman Prodi TI');
    expect(judul).not.toContain('Pedoman Dosen');
  });

  it('dosen lihat: all + dosen + prodi-nya', async () => {
    await buatBeberapaDokumen();
    const token = await loginAs(request(app), f.dosenUser.email);
    const r = await request(app).get('/dokumen').set('Authorization', `Bearer ${token}`);
    const judul = r.body.items.map((d: any) => d.judul);
    expect(judul).toContain('Panduan Umum');
    expect(judul).toContain('Pedoman Dosen');
    expect(judul).toContain('Pedoman Prodi TI');
    expect(judul).not.toContain('Tata Tertib Mahasiswa');
  });

  it('akademik lihat semua', async () => {
    await buatBeberapaDokumen();
    const token = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/dokumen').set('Authorization', `Bearer ${token}`);
    expect(r.body.items.length).toBe(4);
  });

  it('dokumen nonaktif tidak muncul di shared list', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(akdToken);
    const c = await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${akdToken}`)
      .send({ kategoriId: katId, judul: 'Dokumen Archive', target: 'all', fileUrl: 'https://example.com/a.pdf' });
    await request(app).patch(`/akademik/dokumen/${c.body.id}`).set('Authorization', `Bearer ${akdToken}`).send({ isAktif: false });

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/dokumen').set('Authorization', `Bearer ${mhsToken}`);
    expect(r.body.items).toHaveLength(0);
  });

  it('dokumen kedaluwarsa tidak muncul', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(akdToken);
    await prisma.dokumen.create({
      data: {
        kategoriId: katId, judul: 'Sudah Kedaluwarsa', target: 'all',
        fileUrl: 'https://example.com/x.pdf',
        tanggalKedaluwarsa: new Date('2020-01-01'),
      },
    });
    await prisma.dokumen.create({
      data: {
        kategoriId: katId, judul: 'Aktif', target: 'all',
        fileUrl: 'https://example.com/y.pdf',
      },
    });

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).get('/dokumen').set('Authorization', `Bearer ${mhsToken}`);
    expect(r.body.items.map((d: any) => d.judul)).toEqual(['Aktif']);
  });
});

describe('Log akses dokumen', () => {
  it('view + download → counter naik + log tercatat', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(akdToken);
    const c = await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${akdToken}`)
      .send({ kategoriId: katId, judul: 'Panduan KRS', target: 'all', fileUrl: 'https://example.com/krs.pdf' });

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post(`/dokumen/${c.body.id}/akses`).set('Authorization', `Bearer ${mhsToken}`).send({ aksi: 'view' });
    await request(app).post(`/dokumen/${c.body.id}/akses`).set('Authorization', `Bearer ${mhsToken}`).send({ aksi: 'download' });

    const d = await prisma.dokumen.findUnique({ where: { id: c.body.id } });
    expect(d!.viewCount).toBe(1);
    expect(d!.downloadCount).toBe(1);

    const log = await request(app).get(`/akademik/dokumen/${c.body.id}/akses`).set('Authorization', `Bearer ${akdToken}`);
    expect(log.body.items).toHaveLength(2);
  });

  it('mahasiswa tidak boleh log akses dokumen yang bukan target-nya', async () => {
    const akdToken = await loginAs(request(app), f.akademikUser.email);
    const katId = await buatKategori(akdToken);
    const c = await request(app).post('/akademik/dokumen').set('Authorization', `Bearer ${akdToken}`)
      .send({ kategoriId: katId, judul: 'Khusus Dosen', target: 'dosen', fileUrl: 'https://example.com/d.pdf' });

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post(`/dokumen/${c.body.id}/akses`).set('Authorization', `Bearer ${mhsToken}`).send({ aksi: 'view' });
    expect(r.status).toBe(404);
  });
});

describe('RBAC dokumen', () => {
  it('mahasiswa tidak boleh CRUD dokumen', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/akademik/dokumen/kategori').set('Authorization', `Bearer ${token}`)
      .send({ kode: 'x', nama: 'X' });
    expect(r.status).toBe(403);
  });
});
