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

const baseSurat = {
  jenis: 'aktif_kuliah' as const,
  judul: 'Surat Keterangan Aktif Kuliah',
  keperluan: 'Untuk pengajuan beasiswa unggulan Kemendikbud 2026',
};

describe('Mahasiswa ajukan surat', () => {
  it('ajukan valid → status diajukan', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send(baseSurat);
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('diajukan');
  });

  it('judul terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send({ ...baseSurat, judul: 'X' });
    expect(r.status).toBe(400);
  });

  it('keperluan terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send({ ...baseSurat, keperluan: 'pendek' });
    expect(r.status).toBe(400);
  });

  it('duplikat jenis aktif → 400', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send(baseSurat);
    const r = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send(baseSurat);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/aktif/i);
  });

  it('jenis berbeda boleh berdampingan', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send(baseSurat);
    const r = await request(app)
      .post('/mahasiswa/surat')
      .set('Authorization', `Bearer ${token}`)
      .send({ jenis: 'pengantar_beasiswa', judul: 'Surat Pengantar Beasiswa', keperluan: 'Untuk pengajuan beasiswa BIDIKMISI' });
    expect(r.status).toBe(201);
  });

  it('cancel saat diajukan → status batal', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send(baseSurat);
    const r = await request(app).delete(`/mahasiswa/surat/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(204);
    const s = await prisma.surat.findUnique({ where: { id: c.body.id } });
    expect(s!.status).toBe('batal');
  });

  it('cancel saat status selesai → 403', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${token}`).send(baseSurat);
    await prisma.surat.update({ where: { id: c.body.id }, data: { status: 'selesai', nomorSurat: '001/SK/2026' } });
    const r = await request(app).delete(`/mahasiswa/surat/${c.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});

describe('Akademik validasi surat', () => {
  async function ajukan() {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${mhsToken}`).send(baseSurat);
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    return { mhsToken, akademikToken, suratId: c.body.id };
  }

  it('PATCH ke disetujui → tanggalDisetujui auto-set', async () => {
    const { akademikToken, suratId } = await ajukan();
    const r = await request(app)
      .patch(`/akademik/surat/${suratId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ status: 'disetujui', catatan: 'OK' });
    expect(r.body.status).toBe('disetujui');
    expect(r.body.tanggalDisetujui).not.toBeNull();
  });

  it('PATCH ke selesai tanpa nomorSurat → 400', async () => {
    const { akademikToken, suratId } = await ajukan();
    const r = await request(app)
      .patch(`/akademik/surat/${suratId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ status: 'selesai' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/nomor/i);
  });

  it('PATCH ke selesai dengan nomorSurat → tanggalSelesai auto', async () => {
    const { akademikToken, suratId } = await ajukan();
    const r = await request(app)
      .patch(`/akademik/surat/${suratId}`)
      .set('Authorization', `Bearer ${akademikToken}`)
      .send({ status: 'selesai', nomorSurat: '001/SK/AKD/2026' });
    expect(r.body.status).toBe('selesai');
    expect(r.body.nomorSurat).toBe('001/SK/AKD/2026');
    expect(r.body.tanggalSelesai).not.toBeNull();
  });

  it('notifikasi transisi disetujui → mahasiswa', async () => {
    const { akademikToken, suratId } = await ajukan();
    await request(app).patch(`/akademik/surat/${suratId}`).set('Authorization', `Bearer ${akademikToken}`).send({ status: 'disetujui' });

    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'surat' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/disetujui/i);
  });

  it('filter status', async () => {
    await ajukan();
    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/surat?status=diajukan').set('Authorization', `Bearer ${akademikToken}`);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].status).toBe('diajukan');
  });
});

describe('RBAC surat', () => {
  it('mahasiswa tidak boleh PATCH endpoint akademik', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const c = await request(app).post('/mahasiswa/surat').set('Authorization', `Bearer ${mhsToken}`).send(baseSurat);
    const r = await request(app).patch(`/akademik/surat/${c.body.id}`).set('Authorization', `Bearer ${mhsToken}`).send({ status: 'disetujui' });
    expect(r.status).toBe(403);
  });
});
