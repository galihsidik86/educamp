import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
  f = await createFixtures();
});

afterAll(async () => {
  await resetDb();
  await disconnectDb();
});

describe('KRS happy path: penawaran → add → submit → DPA approve', () => {
  it('mahasiswa lihat penawaran kelas prodi-nya', async () => {
    const token = await loginAs(request(app), f.mahasiswa.nim);
    const res = await request(app).get('/mahasiswa/krs/penawaran').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.kelas).toHaveLength(2);
    expect(res.body.kelas.map((k: any) => k.kodeMK).sort()).toEqual(['TST-101', 'TST-102']);
  });

  it('add 2 kelas → submit → DPA setujui → status disetujui', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);

    // 1. add 2 kelas
    const add1 = await request(app).post('/mahasiswa/krs/items')
      .set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    expect(add1.status).toBe(201);

    const add2 = await request(app).post('/mahasiswa/krs/items')
      .set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas2.id });
    expect(add2.status).toBe(201);

    // 2. cek total SKS & status draft
    const krs = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(krs.status).toBe(200);
    expect(krs.body.totalSks).toBe(6);
    expect(krs.body.status).toBe('draft');
    expect(krs.body.items).toHaveLength(2);

    // 3. submit
    const submit = await request(app).post('/mahasiswa/krs/submit')
      .set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(submit.status).toBe(200);
    expect(submit.body.submitted).toBe(2);

    const afterSubmit = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(afterSubmit.body.status).toBe('diajukan');

    // 4. DPA setujui semua
    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const setujui = await request(app)
      .post(`/dosen/bimbingan/${f.mahasiswa.id}/krs/validasi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ action: 'setujui' });
    expect(setujui.status).toBe(200);
    expect(setujui.body.updated).toBe(2);

    // 5. mahasiswa status → disetujui
    const final = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(final.body.status).toBe('disetujui');

    // 6. jadwal sekarang isi 2 entri
    const jadwal = await request(app).get('/mahasiswa/jadwal').set('Authorization', `Bearer ${mhsToken}`);
    expect(jadwal.body.jadwal).toHaveLength(2);

    // 7. notifikasi terbuat untuk mahasiswa
    // beri waktu fire-and-forget (writeAudit + notif) selesai
    await new Promise((r) => setTimeout(r, 200));
    const notif = await prisma.notifikasi.findMany({
      where: { userId: f.mahasiswaUser.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif.length).toBeGreaterThan(0);
    expect(notif[0]!.title).toMatch(/disetujui/i);
  });

  it('add MK yang sama dua kali → 409 Conflict', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/krs/items')
      .set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });

    const dup = await request(app).post('/mahasiswa/krs/items')
      .set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    expect(dup.status).toBe(409);
  });

  it('submit tanpa draft → 400', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const submit = await request(app).post('/mahasiswa/krs/submit')
      .set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(submit.status).toBe(400);
  });

  it('DPA tolak KRS dengan catatan', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/krs/items')
      .set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    await request(app).post('/mahasiswa/krs/submit')
      .set('Authorization', `Bearer ${mhsToken}`).send({});

    const dosenToken = await loginAs(request(app), f.dosenUser.email);
    const tolak = await request(app)
      .post(`/dosen/bimbingan/${f.mahasiswa.id}/krs/validasi`)
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ action: 'tolak', catatan: 'Konsultasikan dulu' });
    expect(tolak.status).toBe(200);

    const final = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(final.body.status).toBe('ditolak');
    expect(final.body.items[0].status).toBe('ditolak');
  });
});

describe('audit log dicatat', () => {
  it('login sukses → AuditLog auth.login.success', async () => {
    await request(app).post('/auth/login').send({
      identifier: f.mahasiswaUser.email, password: f.password,
    });
    await new Promise((r) => setTimeout(r, 200));
    const log = await prisma.auditLog.findFirst({
      where: { action: 'auth.login.success', actorId: f.mahasiswaUser.id },
    });
    expect(log).not.toBeNull();
  });

  it('login gagal → AuditLog auth.login.fail', async () => {
    const resp = await request(app).post('/auth/login').send({
      identifier: f.mahasiswaUser.email, password: 'pw-salah-yang-panjang',
    });
    expect(resp.status).toBe(401);
    await new Promise((r) => setTimeout(r, 200));
    const log = await prisma.auditLog.findFirst({
      where: { action: 'auth.login.fail' },
    });
    expect(log).not.toBeNull();
  });
});
