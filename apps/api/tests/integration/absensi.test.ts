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

describe('Reschedule pertemuan', () => {
  async function buatPertemuan(token: string, tanggal: string) {
    const r = await request(app)
      .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal, topik: 'Sesi A' });
    return r.body.id as string;
  }

  it('reschedule valid → tanggalAsli ter-snapshot + notif ke peserta', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const id = await buatPertemuan(token, '2026-09-07T08:00');

    const r = await request(app)
      .post(`/dosen/pertemuan/${id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({
        tanggal: '2026-09-09T13:00',
        alasan: 'Dosen ada dinas luar kota, dipindah ke Rabu sore.',
      });
    expect(r.status).toBe(200);
    expect(new Date(r.body.tanggal).toISOString()).toBe(new Date('2026-09-09T13:00').toISOString());
    expect(new Date(r.body.tanggalAsli).toISOString()).toBe(new Date('2026-09-07T08:00').toISOString());
    expect(r.body.alasanReschedule).toMatch(/dinas/i);

    await new Promise((res) => setTimeout(res, 200));
    const notif = await prisma.notifikasi.findMany({ where: { userId: f.mahasiswaUser.id, type: 'jadwal' } });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/dipindah/i);
  });

  it('reschedule kedua kali → tanggalAsli tetap snapshot pertama', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const id = await buatPertemuan(token, '2026-09-07T08:00');
    await request(app).post(`/dosen/pertemuan/${id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-09T13:00', alasan: 'Dipindah pertama kali karena dosen sakit.' });
    const r = await request(app).post(`/dosen/pertemuan/${id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-10T13:00', alasan: 'Dipindah lagi karena ruangan rusak.' });
    expect(new Date(r.body.tanggalAsli).toISOString()).toBe(new Date('2026-09-07T08:00').toISOString());
    expect(new Date(r.body.tanggal).toISOString()).toBe(new Date('2026-09-10T13:00').toISOString());
  });

  it('alasan terlalu pendek → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const id = await buatPertemuan(token, '2026-09-07T08:00');
    const r = await request(app).post(`/dosen/pertemuan/${id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-09T13:00', alasan: 'X' });
    expect(r.status).toBe(400);
  });

  it('tanggal baru sama dengan tanggal saat ini → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    const id = await buatPertemuan(token, '2026-09-07T08:00');
    const r = await request(app).post(`/dosen/pertemuan/${id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-07T08:00', alasan: 'Test alasan dummy untuk validasi.' });
    expect(r.status).toBe(400);
  });

  it('bentrok ruangan → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    // Buat pertemuan A di ruang R-T01 jam 13:00
    const a = await buatPertemuan(token, '2026-09-09T13:00');
    await request(app).post(`/dosen/pertemuan/${a}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-09T13:00', alasan: 'Tidak akan dipakai.', ruanganId: f.ruangan.id }).catch(() => {/* ignore — same date */});
    // Set ruangan ke pertemuan A langsung
    await prisma.pertemuan.update({ where: { id: a }, data: { ruanganId: f.ruangan.id } });

    // Buat pertemuan B di kelas berbeda, coba reschedule ke slot bentrok dengan A
    const b = await request(app)
      .post(`/dosen/kelas/${f.kelas2.id}/pertemuan`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-10T08:00' });
    const r = await request(app).post(`/dosen/pertemuan/${b.body.id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-09T13:30', ruanganId: f.ruangan.id, alasan: 'Coba pakai ruangan yang sama padahal bentrok.' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/ruangan/i);
  });

  it('bentrok jadwal dosen sendiri (kelas lain) → 400', async () => {
    const token = await loginAs(request(app), f.dosenUser.email);
    // Pertemuan di kelas1 jam 13:00
    const a = await buatPertemuan(token, '2026-09-09T13:00');
    // Pertemuan kelas2 → coba reschedule ke slot yang bentrok dengan kelas1
    const b = await request(app)
      .post(`/dosen/kelas/${f.kelas2.id}/pertemuan`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-10T08:00' });
    const r = await request(app).post(`/dosen/pertemuan/${b.body.id}/reschedule`).set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2026-09-09T13:30', alasan: 'Tabrakan dengan kelas saya sendiri.' });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/bentrok|pertemuan/i);
    void a;
  });

  it('dosen lain tidak boleh reschedule', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const id = await buatPertemuan(dosenToken, '2026-09-07T08:00');

    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'dosen-x@test.id', passwordHash: h, role: 'dosen',
        dosen: { create: { nidn: '8888888888', nama: 'Dosen X', prodiId: f.prodi.id } },
      },
    });
    const xToken = await loginAs(request(app), 'dosen-x@test.id');
    const r = await request(app).post(`/dosen/pertemuan/${id}/reschedule`).set('Authorization', `Bearer ${xToken}`)
      .send({ tanggal: '2026-09-09T13:00', alasan: 'Dosen lain coba reschedule.' });
    expect(r.status).toBe(403);
  });
});
