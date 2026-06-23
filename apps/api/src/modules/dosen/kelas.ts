import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { angkaToHuruf, hurufToBobot } from '../../lib/grade.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';
import { enqueueFeederChange, buildFeederPayload } from '../../lib/feeder/queue.js';

export const kelasRouter = Router();

/**
 * List kelas dosen — default semester aktif, bisa override via ?semesterId.
 */
kelasRouter.get('/kelas', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;

  const kelas = await prisma.kelas.findMany({
    where: {
      semesterId,
      OR: [{ dosenId: d.id }, { team: { some: { dosenId: d.id } } }],
    },
    include: {
      mataKuliah: true,
      ruangan: true,
      semester: { include: { tahunAjaran: true } },
      team: { where: { dosenId: d.id }, select: { peran: true } },
      _count: { select: { krs: { where: { status: { in: ['diajukan', 'disetujui'] } } } } },
    },
    orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
  });

  res.json({
    kelas: kelas.map((k) => ({
      id: k.id,
      kodeMK: k.mataKuliah.kode,
      namaMK: k.mataKuliah.nama,
      sks: k.mataKuliah.sks,
      kodeKelas: k.kodeKelas,
      hari: k.hari,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai,
      ruangan: k.ruangan?.kode ?? null,
      pesertaCount: k._count.krs,
      semester: `${k.semester.jenis} ${k.semester.tahunAjaran.kode}`,
      peran: k.team[0]?.peran ?? (k.dosenId === d.id ? 'lead' : 'anggota'),
    })),
  });
});

/**
 * Detail kelas + peserta + nilai (untuk input nilai).
 * Hanya boleh diakses oleh dosen pengampu.
 */
kelasRouter.get('/kelas/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.kelas.findUnique({
    where: { id: req.params.id },
    include: {
      mataKuliah: true,
      ruangan: true,
      semester: { include: { tahunAjaran: true } },
      team: {
        include: { dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } } },
      },
      krs: {
        where: { status: { in: ['diajukan', 'disetujui'] } },
        include: {
          mahasiswa: { select: { id: true, nim: true, nama: true, angkatan: true } },
          nilai: true,
        },
        orderBy: { mahasiswa: { nim: 'asc' } },
      },
      bobotNilai: true,
    },
  });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  const peran = await requireKelasOwnership(d.id, k.id);

  res.json({
    kelas: {
      id: k.id,
      kodeMK: k.mataKuliah.kode,
      namaMK: k.mataKuliah.nama,
      sks: k.mataKuliah.sks,
      kodeKelas: k.kodeKelas,
      hari: k.hari,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai,
      ruangan: k.ruangan?.kode ?? null,
      semester: { kode: k.semester.kode, nama: `${k.semester.jenis} ${k.semester.tahunAjaran.kode}` },
      periodeNilai: {
        mulai: k.semester.nilaiMulai,
        selesai: k.semester.nilaiSelesai,
      },
      peran,
      team: k.team.map((t) => ({
        dosenId: t.dosenId,
        nidn: t.dosen.nidn,
        nama: t.dosen.nama,
        gelarDepan: t.dosen.gelarDepan,
        gelarBelakang: t.dosen.gelarBelakang,
        peran: t.peran,
      })),
      bobotNilai: k.bobotNilai
        ? {
            tugas: k.bobotNilai.bobotTugas,
            uts: k.bobotNilai.bobotUts,
            uas: k.bobotNilai.bobotUas,
            praktikum: k.bobotNilai.bobotPraktikum,
            kehadiran: k.bobotNilai.bobotKehadiran,
          }
        : null,
    },
    peserta: k.krs.map((r) => ({
      krsId: r.id,
      statusKrs: r.status,
      mahasiswa: r.mahasiswa,
      nilai: r.nilai
        ? {
            tugas: r.nilai.tugas,
            uts: r.nilai.uts,
            uas: r.nilai.uas,
            praktikum: r.nilai.praktikum,
            kehadiran: r.nilai.kehadiran,
            nilaiAngka: r.nilai.nilaiAngka,
            nilaiHuruf: r.nilai.nilaiHuruf,
            bobot: r.nilai.bobot,
            status: r.nilai.status,
          }
        : null,
    })),
  });
});

const nilaiUpsertSchema = z.object({
  tugas: z.number().min(0).max(100).nullable().optional(),
  uts: z.number().min(0).max(100).nullable().optional(),
  uas: z.number().min(0).max(100).nullable().optional(),
  praktikum: z.number().min(0).max(100).nullable().optional(),
  kehadiran: z.number().min(0).max(100).nullable().optional(),
  nilaiAngka: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(['belum', 'draft', 'finalized']).optional(),
});

/**
 * Upsert nilai untuk krsId tertentu.
 * Otorisasi: dosen pengampu kelas dari KRS tsb.
 * Side-effect: hitung huruf+bobot dari nilaiAngka jika diisi.
 */
kelasRouter.patch('/nilai/:krsId', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const body = nilaiUpsertSchema.parse(req.body);

  const krs = await prisma.krs.findUnique({
    where: { id: req.params.krsId },
    include: { kelas: true },
  });
  if (!krs) throw NotFound('KRS tidak ditemukan');
  await requireKelasOwnership(d.id, krs.kelasId);

  // Hitung huruf+bobot kalau angka diset
  let nilaiHuruf: string | null | undefined;
  let bobot: number | null | undefined;
  if (body.nilaiAngka !== undefined) {
    if (body.nilaiAngka === null) {
      nilaiHuruf = null;
      bobot = null;
    } else {
      const h = angkaToHuruf(body.nilaiAngka);
      nilaiHuruf = h;
      bobot = hurufToBobot(h);
    }
  }

  if (body.status === 'finalized' && body.nilaiAngka == null) {
    // cek apakah sudah ada angka di DB
    const existing = await prisma.nilai.findUnique({ where: { krsId: krs.id } });
    if (!existing?.nilaiAngka) {
      throw BadRequest('Nilai angka wajib diisi sebelum finalisasi');
    }
  }

  const before = await prisma.nilai.findUnique({ where: { krsId: krs.id } });
  const nilai = await prisma.nilai.upsert({
    where: { krsId: krs.id },
    create: {
      krsId: krs.id,
      mahasiswaId: krs.mahasiswaId,
      tugas: body.tugas ?? null,
      uts: body.uts ?? null,
      uas: body.uas ?? null,
      praktikum: body.praktikum ?? null,
      kehadiran: body.kehadiran ?? null,
      nilaiAngka: body.nilaiAngka ?? null,
      nilaiHuruf: nilaiHuruf ?? null,
      bobot: bobot ?? null,
      status: body.status ?? 'draft',
    },
    update: {
      ...(body.tugas !== undefined && { tugas: body.tugas }),
      ...(body.uts !== undefined && { uts: body.uts }),
      ...(body.uas !== undefined && { uas: body.uas }),
      ...(body.praktikum !== undefined && { praktikum: body.praktikum }),
      ...(body.kehadiran !== undefined && { kehadiran: body.kehadiran }),
      ...(body.nilaiAngka !== undefined && { nilaiAngka: body.nilaiAngka }),
      ...(nilaiHuruf !== undefined && { nilaiHuruf }),
      ...(bobot !== undefined && { bobot }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  const isFinalize = body.status === 'finalized' && before?.status !== 'finalized';
  void writeAudit(req, {
    action: isFinalize ? 'nilai.finalize' : 'nilai.update',
    entity: 'krs',
    entityId: krs.id,
    metadata: {
      kelasId: krs.kelasId,
      mahasiswaId: krs.mahasiswaId,
      before: before ? { nilaiAngka: before.nilaiAngka, nilaiHuruf: before.nilaiHuruf, status: before.status } : null,
      after: { nilaiAngka: nilai.nilaiAngka, nilaiHuruf: nilai.nilaiHuruf, status: nilai.status },
    },
  });

  // notif hanya saat finalize (transisi)
  if (isFinalize) {
    void (async () => {
      const userId = await userIdFromMahasiswa(krs.mahasiswaId);
      if (!userId) return;
      const kelasInfo = await prisma.kelas.findUnique({
        where: { id: krs.kelasId },
        include: { mataKuliah: true },
      });
      await createNotifikasi({
        userId,
        title: `Nilai ${kelasInfo?.mataKuliah.kode ?? 'MK'} telah dirilis`,
        body: `Nilai akhir ${kelasInfo?.mataKuliah.nama ?? ''}: ${nilai.nilaiHuruf ?? '-'} (${nilai.nilaiAngka ?? '-'}). Lihat detail di Nilai & Transkrip.`,
        type: 'nilai',
        link: '/mahasiswa/nilai',
        entity: 'nilai',
        entityId: nilai.id,
        sendEmail: true,
      });
    })();

    // Feeder sync: kirim nilai final ke outbox
    void (async () => {
      const payload = await buildFeederPayload('nilai', nilai.id);
      if (payload) {
        await enqueueFeederChange({
          entity: 'nilai',
          entityId: nilai.id,
          operation: nilai.feederId ? 'update' : 'create',
          payload,
        });
      }
    })();
  }

  res.json(nilai);
});

/**
 * Batch finalize semua nilai di satu kelas.
 * Hanya finalize yang sudah punya nilaiAngka dan belum berstatus 'finalized'.
 * Skip yang masih kosong (report ke response).
 */
const nilaiImportRowSchema = z.object({
  nim: z.string().min(1),
  tugas: z.coerce.number().min(0).max(100).optional().nullable(),
  uts: z.coerce.number().min(0).max(100).optional().nullable(),
  uas: z.coerce.number().min(0).max(100).optional().nullable(),
  praktikum: z.coerce.number().min(0).max(100).optional().nullable(),
  kehadiran: z.coerce.number().min(0).max(100).optional().nullable(),
  nilaiAngka: z.coerce.number().min(0).max(100).optional().nullable(),
  status: z.enum(['belum', 'draft', 'finalized']).optional(),
});
const nilaiImportBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullable().optional())).max(500),
});

/**
 * Bulk import nilai untuk semua peserta kelas via Excel.
 * Lookup KRS by NIM + kelasId. Skip baris kalau NIM tidak ada di peserta.
 * Otomatis hitung huruf+bobot dari nilaiAngka. Status default 'draft'.
 */
kelasRouter.post('/kelas/:kelasId/nilai/import', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const { rows } = nilaiImportBodySchema.parse(req.body);
  if (rows.length === 0) throw BadRequest('Tidak ada baris untuk diimpor');

  const krsList = await prisma.krs.findMany({
    where: { kelasId: req.params.kelasId, status: 'disetujui' },
    include: { mahasiswa: { select: { id: true, nim: true } } },
  });
  const krsByNim = new Map(krsList.map((k) => [k.mahasiswa.nim, k]));

  type ImportResult = { row: number; key: string | null; status: 'created' | 'failed'; message?: string };
  const results: ImportResult[] = [];
  let updated = 0; let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    const rowNo = i + 1;
    const clean = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' || v == null ? undefined : v]),
    );
    const parsed = nilaiImportRowSchema.safeParse(clean);
    if (!parsed.success) {
      failed++;
      results.push({ row: rowNo, key: (clean.nim as string | undefined) ?? null, status: 'failed', message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') });
      continue;
    }
    const r = parsed.data;
    const krs = krsByNim.get(r.nim);
    if (!krs) { failed++; results.push({ row: rowNo, key: r.nim, status: 'failed', message: `NIM tidak terdaftar di kelas ini: ${r.nim}` }); continue; }

    let nilaiHuruf: string | null | undefined;
    let bobot: number | null | undefined;
    if (r.nilaiAngka != null) {
      const h = angkaToHuruf(r.nilaiAngka);
      nilaiHuruf = h;
      bobot = hurufToBobot(h);
    }
    if (r.status === 'finalized' && r.nilaiAngka == null) {
      // Cek existing
      const existing = await prisma.nilai.findUnique({ where: { krsId: krs.id } });
      if (!existing?.nilaiAngka) {
        failed++;
        results.push({ row: rowNo, key: r.nim, status: 'failed', message: 'Tidak bisa finalisasi tanpa nilai angka' });
        continue;
      }
    }
    try {
      await prisma.nilai.upsert({
        where: { krsId: krs.id },
        create: {
          krsId: krs.id,
          mahasiswaId: krs.mahasiswaId,
          tugas: r.tugas ?? null,
          uts: r.uts ?? null,
          uas: r.uas ?? null,
          praktikum: r.praktikum ?? null,
          kehadiran: r.kehadiran ?? null,
          nilaiAngka: r.nilaiAngka ?? null,
          nilaiHuruf: nilaiHuruf ?? null,
          bobot: bobot ?? null,
          status: r.status ?? 'draft',
        },
        update: {
          ...(r.tugas !== undefined && { tugas: r.tugas }),
          ...(r.uts !== undefined && { uts: r.uts }),
          ...(r.uas !== undefined && { uas: r.uas }),
          ...(r.praktikum !== undefined && { praktikum: r.praktikum }),
          ...(r.kehadiran !== undefined && { kehadiran: r.kehadiran }),
          ...(r.nilaiAngka !== undefined && { nilaiAngka: r.nilaiAngka }),
          ...(nilaiHuruf !== undefined && { nilaiHuruf }),
          ...(bobot !== undefined && { bobot }),
          ...(r.status !== undefined && { status: r.status }),
        },
      });
      updated++;
      results.push({ row: rowNo, key: r.nim, status: 'created' });
    } catch (e: any) {
      failed++;
      results.push({ row: rowNo, key: r.nim, status: 'failed', message: e?.message ?? 'gagal upsert' });
    }
  }
  res.json({ totalRows: rows.length, created: updated, failed, results });
});

kelasRouter.post('/kelas/:kelasId/nilai/finalize-all', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);

  const krsList = await prisma.krs.findMany({
    where: { kelasId: req.params.kelasId, status: 'disetujui' },
    include: { nilai: true, kelas: { include: { mataKuliah: true } } },
  });

  const siapFinalize = krsList.filter((k) => k.nilai && k.nilai.nilaiAngka != null && k.nilai.status !== 'finalized');
  const belumDinilai = krsList.filter((k) => !k.nilai || k.nilai.nilaiAngka == null);
  const sudahFinal = krsList.filter((k) => k.nilai?.status === 'finalized');

  if (siapFinalize.length === 0) {
    return res.json({
      ok: true,
      finalized: 0,
      belumDinilai: belumDinilai.length,
      sudahFinal: sudahFinal.length,
      message: belumDinilai.length > 0
        ? `Tidak ada yang difinalisasi. ${belumDinilai.length} mahasiswa belum diberi nilai.`
        : 'Semua nilai sudah final sebelumnya.',
    });
  }

  await prisma.nilai.updateMany({
    where: { id: { in: siapFinalize.map((k) => k.nilai!.id) } },
    data: { status: 'finalized' },
  });

  void writeAudit(req, {
    action: 'nilai.finalize.batch',
    entity: 'kelas',
    entityId: req.params.kelasId,
    metadata: { finalized: siapFinalize.length, belumDinilai: belumDinilai.length },
  });

  // Notif + feeder sync untuk masing-masing
  void (async () => {
    for (const k of siapFinalize) {
      const userId = await userIdFromMahasiswa(k.mahasiswaId);
      if (userId) {
        await createNotifikasi({
          userId,
          title: `Nilai ${k.kelas.mataKuliah.kode} telah dirilis`,
          body: `Nilai akhir ${k.kelas.mataKuliah.nama}: ${k.nilai!.nilaiHuruf ?? '-'} (${k.nilai!.nilaiAngka ?? '-'}). Lihat detail di Nilai & Transkrip.`,
          type: 'nilai',
          link: '/mahasiswa/nilai',
          entity: 'nilai',
          entityId: k.nilai!.id,
          sendEmail: true,
        });
      }
      const payload = await buildFeederPayload('nilai', k.nilai!.id);
      if (payload) {
        await enqueueFeederChange({
          entity: 'nilai',
          entityId: k.nilai!.id,
          operation: k.nilai!.feederId ? 'update' : 'create',
          payload,
        });
      }
    }
  })();

  res.json({
    ok: true,
    finalized: siapFinalize.length,
    belumDinilai: belumDinilai.length,
    sudahFinal: sudahFinal.length,
    message: belumDinilai.length > 0
      ? `${siapFinalize.length} nilai difinalisasi. ${belumDinilai.length} mahasiswa belum diberi nilai (perlu input dulu).`
      : `Semua ${siapFinalize.length} nilai berhasil difinalisasi.`,
  });
});

// ============================================================
// BOBOT NILAI per kelas — dosen tentukan persentase komponen.
// Default 20/30/40/0/10 (tugas/UTS/UAS/praktikum/kehadiran) bila belum diset.
// ============================================================

const DEFAULT_BOBOT = { tugas: 20, uts: 30, uas: 40, praktikum: 0, kehadiran: 10 };
const SUM_TOLERANCE = 0.01;

const bobotSchema = z.object({
  tugas: z.number().min(0).max(100),
  uts: z.number().min(0).max(100),
  uas: z.number().min(0).max(100),
  praktikum: z.number().min(0).max(100),
  kehadiran: z.number().min(0).max(100),
});

kelasRouter.get('/kelas/:kelasId/bobot', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const row = await prisma.bobotNilaiKelas.findUnique({ where: { kelasId: req.params.kelasId } });
  if (!row) {
    res.json({ bobot: DEFAULT_BOBOT, configured: false });
    return;
  }
  res.json({
    bobot: {
      tugas: row.bobotTugas,
      uts: row.bobotUts,
      uas: row.bobotUas,
      praktikum: row.bobotPraktikum,
      kehadiran: row.bobotKehadiran,
    },
    configured: true,
  });
});

kelasRouter.put('/kelas/:kelasId/bobot', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const b = bobotSchema.parse(req.body);
  const sum = b.tugas + b.uts + b.uas + b.praktikum + b.kehadiran;
  if (Math.abs(sum - 100) > SUM_TOLERANCE) {
    throw BadRequest(`Total bobot harus 100% (sekarang ${sum.toFixed(1)}%)`);
  }
  const row = await prisma.bobotNilaiKelas.upsert({
    where: { kelasId: req.params.kelasId },
    create: {
      kelasId: req.params.kelasId,
      bobotTugas: b.tugas,
      bobotUts: b.uts,
      bobotUas: b.uas,
      bobotPraktikum: b.praktikum,
      bobotKehadiran: b.kehadiran,
    },
    update: {
      bobotTugas: b.tugas,
      bobotUts: b.uts,
      bobotUas: b.uas,
      bobotPraktikum: b.praktikum,
      bobotKehadiran: b.kehadiran,
    },
  });
  void writeAudit(req, {
    action: 'nilai.bobot.set',
    entity: 'kelas',
    entityId: req.params.kelasId,
    metadata: b,
  });
  res.json({
    bobot: {
      tugas: row.bobotTugas,
      uts: row.bobotUts,
      uas: row.bobotUas,
      praktikum: row.bobotPraktikum,
      kehadiran: row.bobotKehadiran,
    },
    configured: true,
  });
});

// ============================================================
// Rerata nilai Tugas per mahasiswa (untuk tombol Sync di Input Nilai).
// Sumber:
//   1. SubmitTugas yang sudah dinilai (dinormalisasi ke 100 pakai Tugas.maxNilai)
//   2. KuisAttempt yang sudah submit untuk Kuis dengan masukNilaiTugas=true
//      (KuisAttempt.persen sudah 0-100)
// Keduanya digabung sebagai entri setara, lalu rata-rata per mahasiswa.
// totalTugas mencakup keduanya — supaya rasio "x/y dinilai" akurat.
// ============================================================
kelasRouter.get('/kelas/:kelasId/tugas-rerata', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);

  const [totalTugas, totalKuisIkut] = await Promise.all([
    prisma.tugas.count({ where: { kelasId: req.params.kelasId } }),
    prisma.kuis.count({ where: { kelasId: req.params.kelasId, masukNilaiTugas: true } }),
  ]);

  const submissions = await prisma.submitTugas.findMany({
    where: {
      tugas: { kelasId: req.params.kelasId },
      nilai: { not: null },
    },
    select: {
      mahasiswaId: true,
      nilai: true,
      tugas: { select: { maxNilai: true } },
    },
  });

  const kuisAttempts = await prisma.kuisAttempt.findMany({
    where: {
      kuis: { kelasId: req.params.kelasId, masukNilaiTugas: true },
      persen: { not: null },
    },
    select: { mahasiswaId: true, persen: true },
  });

  const byMahasiswa = new Map<string, { sum: number; count: number }>();
  for (const s of submissions) {
    if (s.nilai == null) continue;
    const maxN = s.tugas.maxNilai || 100;
    const norm = (s.nilai / maxN) * 100;
    const acc = byMahasiswa.get(s.mahasiswaId) ?? { sum: 0, count: 0 };
    acc.sum += norm;
    acc.count += 1;
    byMahasiswa.set(s.mahasiswaId, acc);
  }
  for (const a of kuisAttempts) {
    if (a.persen == null) continue;
    const acc = byMahasiswa.get(a.mahasiswaId) ?? { sum: 0, count: 0 };
    acc.sum += a.persen;
    acc.count += 1;
    byMahasiswa.set(a.mahasiswaId, acc);
  }

  const items: Record<string, { rerata: number; dinilai: number }> = {};
  for (const [mahasiswaId, acc] of byMahasiswa.entries()) {
    items[mahasiswaId] = {
      rerata: Math.round((acc.sum / acc.count) * 100) / 100,
      dinilai: acc.count,
    };
  }

  res.json({ totalTugas: totalTugas + totalKuisIkut, items });
});
