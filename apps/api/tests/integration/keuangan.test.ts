import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { createFixtures, resetDb, disconnectDb, loginAs, type Fixtures } from './helpers.js';

const app = createApp();
let f: Fixtures;

beforeAll(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); f = await createFixtures(); });
afterAll(async () => { await resetDb(); await disconnectDb(); });

async function buatTagihan(token: string, jumlah: number) {
  const res = await request(app).post('/akademik/keuangan/tagihan')
    .set('Authorization', `Bearer ${token}`)
    .send({
      mahasiswaId: f.mahasiswa.id, semesterId: f.semester.id,
      jenis: 'spp', deskripsi: 'SPP Test', jumlah, jatuhTempo: '2026-12-31',
    });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe('Keuangan — validasi tanggal jatuh tempo', () => {
  it('jatuhTempo rusak → 400 (bukan 500 Invalid Date)', async () => {
    const akToken = await loginAs(request(app), 'akademik-t@test.id');
    const res = await request(app).post('/akademik/keuangan/tagihan')
      .set('Authorization', `Bearer ${akToken}`)
      .send({ mahasiswaId: f.mahasiswa.id, semesterId: f.semester.id, jenis: 'spp', deskripsi: 'SPP Test', jumlah: 500_000, jatuhTempo: 'bukan-tanggal' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Keuangan — status tagihan hanya dari pembayaran disetujui', () => {
  it('bukti mahasiswa yang masih menunggu TIDAK terhitung sebagai dibayar (view akademik)', async () => {
    const akToken = await loginAs(request(app), 'akademik-t@test.id');
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const tagihanId = await buatTagihan(akToken, 1_000_000);

    // mahasiswa upload bukti 400k → status menunggu
    const up = await request(app).post('/mahasiswa/keuangan/upload-bukti')
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ tagihanId, jumlah: 400_000, tanggalBayar: '2026-01-10', metode: 'transfer_bank', buktiUrl: 'https://bukti.test/a.jpg' });
    expect(up.status).toBe(201);

    // akademik lihat daftar tagihan → dibayar HARUS 0, status belum_bayar
    const list = await request(app).get('/akademik/keuangan/tagihan')
      .set('Authorization', `Bearer ${akToken}`);
    expect(list.status).toBe(200);
    const t = list.body.items.find((x: any) => x.id === tagihanId);
    expect(t.dibayar).toBe(0);          // regresi: dulu 400_000
    expect(t.sisa).toBe(1_000_000);
    expect(t.status).toBe('belum_bayar');
  });

  it('setelah verifikasi setujui → tagihan lunas', async () => {
    const akToken = await loginAs(request(app), 'akademik-t@test.id');
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const tagihanId = await buatTagihan(akToken, 1_000_000);

    const up = await request(app).post('/mahasiswa/keuangan/upload-bukti')
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ tagihanId, jumlah: 1_000_000, tanggalBayar: '2026-01-10', metode: 'transfer_bank', buktiUrl: 'https://bukti.test/a.jpg' });
    const pembayaranId = up.body.id;

    const ver = await request(app).post(`/akademik/keuangan/pembayaran/${pembayaranId}/verifikasi`)
      .set('Authorization', `Bearer ${akToken}`).send({ action: 'setujui' });
    expect(ver.status).toBe(200);

    const tagihan = await prisma.tagihan.findUnique({ where: { id: tagihanId } });
    expect(tagihan!.status).toBe('lunas');
  });

  it('hapus pembayaran disetujui → status dihitung ulang HANYA dari disetujui (menunggu tak dihitung) + audit tercatat', async () => {
    const akToken = await loginAs(request(app), 'akademik-t@test.id');
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const tagihanId = await buatTagihan(akToken, 1_000_000);

    // akademik catat pembayaran manual 600k (langsung disetujui) → cicil
    const bayar = await request(app).post('/akademik/keuangan/pembayaran')
      .set('Authorization', `Bearer ${akToken}`)
      .send({ tagihanId, jumlah: 600_000, tanggalBayar: '2026-01-05', metode: 'tunai' });
    expect(bayar.status).toBe(201);
    let tagihan = await prisma.tagihan.findUnique({ where: { id: tagihanId } });
    expect(tagihan!.status).toBe('cicil');

    // mahasiswa upload bukti 400k → menunggu
    await request(app).post('/mahasiswa/keuangan/upload-bukti')
      .set('Authorization', `Bearer ${mhsToken}`)
      .send({ tagihanId, jumlah: 400_000, tanggalBayar: '2026-01-10', metode: 'transfer_bank', buktiUrl: 'https://bukti.test/b.jpg' });

    // hapus pembayaran manual (600k disetujui) → tersisa hanya 400k menunggu
    const del = await request(app).delete(`/akademik/keuangan/pembayaran/${bayar.body.id}`)
      .set('Authorization', `Bearer ${akToken}`);
    expect(del.status).toBe(204);

    // status HARUS belum_bayar (400k menunggu tak boleh dihitung). Regresi: dulu cicil.
    tagihan = await prisma.tagihan.findUnique({ where: { id: tagihanId } });
    expect(tagihan!.status).toBe('belum_bayar');

    // audit penghapusan pembayaran wajib ada. writeAudit fire-and-forget (void),
    // jadi poll sebentar agar tidak flaky terhadap race commit audit.
    let audit = null;
    for (let i = 0; i < 20 && !audit; i++) {
      audit = await prisma.auditLog.findFirst({ where: { action: 'pembayaran.delete' } });
      if (!audit) await new Promise((r) => setTimeout(r, 50));
    }
    expect(audit).not.toBeNull();
  });

  it('upload bukti dengan skema javascript: ditolak (400) — anti stored-XSS', async () => {
    const akToken = await loginAs(request(app), 'akademik-t@test.id');
    const mhsToken = await loginAs(request(app), f.mahasiswa.nim);
    const tagihanId = await buatTagihan(akToken, 1_000_000);

    const up = await request(app).post('/mahasiswa/keuangan/upload-bukti')
      .set('Authorization', `Bearer ${mhsToken}`)
      // eslint-disable-next-line no-script-url
      .send({ tagihanId, jumlah: 100_000, tanggalBayar: '2026-01-10', metode: 'transfer_bank', buktiUrl: 'javascript:alert(document.cookie)' });
    expect(up.status).toBe(400);
  });
});
