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
  // Approve KRS satu kelas untuk Aisyah supaya jadi peserta absensi.
  await prisma.krs.create({
    data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
  });
});

describe('Pertemuan CRUD (dosen)', () => {
  it('dosen owner kelas dapat create pertemuan; pertemuanKe auto-increment', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const r1 = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: '2026-06-09T08:00', topik: 'Pengantar' });
    expect(r1.status).toBe(201);
    expect(r1.body.pertemuanKe).toBe(1);

    const r2 = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: '2026-06-16T08:00', topik: 'Lanjutan' });
    expect(r2.body.pertemuanKe).toBe(2);
  });

  it('dosen lain tidak boleh kelola kelas yang bukan miliknya', async () => {
    // buat dosen lain dengan kelas yang sama? Lebih mudah: buat 2 user dosen baru.
    const lainUser = await prisma.user.create({
      data: {
        email: 'dosen-lain@test.id', passwordHash: f.dosenUser.passwordHash, role: 'dosen',
        dosen: { create: { nidn: '9999999999', nama: 'Dosen Lain', prodiId: f.prodi.id } },
      },
    });
    const lainToken = await loginAs(request(app), lainUser.email);
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${lainToken}`)
      .send({ tanggal: '2026-06-09T08:00' });
    expect(r.status).toBe(403);
  });

  it('hapus pertemuan juga menghapus absensi (cascade)', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const p = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: '2026-06-09T08:00' });
    await request(app)
      .post(`/dosen/pertemuan/${p.body.id}/absensi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ items: [{ mahasiswaId: f.mahasiswa.id, status: 'hadir' }] });

    expect(await prisma.absensi.count()).toBe(1);
    const del = await request(app)
      .delete(`/dosen/pertemuan/${p.body.id}`)
      .set('Authorization', `Bearer ${dosenToken}`);
    expect(del.status).toBe(204);
    expect(await prisma.absensi.count()).toBe(0);
  });
});

describe('Absensi batch + validasi peserta', () => {
  it('tolak set absensi untuk mahasiswa yang bukan peserta', async () => {
    // mahasiswa lain tidak ber-KRS di kelas1
    const otherU = await prisma.user.create({
      data: {
        email: 'mhs-lain@test.id', passwordHash: f.dosenUser.passwordHash, role: 'mahasiswa',
        mahasiswa: { create: { nim: '9999000099', nama: 'Lain', jenisKelamin: 'L', angkatan: 2024, prodiId: f.prodi.id } },
      },
      include: { mahasiswa: true },
    });
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const p = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: '2026-06-09T08:00' });
    const r = await request(app)
      .post(`/dosen/pertemuan/${p.body.id}/absensi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ items: [{ mahasiswaId: otherU.mahasiswa!.id, status: 'hadir' }] });
    expect(r.status).toBe(400);
  });

  it('upsert per mahasiswa — set hadir lalu ubah ke alpa, hanya 1 record', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const p = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: '2026-06-09T08:00' });
    await request(app)
      .post(`/dosen/pertemuan/${p.body.id}/absensi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ items: [{ mahasiswaId: f.mahasiswa.id, status: 'hadir' }] });
    await request(app)
      .post(`/dosen/pertemuan/${p.body.id}/absensi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ items: [{ mahasiswaId: f.mahasiswa.id, status: 'alpa' }] });

    const all = await prisma.absensi.findMany({ where: { pertemuanId: p.body.id } });
    expect(all).toHaveLength(1);
    expect(all[0]!.status).toBe('alpa');
  });
});

describe('Rekap kehadiran', () => {
  it('mahasiswa lihat persentase kehadiran per kelas', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    // 4 pertemuan: 3 hadir, 1 alpa → 75%
    for (let i = 0; i < 4; i++) {
      const p = await request(app)
        .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
        .set('Authorization', `Bearer ${dosenToken}`)
        .send({ tanggal: `2026-06-0${i + 1}T08:00` });
      await request(app)
        .post(`/dosen/pertemuan/${p.body.id}/absensi`)
        .set('Authorization', `Bearer ${dosenToken}`)
        .send({ items: [{ mahasiswaId: f.mahasiswa.id, status: i === 3 ? 'alpa' : 'hadir' }] });
    }

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const rekap = await request(app).get('/mahasiswa/absensi').set('Authorization', `Bearer ${mhsToken}`);
    const kelasRekap = rekap.body.items.find((k: any) => k.kodeMK === 'TST-101');
    expect(kelasRekap.totalPertemuan).toBe(4);
    expect(kelasRekap.ringkasan.hadir).toBe(3);
    expect(kelasRekap.ringkasan.alpa).toBe(1);
    expect(kelasRekap.persentaseHadir).toBe(75);
  });

  it('rekap peserta dosen menandai mahasiswa kritis bila < 75%', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    // 3 alpa berturut-turut → 0%
    for (let i = 0; i < 3; i++) {
      const p = await request(app)
        .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
        .set('Authorization', `Bearer ${dosenToken}`)
        .send({ tanggal: `2026-06-0${i + 1}T08:00` });
      await request(app)
        .post(`/dosen/pertemuan/${p.body.id}/absensi`)
        .set('Authorization', `Bearer ${dosenToken}`)
        .send({ items: [{ mahasiswaId: f.mahasiswa.id, status: 'alpa' }] });
    }

    const rekap = await request(app)
      .get(`/dosen/kelas/${f.kelas1.id}/kehadiran-rekap`)
      .set('Authorization', `Bearer ${dosenToken}`);
    expect(rekap.status).toBe(200);
    expect(rekap.body.items[0].persentaseHadir).toBe(0);
    expect(rekap.body.items[0].kritis).toBe(true);
  });
});

describe('Laporan kehadiran akademik', () => {
  it('GET /akademik/laporan/kehadiran mengagregasi per kelas', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const p = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: '2026-06-09T08:00' });
    await request(app)
      .post(`/dosen/pertemuan/${p.body.id}/absensi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ items: [{ mahasiswaId: f.mahasiswa.id, status: 'hadir' }] });

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const lap = await request(app).get('/akademik/laporan/kehadiran').set('Authorization', `Bearer ${akademikToken}`);
    expect(lap.status).toBe(200);
    expect(lap.body.ringkasan.totalKelas).toBe(2); // kelas1 dan kelas2 dari fixtures
    const k1 = lap.body.items.find((k: any) => k.kodeMK === 'TST-101');
    expect(k1.totalPertemuan).toBe(1);
    expect(k1.ringkasan.hadir).toBe(1);
    expect(k1.persentaseRata).toBe(100);
    expect(k1.kritis).toBe(0);
  });
});
