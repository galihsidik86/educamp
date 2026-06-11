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

async function openPrsAndApprove() {
  // Tutup KRS, buka PRS, lalu set semua KRS Aisyah disetujui (lewat add+submit+approve).
  const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
  await request(app).post('/mahasiswa/krs/items').set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
  await request(app).post('/mahasiswa/krs/items').set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas2.id });
  await request(app).post('/mahasiswa/krs/submit').set('Authorization', `Bearer ${mhsToken}`).send({});

  const dosenToken = await loginAs(request(app), f.dosenUser.email);
  await request(app)
    .post(`/dosen/bimbingan/${f.mahasiswa.id}/krs/validasi`)
    .set('Authorization', `Bearer ${dosenToken}`)
    .send({ action: 'setujui' });

  // Set periode: KRS sudah ditutup, PRS aktif sekarang
  const now = Date.now();
  await prisma.semester.update({
    where: { id: f.semester.id },
    data: {
      krsMulai: new Date(now - 14 * 24 * 3600 * 1000),
      krsSelesai: new Date(now - 1 * 24 * 3600 * 1000),
      prsMulai: new Date(now - 1 * 3600 * 1000),
      prsSelesai: new Date(now + 7 * 24 * 3600 * 1000),
    },
  });
  return mhsToken;
}

describe('KRS withdraw — selama periode KRS', () => {
  it('mahasiswa submit → withdraw → kembali ke draft', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/krs/items').set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    const sub = await request(app).post('/mahasiswa/krs/submit').set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(sub.status).toBe(200);

    const before = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(before.body.status).toBe('diajukan');

    const wd = await request(app).post('/mahasiswa/krs/withdraw').set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(wd.status).toBe(200);
    expect(wd.body.withdrawn).toBe(1);

    const after = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(after.body.status).toBe('draft');
  });

  it('withdraw tanpa diajukan → 400', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const wd = await request(app).post('/mahasiswa/krs/withdraw').set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(wd.status).toBe(400);
  });
});

describe('KRS PRS — drop disetujui + re-add', () => {
  it('drop kelas saat PRS → status ditolak dengan catatan', async () => {
    const mhsToken = await openPrsAndApprove();
    const krs = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    expect(krs.body.inPrsPeriode).toBe(true);

    const itemId = krs.body.items.find((it: any) => it.kelas.kodeMK === 'TST-101').id;
    const drop = await request(app).post(`/mahasiswa/krs/items/${itemId}/drop`).set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(drop.status).toBe(200);

    const after = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    const dropped = after.body.items.find((it: any) => it.kelas.kodeMK === 'TST-101');
    expect(dropped.status).toBe('ditolak');
    expect(dropped.catatan).toMatch(/PRS/);
    // totalSks turun (filter ditolak)
    expect(after.body.totalSks).toBe(3);
  });

  it('drop saat periode bukan PRS → 400', async () => {
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    await request(app).post('/mahasiswa/krs/items').set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    const list = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    const drop = await request(app).post(`/mahasiswa/krs/items/${list.body.items[0].id}/drop`).set('Authorization', `Bearer ${mhsToken}`).send({});
    expect(drop.status).toBe(400);
  });

  it('re-add kelas yang sudah didrop → reuse record (tidak melanggar unique constraint)', async () => {
    const mhsToken = await openPrsAndApprove();
    const krs = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    const itemId = krs.body.items.find((it: any) => it.kelas.kodeMK === 'TST-101').id;
    await request(app).post(`/mahasiswa/krs/items/${itemId}/drop`).set('Authorization', `Bearer ${mhsToken}`).send({});

    const re = await request(app).post('/mahasiswa/krs/items').set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    expect(re.status).toBe(201);
    // Endpoint reuse record yang sama
    expect(re.body.id).toBe(itemId);

    const after = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    const item = after.body.items.find((it: any) => it.kelas.kodeMK === 'TST-101');
    expect(item.status).toBe('draft');
    expect(item.catatan).toBeNull();
  });
});

describe('Riwayat KRS', () => {
  it('GET /mahasiswa/krs/riwayat hanya menampilkan semester selain semester aktif', async () => {
    // Buat semester sebelumnya + KRS disetujui
    const taLama = await prisma.tahunAjaran.create({
      data: { kode: '2024/2025', nama: '2024/2025', tahunMulai: 2024, tahunSelesai: 2025 },
    });
    const semLama = await prisma.semester.create({
      data: { kode: '20242', jenis: 'genap', tahunAjaranId: taLama.id },
    });
    await prisma.krs.create({
      data: { mahasiswaId: f.mahasiswa.id, kelasId: f.kelas1.id, semesterId: semLama.id, status: 'disetujui' },
    });

    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const riwayat = await request(app).get('/mahasiswa/krs/riwayat').set('Authorization', `Bearer ${mhsToken}`);
    expect(riwayat.status).toBe(200);
    expect(riwayat.body.semesters).toHaveLength(1);
    expect(riwayat.body.semesters[0].semester.kode).toBe('20242');
    expect(riwayat.body.semesters[0].items[0].kelas.kodeMK).toBe('TST-101');
  });
});

describe('Validasi PRS oleh akademik', () => {
  it('detail KRS dari akademik menandai item PRS dengan tipe yang benar', async () => {
    const mhsToken = await openPrsAndApprove();
    // drop kelas1, add lagi (akan jadi draft), submit lagi
    const before = await request(app).get('/mahasiswa/krs').set('Authorization', `Bearer ${mhsToken}`);
    const itemKelas1 = before.body.items.find((it: any) => it.kelas.kodeMK === 'TST-101').id;
    await request(app).post(`/mahasiswa/krs/items/${itemKelas1}/drop`).set('Authorization', `Bearer ${mhsToken}`).send({});
    await request(app).post('/mahasiswa/krs/items').set('Authorization', `Bearer ${mhsToken}`).send({ kelasId: f.kelas1.id });
    await request(app).post('/mahasiswa/krs/submit').set('Authorization', `Bearer ${mhsToken}`).send({});

    const akademikToken = await loginAs(request(app), f.akademikUser.email);
    const list = await request(app).get('/akademik/krs').set('Authorization', `Bearer ${akademikToken}`);
    const me = list.body.items.find((m: any) => m.id === f.mahasiswa.id);
    expect(me.isPrsRevisi).toBe(true);

    const detail = await request(app).get(`/akademik/krs/${f.mahasiswa.id}`).set('Authorization', `Bearer ${akademikToken}`);
    expect(detail.body.inPrsPeriode).toBe(true);
    const items = detail.body.items as Array<{ status: string; tipe: string; kelas: { kodeMK: string } }>;
    const kelas1Item = items.find((it) => it.kelas.kodeMK === 'TST-101');
    // setelah drop & re-add → status diajukan, tipe prs-tambah
    expect(kelas1Item?.status).toBe('diajukan');
    expect(kelas1Item?.tipe).toBe('prs-tambah');
    const kelas2Item = items.find((it) => it.kelas.kodeMK === 'TST-102');
    expect(kelas2Item?.status).toBe('disetujui');
    expect(kelas2Item?.tipe).toBe('krs');
  });
});
