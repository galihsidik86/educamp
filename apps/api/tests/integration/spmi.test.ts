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

describe('SPMI · Standar Mutu CRUD + auto-measure', () => {
  it('akademik dapat create standar mutu dengan target', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).post('/akademik/spmi/standar').set('Authorization', `Bearer ${tok}`).send({
      kode: 'STD-PEND-01',
      nama: 'IPK rata-rata lulusan ≥ 3.00',
      kategori: 'pendidikan',
      deskripsi: 'IPK rata-rata lulusan minimal 3.00 dari skala 4.00',
      satuan: 'IPK',
      targetMin: 3.0,
      ambangCukup: 2.75,
      sumberData: 'ipk_lulusan',
    });
    expect(r.status).toBe(201);
    expect(r.body.kode).toBe('STD-PEND-01');
    expect(r.body.sumberData).toBe('ipk_lulusan');
  });

  it('kode standar duplikat → 409', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    await prisma.standarMutu.create({
      data: { kode: 'STD-DUP', nama: 'Test', kategori: 'pendidikan', deskripsi: 'desc test' },
    });
    const r = await request(app).post('/akademik/spmi/standar').set('Authorization', `Bearer ${tok}`).send({
      kode: 'STD-DUP', nama: 'Dup test', kategori: 'pendidikan', deskripsi: 'desc duplikat',
    });
    expect(r.status).toBe(409);
  });

  it('ukur otomatis IPK lulusan dari yudisium', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    // Seed: 1 mahasiswa + yudisium status 'wisuda' dengan IPK 3.5
    const pw = await prisma.periodeWisuda.create({
      data: { kode: '2026-1', nama: 'Wisuda I 2026', tanggal: new Date('2026-06-01') },
    });
    await prisma.yudisium.create({
      data: {
        mahasiswaId: f.mahasiswa.id, periodeWisudaId: pw.id,
        status: 'wisuda', ipk: 3.5, sksLulus: 144,
        tanggalLulus: new Date('2026-06-01'),
      },
    });
    const std = await prisma.standarMutu.create({
      data: {
        kode: 'STD-IPK', nama: 'IPK Lulusan', kategori: 'pendidikan',
        deskripsi: 'desc', targetMin: 3.0, sumberData: 'ipk_lulusan',
      },
    });
    const r = await request(app).post(`/akademik/spmi/standar/${std.id}/ukur`).set('Authorization', `Bearer ${tok}`).send({
      periode: '2026-1',
    });
    expect(r.status).toBe(200);
    expect(r.body.autoMeasured).toBe(true);
    expect(r.body.pengukuran.nilai).toBe(3.5);
    expect(r.body.pengukuran.status).toBe('tercapai');
  });

  it('ukur otomatis tidak ada data → autoMeasured=false', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const std = await prisma.standarMutu.create({
      data: { kode: 'STD-NODATA', nama: 'NoData', kategori: 'pendidikan', deskripsi: 'd', sumberData: 'ipk_lulusan' },
    });
    const r = await request(app).post(`/akademik/spmi/standar/${std.id}/ukur`).set('Authorization', `Bearer ${tok}`).send({
      periode: '2026-1',
    });
    expect(r.status).toBe(200);
    expect(r.body.autoMeasured).toBe(false);
    expect(r.body.pengukuran.status).toBe('belum_diukur');
  });

  it('input pengukuran manual + eval status berdasarkan target', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const std = await prisma.standarMutu.create({
      data: {
        kode: 'STD-MAN', nama: 'Manual', kategori: 'non_akademik',
        deskripsi: 'd', targetMin: 80, ambangCukup: 70, sumberData: 'manual',
      },
    });
    const r = await request(app).post(`/akademik/spmi/standar/${std.id}/pengukuran`).set('Authorization', `Bearer ${tok}`).send({
      periode: '2025', nilai: 75, catatan: 'Survei internal',
    });
    expect(r.status).toBe(201);
    expect(r.body.nilai).toBe(75);
    expect(r.body.status).toBe('cukup'); // 75 < 80 (min) tapi >= 70 (cukup)
  });

  it('targetMax (lower-is-better) menghitung status terbalik', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const std = await prisma.standarMutu.create({
      data: {
        kode: 'STD-MS', nama: 'Masa studi', kategori: 'pendidikan',
        deskripsi: 'd', targetMax: 4, ambangCukup: 5, sumberData: 'manual',
      },
    });
    const r = await request(app).post(`/akademik/spmi/standar/${std.id}/pengukuran`).set('Authorization', `Bearer ${tok}`).send({
      periode: '2025', nilai: 3.8,
    });
    expect(r.body.status).toBe('tercapai'); // 3.8 <= 4
  });

  it('list standar include pengukuran terakhir', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const std = await prisma.standarMutu.create({
      data: { kode: 'STD-LIST', nama: 'List', kategori: 'pendidikan', deskripsi: 'd' },
    });
    await prisma.pengukuranStandar.create({
      data: { standarId: std.id, periode: '2025', nilai: 90, status: 'tercapai' },
    });
    const r = await request(app).get('/akademik/spmi/standar').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    const item = r.body.items.find((x: any) => x.id === std.id);
    expect(item.pengukuran[0].nilai).toBe(90);
  });
});

describe('SPMI · AMI + Temuan + CAPA', () => {
  it('alur lengkap AMI → temuan KTS → CAPA → verifikasi closed', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);

    // 1. Create AMI
    const amiRes = await request(app).post('/akademik/spmi/ami').set('Authorization', `Bearer ${tok}`).send({
      kode: 'AMI-2026-01',
      nama: 'AMI Periode Ganjil 2025/2026',
      periode: '2025/2026 Ganjil',
      tanggalMulai: '2026-01-15',
      ruangLingkup: 'Audit semua prodi S1',
    });
    expect(amiRes.status).toBe(201);
    const amiId = amiRes.body.id;

    // 2. Add auditor
    const audRes = await request(app).post(`/akademik/spmi/ami/${amiId}/auditor`).set('Authorization', `Bearer ${tok}`).send({
      dosenId: f.dosen.id, peran: 'ketua',
    });
    expect(audRes.status).toBe(201);

    // 3. Add lingkup prodi
    const lingRes = await request(app).post(`/akademik/spmi/ami/${amiId}/lingkup`).set('Authorization', `Bearer ${tok}`).send({
      prodiId: f.prodi.id,
    });
    expect(lingRes.status).toBe(201);

    // 4. Tambah temuan
    const tmnRes = await request(app).post(`/akademik/spmi/ami/${amiId}/temuan`).set('Authorization', `Bearer ${tok}`).send({
      kode: 'TMN-2026-01-001',
      kategori: 'kts',
      deskripsi: 'Beberapa RPS belum mencantumkan pemetaan CPMK ke CPL',
      rekomendasi: 'Update RPS sesuai template OBE',
    });
    expect(tmnRes.status).toBe(201);
    const temuanId = tmnRes.body.id;

    // 5. Buat CAPA
    const capaRes = await request(app).post(`/akademik/spmi/temuan/${temuanId}/capa`).set('Authorization', `Bearer ${tok}`).send({
      akarMasalah: 'Belum ada SOP review RPS sebelum semester',
      rencanaTindakan: 'Susun SOP review RPS dan implementasi review berkala',
      picDosenId: f.dosen.id,
      targetSelesai: '2026-03-31',
    });
    expect(capaRes.status).toBe(201);
    const capaId = capaRes.body.id;

    // 6. Update CAPA → pelaksanaan
    let r = await request(app).patch(`/akademik/spmi/capa/${capaId}`).set('Authorization', `Bearer ${tok}`).send({
      status: 'pelaksanaan',
      realisasiTindakan: 'SOP draft sudah disusun',
    });
    expect(r.status).toBe(200);

    // 7. CAPA → verifikasi
    r = await request(app).patch(`/akademik/spmi/capa/${capaId}`).set('Authorization', `Bearer ${tok}`).send({
      status: 'verifikasi',
      tanggalSelesai: '2026-03-20',
      bukti: 'https://intranet.tazkia.ac.id/sop/rps-review.pdf',
    });
    expect(r.status).toBe(200);

    // 8. Verifikasi setuju → closed
    r = await request(app).post(`/akademik/spmi/capa/${capaId}/verifikasi`).set('Authorization', `Bearer ${tok}`).send({
      setuju: true, catatan: 'Bukti lengkap, sesuai rencana',
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('closed');
  });

  it('CAPA duplikat untuk 1 temuan → 409', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const ami = await prisma.auditMutuInternal.create({
      data: { kode: 'AMI-DUP', nama: 'A', periode: '2026', tanggalMulai: new Date() },
    });
    const tmn = await prisma.temuanAmi.create({
      data: { amiId: ami.id, kode: 'T-01', kategori: 'kts', deskripsi: 'test' },
    });
    await prisma.tindakLanjutCapa.create({
      data: { temuanId: tmn.id, rencanaTindakan: 'rencana awal', targetSelesai: new Date() },
    });
    const r = await request(app).post(`/akademik/spmi/temuan/${tmn.id}/capa`).set('Authorization', `Bearer ${tok}`).send({
      rencanaTindakan: 'rencana baru', targetSelesai: '2026-03-31',
    });
    expect(r.status).toBe(409);
  });

  it('list CAPA overdue', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const ami = await prisma.auditMutuInternal.create({
      data: { kode: 'AMI-OD', nama: 'A', periode: '2026', tanggalMulai: new Date() },
    });
    const tmn = await prisma.temuanAmi.create({
      data: { amiId: ami.id, kode: 'T-OD', kategori: 'kts', deskripsi: 'test' },
    });
    await prisma.tindakLanjutCapa.create({
      data: {
        temuanId: tmn.id, rencanaTindakan: 'rencana',
        targetSelesai: new Date('2020-01-01'), // overdue
        status: 'pelaksanaan',
      },
    });
    const r = await request(app).get('/akademik/spmi/capa?overdue=true').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('SPMI · RTM', () => {
  it('create RTM + tambah keputusan + update status keputusan', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const rtmRes = await request(app).post('/akademik/spmi/rtm').set('Authorization', `Bearer ${tok}`).send({
      kode: 'RTM-2026-01',
      judul: 'RTM Semester Ganjil 2025/2026',
      tanggal: '2026-02-15',
      agenda: 'Tinjauan capaian standar mutu + tindak lanjut AMI',
      peserta: 'Rektor, Wakil Rektor, Dekan, Kaprodi',
    });
    expect(rtmRes.status).toBe(201);
    const rtmId = rtmRes.body.id;

    const kepRes = await request(app).post(`/akademik/spmi/rtm/${rtmId}/keputusan`).set('Authorization', `Bearer ${tok}`).send({
      deskripsi: 'Implementasi sistem audit RPS digital sebelum awal semester',
      picCatatan: 'Wakil Rektor I',
      targetSelesai: '2026-04-30',
    });
    expect(kepRes.status).toBe(201);

    const upRes = await request(app).patch(`/akademik/spmi/keputusan/${kepRes.body.id}`).set('Authorization', `Bearer ${tok}`).send({
      status: 'in_progress',
      catatan: 'Sudah mulai dilaksanakan',
    });
    expect(upRes.status).toBe(200);
    expect(upRes.body.status).toBe('in_progress');
  });
});

describe('SPMI · Survei Kepuasan + public response', () => {
  it('flow lengkap: create survei → pertanyaan → publish → public response', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);

    const srvRes = await request(app).post('/akademik/spmi/survei').set('Authorization', `Bearer ${tok}`).send({
      kode: 'SRV-2026-AKD',
      judul: 'Survei Kepuasan Layanan Akademik 2026',
      kategori: 'layanan_akademik',
      target: 'mahasiswa',
    });
    expect(srvRes.status).toBe(201);
    const surveiId = srvRes.body.id;
    const tokenPublic = srvRes.body.tokenPublic;
    expect(tokenPublic).toBeTruthy();
    expect(tokenPublic.length).toBeGreaterThanOrEqual(12);

    // Tambah 2 pertanyaan: likert + open
    const p1 = await request(app).post(`/akademik/spmi/survei/${surveiId}/pertanyaan`).set('Authorization', `Bearer ${tok}`).send({
      urutan: 1, pertanyaan: 'Bagaimana kecepatan respon layanan BAAK?', jenis: 'likert', wajib: true,
    });
    const p2 = await request(app).post(`/akademik/spmi/survei/${surveiId}/pertanyaan`).set('Authorization', `Bearer ${tok}`).send({
      urutan: 2, pertanyaan: 'Saran perbaikan layanan akademik:', jenis: 'open', wajib: false,
    });
    expect(p1.status).toBe(201);
    expect(p2.status).toBe(201);

    // Publish
    const pub = await request(app).patch(`/akademik/spmi/survei/${surveiId}`).set('Authorization', `Bearer ${tok}`).send({
      status: 'publish',
    });
    expect(pub.status).toBe(200);

    // Public: GET kuesioner via token
    const pubGet = await request(app).get(`/verifikasi/survei/${tokenPublic}`);
    expect(pubGet.status).toBe(200);
    expect(pubGet.body.pertanyaan.length).toBe(2);

    // Public: POST response
    const pubPost = await request(app).post(`/verifikasi/survei/${tokenPublic}`).send({
      rolePelapor: 'mahasiswa',
      jawaban: [
        { pertanyaanId: p1.body.id, nilai: 4 },
        { pertanyaanId: p2.body.id, teks: 'Tingkatkan respon WhatsApp BAAK' },
      ],
    });
    expect(pubPost.status).toBe(201);
    expect(pubPost.body.ok).toBe(true);

    // Akademik lihat hasil
    const hasilRes = await request(app).get(`/akademik/spmi/survei/${surveiId}/hasil`).set('Authorization', `Bearer ${tok}`);
    expect(hasilRes.status).toBe(200);
    expect(hasilRes.body.totalResponse).toBe(1);
    const likert = hasilRes.body.hasil.find((h: any) => h.pertanyaanId === p1.body.id);
    expect(likert.rataRata).toBe(4);
    expect(likert.distribusi[4]).toBe(1);
  });

  it('public response: pertanyaan wajib tidak dijawab → 400', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const srv = await prisma.kuesionerKepuasan.create({
      data: {
        kode: 'SRV-WAJIB', judul: 'Wajib test', kategori: 'layanan_akademik',
        tokenPublic: 'TOKEN_WAJIB_123', status: 'publish',
      },
    });
    const p = await prisma.pertanyaanKepuasan.create({
      data: { kuesionerId: srv.id, pertanyaan: 'Pertanyaan wajib?', jenis: 'likert', wajib: true },
    });

    const r = await request(app).post(`/verifikasi/survei/${srv.tokenPublic}`).send({
      jawaban: [{ pertanyaanId: p.id }],
    });
    expect(r.status).toBe(400);

    // Tambahan: verifikasi tok variable used to satisfy lint
    expect(typeof tok).toBe('string');
  });

  it('survei status draft tidak dapat diakses publik', async () => {
    const srv = await prisma.kuesionerKepuasan.create({
      data: {
        kode: 'SRV-DRAFT', judul: 'Draft test', kategori: 'layanan_akademik',
        tokenPublic: 'TOKEN_DRAFT_12345', status: 'draft',
      },
    });
    const r = await request(app).get(`/verifikasi/survei/${srv.tokenPublic}`);
    expect(r.status).toBe(404);
  });
});

describe('SPMI · Dashboard ringkasan', () => {
  it('menghitung penetapan/evaluasi/AMI/CAPA/RTM/survei', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    // Seed minimal
    const std = await prisma.standarMutu.create({
      data: { kode: 'STD-D1', nama: 'D1', kategori: 'pendidikan', deskripsi: 'd', isAktif: true },
    });
    await prisma.pengukuranStandar.create({
      data: { standarId: std.id, periode: '2025', nilai: 90, status: 'tercapai' },
    });
    await prisma.standarMutu.create({
      data: { kode: 'STD-D2', nama: 'D2', kategori: 'penelitian', deskripsi: 'd', isAktif: true },
    });

    const r = await request(app).get('/akademik/spmi/dashboard').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body.penetapan.totalStandar).toBeGreaterThanOrEqual(2);
    expect(r.body.evaluasi.capaian.tercapai).toBeGreaterThanOrEqual(1);
    expect(r.body.evaluasi.capaian.belum_diukur).toBeGreaterThanOrEqual(1);
  });
});

describe('SPMI · Laporan', () => {
  it('laporan pencapaian per periode include semua standar + pengukuran', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const s1 = await prisma.standarMutu.create({
      data: { kode: 'STD-LAP-1', nama: 'Lap 1', kategori: 'pendidikan', deskripsi: 'd', targetMin: 3.0, isAktif: true },
    });
    await prisma.standarMutu.create({
      data: { kode: 'STD-LAP-2', nama: 'Lap 2', kategori: 'penelitian', deskripsi: 'd', isAktif: true },
    });
    await prisma.pengukuranStandar.create({
      data: { standarId: s1.id, periode: '2025', nilai: 3.5, status: 'tercapai' },
    });

    const r = await request(app).get('/akademik/spmi/laporan/standar?periode=2025').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body.periode).toBe('2025');
    expect(r.body.totalStandar).toBeGreaterThanOrEqual(2);
    expect(r.body.ringkasan.tercapai).toBeGreaterThanOrEqual(1);
    expect(r.body.ringkasan.belum_diukur).toBeGreaterThanOrEqual(1);
    const item1 = r.body.items.find((x: any) => x.kode === 'STD-LAP-1');
    expect(item1.pengukuran).not.toBeNull();
    expect(item1.pengukuran.nilai).toBe(3.5);
    const item2 = r.body.items.find((x: any) => x.kode === 'STD-LAP-2');
    expect(item2.pengukuran).toBeNull();
  });

  it('laporan pencapaian tanpa periode → 400', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    const r = await request(app).get('/akademik/spmi/laporan/standar').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(400);
  });

  it('laporan PPEPP konsolidasi penetapan + evaluasi + AMI + CAPA + RTM + survei', async () => {
    const tok = await loginAs(request(app), f.akademikUser.email);
    // Seed: 1 standar, 1 AMI dengan 1 temuan + CAPA, 1 RTM, 1 survei
    const std = await prisma.standarMutu.create({
      data: { kode: 'STD-PP', nama: 'PPEPP test', kategori: 'pendidikan', deskripsi: 'd', isAktif: true, targetMin: 80 },
    });
    await prisma.pengukuranStandar.create({
      data: { standarId: std.id, periode: '2026-1', nilai: 85, status: 'tercapai' },
    });
    const ami = await prisma.auditMutuInternal.create({
      data: { kode: 'AMI-PP', nama: 'AMI PPEPP', periode: '2026-1', tanggalMulai: new Date('2026-02-01') },
    });
    const tmn = await prisma.temuanAmi.create({
      data: { amiId: ami.id, kode: 'TMN-PP-1', kategori: 'kts', deskripsi: 'Test temuan' },
    });
    await prisma.tindakLanjutCapa.create({
      data: {
        temuanId: tmn.id, rencanaTindakan: 'Rencana test',
        targetSelesai: new Date('2027-01-01'),
        status: 'pelaksanaan',
      },
    });
    await prisma.rapatTinjauanManajemen.create({
      data: { kode: 'RTM-PP', judul: 'RTM PPEPP', tanggal: new Date(), agenda: 'agenda test' },
    });
    await prisma.kuesionerKepuasan.create({
      data: { kode: 'SRV-PP', judul: 'Survei PP', kategori: 'layanan_akademik', tokenPublic: 'TOKEN_PPEPP_123', status: 'publish' },
    });

    const r = await request(app).get('/akademik/spmi/laporan/ppepp?periode=2026-1').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body.periode).toBe('2026-1');
    expect(r.body.penetapan.totalStandar).toBeGreaterThanOrEqual(1);
    expect(r.body.evaluasi.capaian.tercapai).toBeGreaterThanOrEqual(1);
    expect(r.body.ami.length).toBeGreaterThanOrEqual(1);
    expect(r.body.ami[0].ringkasanTemuan.kts).toBe(1);
    expect(r.body.pengendalian.capaAktif.length).toBeGreaterThanOrEqual(1);
    expect(r.body.peningkatan.rtm.length).toBeGreaterThanOrEqual(1);
    expect(r.body.survei.total).toBeGreaterThanOrEqual(1);
  });
});
