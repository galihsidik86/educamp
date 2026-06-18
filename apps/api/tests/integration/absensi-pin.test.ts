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
  // KRS disetujui untuk Aisyah di kelas1
  await prisma.krs.create({
    data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: f.semester.id, status: 'disetujui' },
  });
});

async function buatPertemuan() {
  const token = await loginAs(request(app), f.dosenUser.email);
  const r = await request(app)
    .post(`/dosen/kelas/${f.kelas1.id}/pertemuan`).set('Authorization', `Bearer ${token}`)
    .send({ tanggal: new Date().toISOString(), topik: 'Pengantar' });
  return r.body.id as string;
}

describe('Dosen generate & manage PIN', () => {
  it('generate PIN → 6 digit + expiry default 15 menit', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    const r = await request(app)
      .post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.pin).toMatch(/^\d{6}$/);
    const expiresAt = new Date(r.body.expiresAt).getTime();
    const diff = expiresAt - Date.now();
    expect(diff).toBeGreaterThan(14 * 60_000);
    expect(diff).toBeLessThan(16 * 60_000);
  });

  it('generate PIN custom durasi', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    const r = await request(app)
      .post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ durasiMenit: 30 });
    const diff = new Date(r.body.expiresAt).getTime() - Date.now();
    expect(diff).toBeGreaterThan(29 * 60_000);
    expect(diff).toBeLessThan(31 * 60_000);
  });

  it('generate PIN baru → replace PIN lama', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    const r1 = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});
    const r2 = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});
    // PIN bisa kebetulan sama (1 dari sejuta), tapi pinDibuatPada pasti berbeda
    expect(r1.body.dibuatPada).not.toBe(r2.body.dibuatPada);
  });

  it('clear PIN → status not active', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});
    const del = await request(app).delete(`/dosen/pertemuan/${pertemuanId}/pin`).set('Authorization', `Bearer ${dosenToken}`);
    expect(del.status).toBe(204);
    const status = await request(app).get(`/dosen/pertemuan/${pertemuanId}/pin-status`).set('Authorization', `Bearer ${dosenToken}`);
    expect(status.body.isActive).toBe(false);
    expect(status.body.pin).toBeNull();
  });

  it('status counter: hadirViaPin + totalHadir', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    const gen = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});

    // Mahasiswa submit
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: gen.body.pin });

    const status = await request(app).get(`/dosen/pertemuan/${pertemuanId}/pin-status`).set('Authorization', `Bearer ${dosenToken}`);
    expect(status.body.hadirViaPin).toBe(1);
    expect(status.body.totalHadir).toBe(1);
  });
});

describe('Mahasiswa submit PIN', () => {
  it('PIN valid + peserta KRS → hadir tercatat dengan flag inputViaPin', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    const gen = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: gen.body.pin });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);

    const absensi = await prisma.absensi.findFirst({ where: { mahasiswaId: f.mahasiswa.id } });
    expect(absensi!.status).toBe('hadir');
    expect(absensi!.inputViaPin).toBe(true);
    expect(absensi!.inputPada).not.toBeNull();
  });

  it('PIN tidak ada → 400', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: '000000' });
    expect(r.status).toBe(400);
  });

  it('PIN expired → 400', async () => {
    const pertemuanId = await buatPertemuan();
    // Set PIN expired manual
    await prisma.pertemuan.update({
      where: { id: pertemuanId },
      data: { pinKehadiran: '123456', pinExpiresAt: new Date(Date.now() - 60_000) },
    });
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: '123456' });
    expect(r.status).toBe(400);
  });

  it('bukan peserta KRS → 400', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    // Buat pertemuan di kelas2 (Aisyah belum KRS kelas2)
    const r2 = await request(app)
      .post(`/dosen/kelas/${f.kelas2.id}/pertemuan`).set('Authorization', `Bearer ${dosenToken}`)
      .send({ tanggal: new Date().toISOString() });
    const gen = await request(app).post(`/dosen/pertemuan/${r2.body.id}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: gen.body.pin });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/peserta/i);
  });

  it('double submit → 400', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    const gen = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: gen.body.pin });
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: gen.body.pin });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/sudah/i);
  });

  it('PIN format invalid → 400 validation', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: '12345' });
    expect(r.status).toBe(400);
  });

  it('PIN dengan absensi sebelumnya alpa → upgrade ke hadir + flag PIN', async () => {
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const pertemuanId = await buatPertemuan();
    // Tandai alpa manual
    await prisma.absensi.create({
      data: { pertemuanId, mahasiswaId: f.mahasiswa.id, status: 'alpa' },
    });
    const gen = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${dosenToken}`).send({});

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post('/mahasiswa/absensi/pin').set('Authorization', `Bearer ${mhsToken}`).send({ pin: gen.body.pin });
    expect(r.status).toBe(200);
    const absensi = await prisma.absensi.findFirst({ where: { mahasiswaId: f.mahasiswa.id } });
    expect(absensi!.status).toBe('hadir');
    expect(absensi!.inputViaPin).toBe(true);
  });
});

describe('RBAC absensi PIN', () => {
  it('mahasiswa tidak boleh generate PIN', async () => {
    const pertemuanId = await buatPertemuan();
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const r = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(r.status).toBe(403);
  });

  it('dosen lain tidak boleh generate PIN', async () => {
    const pertemuanId = await buatPertemuan();
    const pw = (await import('../../src/lib/password.js')).hashPassword;
    const h = await pw('password123');
    await prisma.user.create({
      data: {
        email: 'dosen-z@test.id', passwordHash: h, role: 'dosen',
        dosen: { create: { nidn: '6666666666', nama: 'Dosen Z', prodiId: f.prodi.id } },
      },
    });
    const zToken = await loginAs(request(app), 'dosen-z@test.id');
    const r = await request(app).post(`/dosen/pertemuan/${pertemuanId}/generate-pin`).set('Authorization', `Bearer ${zToken}`).send({});
    expect(r.status).toBe(403);
  });
});
