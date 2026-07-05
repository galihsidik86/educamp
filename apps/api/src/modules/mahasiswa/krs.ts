import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { calculateIp, dynamicMaxSks, hurufToBobot } from '../../lib/grade.js';
import { formatDosenLabel } from '../../lib/dosen-format.js';

export const krsRouter = Router();

/**
 * IP semester terakhir dari nilai finalized di semester sebelum `currentSemesterKode`.
 * Pakai untuk menentukan batas SKS yang boleh diambil semester ini.
 */
async function getPrevSemesterIp(mahasiswaId: string, currentSemesterKode: string): Promise<number | null> {
  const nilai = await prisma.nilai.findMany({
    where: {
      mahasiswaId,
      status: 'finalized',
      krs: { kelas: { semester: { kode: { lt: currentSemesterKode } } } },
    },
    include: { krs: { include: { kelas: { include: { mataKuliah: true, semester: true } } } } },
  });
  if (nilai.length === 0) return null;
  const latestKode = nilai
    .map((n) => n.krs.kelas.semester.kode)
    .sort()
    .at(-1)!;
  const items = nilai
    .filter((n) => n.krs.kelas.semester.kode === latestKode)
    .map((n) => ({ sks: n.krs.kelas.mataKuliah.sks, bobot: n.bobot }));
  return calculateIp(items).ip;
}

/**
 * Kelas yang ditawarkan di semester aktif untuk prodi mahasiswa.
 */
krsRouter.get('/krs/penawaran', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  // Filter: MK prodi mahasiswa ATAU MK wajib universitas (terbuka utk semua prodi)
  const kelas = await prisma.kelas.findMany({
    where: {
      semesterId: semester.id,
      OR: [
        { mataKuliah: { prodiId: m.prodiId } },
        { mataKuliah: { jenis: 'wajib_universitas' } },
      ],
    },
    include: {
      mataKuliah: true,
      dosen: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
      team: { include: { dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } } } },
      ruangan: true,
      _count: { select: { krs: { where: { status: { in: ['diajukan', 'disetujui'] } } } } },
    },
    orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
  });

  // Riwayat nilai mahasiswa — untuk MK yang sudah pernah lulus, tampilkan info
  // supaya mahasiswa sadar (boleh ambil ulang utk perbaikan nilai, tapi tahu konteksnya).
  const riwayat = await prisma.nilai.findMany({
    where: { mahasiswaId: m.id, status: 'finalized' },
    include: { krs: { include: { kelas: { select: { mataKuliahId: true } } } } },
  });
  type RiwayatRow = { lulus: boolean; nilaiHuruf: string | null; bobot: number };
  const riwayatByMk = new Map<string, RiwayatRow>();
  for (const n of riwayat) {
    const mkId = n.krs.kelas.mataKuliahId;
    const b = n.bobot ?? 0;
    const cur = riwayatByMk.get(mkId);
    if (!cur || cur.bobot < b) {
      // Lulus = bobot >= 1.0 (huruf D atau lebih tinggi). E (0.0) berarti tidak lulus.
      riwayatByMk.set(mkId, { lulus: b >= 1.0, nilaiHuruf: n.nilaiHuruf, bobot: b });
    }
  }

  res.json({
    semester: { kode: semester.kode, jenis: semester.jenis, krsSelesai: semester.krsSelesai },
    kelas: kelas.map((k) => {
      const r = riwayatByMk.get(k.mataKuliahId);
      return {
        id: k.id,
        kodeMK: k.mataKuliah.kode,
        namaMK: k.mataKuliah.nama,
        sks: k.mataKuliah.sks,
        jenisMK: k.mataKuliah.jenis,
        kodeKelas: k.kodeKelas,
        dosen: formatDosenLabel(k.dosen, k.team),
        ruangan: k.ruangan?.kode ?? null,
        hari: k.hari,
        jamMulai: k.jamMulai,
        jamSelesai: k.jamSelesai,
        kapasitas: k.kapasitas,
        terisi: k._count.krs,
        riwayat: r ? {
          lulus: r.lulus,
          nilaiHuruf: r.nilaiHuruf,
          bobot: r.bobot,
        } : null,
      };
    }),
  });
});

/**
 * KRS mahasiswa di semester aktif (semua status, tapi 1 record per mahasiswa-semester).
 */
krsRouter.get('/krs', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const items = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          team: { include: { dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } } } },
          ruangan: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Total SKS hanya menghitung item yang aktif (bukan ditolak/drop).
  const totalSks = items
    .filter((it) => it.status !== 'ditolak')
    .reduce((s, it) => s + it.kelas.mataKuliah.sks, 0);
  const status = inferKrsStatus(items.map((i) => i.status));
  const prevIp = await getPrevSemesterIp(m.id, semester.kode);
  const maxSks = dynamicMaxSks(prevIp);
  const now = new Date();
  const inKrsPeriode = inPeriode(now, semester.krsMulai, semester.krsSelesai);
  const inPrsPeriode = inPeriode(now, semester.prsMulai, semester.prsSelesai) && !inKrsPeriode;

  res.json({
    semester: {
      kode: semester.kode,
      krsMulai: semester.krsMulai,
      krsSelesai: semester.krsSelesai,
      prsMulai: semester.prsMulai,
      prsSelesai: semester.prsSelesai,
    },
    inKrsPeriode,
    inPrsPeriode,
    status,
    totalSks,
    maxSks,
    prevIp,
    items: items.map((it) => ({
      id: it.id,
      status: it.status,
      catatan: it.catatan,
      kelas: {
        id: it.kelas.id,
        kodeMK: it.kelas.mataKuliah.kode,
        namaMK: it.kelas.mataKuliah.nama,
        sks: it.kelas.mataKuliah.sks,
        kodeKelas: it.kelas.kodeKelas,
        dosen: formatDosenLabel(it.kelas.dosen, it.kelas.team),
        ruangan: it.kelas.ruangan?.kode ?? null,
        hari: it.kelas.hari,
        jamMulai: it.kelas.jamMulai,
        jamSelesai: it.kelas.jamSelesai,
      },
    })),
  });
});

const addItemSchema = z.object({ kelasId: z.string().uuid() });

/**
 * Tambah kelas ke KRS draft. Validasi:
 * - periode KRS sedang dibuka
 * - kelas berada di semester aktif
 * - prodi cocok
 * - tidak duplikat
 * - tidak bentrok jadwal
 * - kapasitas tidak penuh
 * - tidak melebihi maxSks
 */
krsRouter.post('/krs/items', async (req, res) => {
  const { kelasId } = addItemSchema.parse(req.body);
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const now = new Date();
  const inKrs = inPeriode(now, semester.krsMulai, semester.krsSelesai);
  const inPrs = inPeriode(now, semester.prsMulai, semester.prsSelesai);
  if (!inKrs && !inPrs) {
    if (semester.krsMulai && now < semester.krsMulai) throw BadRequest('Periode KRS belum dibuka');
    throw BadRequest('Periode KRS/PRS telah ditutup');
  }

  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: { mataKuliah: true, _count: { select: { krs: { where: { status: { in: ['diajukan', 'disetujui'] } } } } } },
  });
  if (!kelas) throw NotFound('Kelas tidak ditemukan');
  if (kelas.semesterId !== semester.id) throw BadRequest('Kelas bukan dari semester aktif');
  // MK wajib_universitas terbuka utk semua prodi; selain itu harus dari prodi mahasiswa
  if (kelas.mataKuliah.prodiId !== m.prodiId && kelas.mataKuliah.jenis !== 'wajib_universitas') {
    throw BadRequest('Kelas bukan dari prodi Anda');
  }
  if (kelas._count.krs >= kelas.kapasitas) throw Conflict('Kapasitas kelas penuh');

  // cek KRS existing
  const existing = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id },
    include: { kelas: { include: { mataKuliah: true } } },
  });

  // Item ditolak/drop diabaikan untuk pengecekan duplikasi & bentrok — mahasiswa boleh
  // mengambil kembali MK yang sama atau di slot waktu yang sama setelah didrop.
  const aktif = existing.filter((e) => e.status !== 'ditolak');

  if (aktif.some((e) => e.kelasId === kelasId)) throw Conflict('Kelas sudah ada di KRS');

  // satu MK hanya boleh satu kelas
  if (aktif.some((e) => e.kelas.mataKuliahId === kelas.mataKuliahId)) {
    throw Conflict(`MK ${kelas.mataKuliah.kode} sudah ada di KRS pada kelas lain`);
  }

  // prasyarat MK
  const prasyarat = await prisma.prasyarat.findMany({
    where: { mkUtamaId: kelas.mataKuliahId },
    include: { mkPrasyarat: true },
  });
  if (prasyarat.length > 0) {
    const lulus = await prisma.nilai.findMany({
      where: { mahasiswaId: m.id, status: 'finalized' },
      include: { krs: { include: { kelas: { select: { mataKuliahId: true } } } } },
    });
    // ambil bobot tertinggi per MK (kalau diulang)
    const bobotByMk = new Map<string, number>();
    for (const n of lulus) {
      const mkId = n.krs.kelas.mataKuliahId;
      const b = n.bobot ?? 0;
      if ((bobotByMk.get(mkId) ?? -1) < b) bobotByMk.set(mkId, b);
    }
    for (const p of prasyarat) {
      // default minimum kelulusan = D (bobot 1.0); jika ditentukan, pakai itu
      const minBobot = hurufToBobot(p.nilaiMinimal ?? 'D');
      const got = bobotByMk.get(p.mkPrasyaratId);
      if (got == null || got < minBobot) {
        throw BadRequest(
          `Belum memenuhi prasyarat ${p.mkPrasyarat.kode} ${p.mkPrasyarat.nama}` +
            (p.nilaiMinimal ? ` (min. ${p.nilaiMinimal})` : ''),
        );
      }
    }
  }

  // bentrok jadwal
  if (kelas.hari && kelas.jamMulai && kelas.jamSelesai) {
    const bentrok = aktif.find((e) =>
      e.kelas.hari === kelas.hari &&
      timeOverlap(e.kelas.jamMulai, e.kelas.jamSelesai, kelas.jamMulai, kelas.jamSelesai),
    );
    if (bentrok) {
      throw Conflict(`Bentrok jadwal dengan ${bentrok.kelas.mataKuliah.kode} ${bentrok.kelas.kodeKelas}`);
    }
  }

  // max SKS — dinamis dari IP semester sebelumnya (acuan Kemendikbud)
  const prevIp = await getPrevSemesterIp(m.id, semester.kode);
  const maxSks = dynamicMaxSks(prevIp);
  const totalSks = aktif.reduce((s, e) => s + e.kelas.mataKuliah.sks, 0) + kelas.mataKuliah.sks;
  if (totalSks > maxSks) throw BadRequest(`Total SKS melebihi batas (${maxSks} SKS, sesuai IP ${prevIp ?? 'belum ada'})`);

  // status — tidak boleh menambah saat ada pengajuan yang sedang diproses
  if (aktif.some((e) => e.status === 'diajukan')) {
    throw Conflict('KRS sedang menunggu validasi — tarik kembali dulu untuk menambah');
  }
  // Selama periode KRS, tidak boleh menambah jika sudah disetujui (perlu tunggu periode PRS).
  if (inKrs && !inPrs && aktif.some((e) => e.status === 'disetujui')) {
    throw Conflict('KRS sudah disetujui — perubahan dilakukan saat periode PRS');
  }

  // Jika sebelumnya pernah ditolak/drop untuk kelas yang sama, reuse record-nya.
  // Unique constraint (mahasiswaId, kelasId) mencegah create record duplikat.
  //
  // Kapasitas dicek ulang DI DALAM transaksi dengan row-lock pada baris
  // Kelas (SELECT ... FOR UPDATE). Pengecekan `_count` di atas hanyalah
  // fast-path untuk pesan error dini; tanpa lock, dua mahasiswa yang
  // menambah kursi terakhir bersamaan sama-sama lolos (classic rebutan
  // kelas saat KRS dibuka).
  const previousDropped = existing.find((e) => e.kelasId === kelas.id && e.status === 'ditolak');
  const upserted = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`Kelas\` WHERE id = ${kelas.id} FOR UPDATE`;
    const terisi = await tx.krs.count({
      where: { kelasId: kelas.id, status: { in: ['diajukan', 'disetujui'] } },
    });
    if (terisi >= kelas.kapasitas) throw Conflict('Kapasitas kelas penuh');
    return previousDropped
      ? tx.krs.update({
          where: { id: previousDropped.id },
          data: { status: 'draft', catatan: null },
        })
      : tx.krs.create({
          data: {
            mahasiswaId: m.id,
            semesterId: semester.id,
            kelasId: kelas.id,
            status: 'draft',
          },
        });
  });

  res.status(201).json({ id: upserted.id });
});

/**
 * Hapus item KRS — hanya jika masih draft/ditolak (belum diajukan).
 */
krsRouter.delete('/krs/items/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.krs.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Item KRS tidak ditemukan');
  if (item.status !== 'draft' && item.status !== 'ditolak') {
    throw BadRequest(`Item dengan status ${item.status} tidak dapat dihapus`);
  }
  await prisma.krs.delete({ where: { id: item.id } });
  res.status(204).end();
});

/**
 * Drop kelas yang sudah disetujui selama periode PRS — bukan delete, tapi
 * mark sebagai `ditolak` dengan catatan, supaya history & jejak tetap ada.
 */
krsRouter.post('/krs/items/:id/drop', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();
  const now = new Date();
  if (!inPeriode(now, semester.prsMulai, semester.prsSelesai)) {
    throw BadRequest('Drop hanya dapat dilakukan dalam periode PRS');
  }
  const item = await prisma.krs.findUnique({
    where: { id: req.params.id },
    include: { kelas: { include: { mataKuliah: true } } },
  });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Item KRS tidak ditemukan');
  if (item.status !== 'disetujui') {
    throw BadRequest(`Hanya kelas berstatus disetujui yang dapat di-drop (status saat ini: ${item.status})`);
  }
  await prisma.krs.update({
    where: { id: item.id },
    data: { status: 'ditolak', catatan: 'Dibatalkan saat PRS' },
  });
  void writeAudit(req, {
    action: 'krs.prs.drop',
    entity: 'mahasiswa',
    entityId: m.id,
    metadata: { krsId: item.id, kelasId: item.kelasId, mk: item.kelas.mataKuliah.kode },
  });
  res.json({ ok: true });
});

/**
 * Submit KRS — ubah semua draft menjadi diajukan. Tunggu validasi akademik.
 */
krsRouter.post('/krs/submit', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const now = new Date();
  const inKrs = inPeriode(now, semester.krsMulai, semester.krsSelesai);
  const inPrs = inPeriode(now, semester.prsMulai, semester.prsSelesai);
  if (!inKrs && !inPrs) throw BadRequest('Periode KRS/PRS telah ditutup');

  const drafts = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id, status: 'draft' },
    include: { kelas: { include: { mataKuliah: true } } },
  });
  if (drafts.length === 0) throw BadRequest('Tidak ada item draft untuk diajukan');

  // Kapasitas HARUS dicek saat submit — status `draft` tidak menghitung
  // kursi, jadi tanpa pengecekan ini semua mahasiswa yang men-draft kursi
  // terakhir bisa sama-sama submit dan kelas overbooked. Row-lock per
  // kelas (FOR UPDATE) menserialkan submit yang berebut kelas yang sama;
  // siapa cepat dia dapat, yang kalah menerima error dengan nama kelasnya.
  await prisma.$transaction(async (tx) => {
    const byKelas = new Map<string, { count: number; kapasitas: number; label: string }>();
    for (const d of drafts) {
      const cur = byKelas.get(d.kelasId);
      if (cur) cur.count += 1;
      else byKelas.set(d.kelasId, {
        count: 1,
        kapasitas: d.kelas.kapasitas,
        label: `${d.kelas.mataKuliah.kode} ${d.kelas.kodeKelas}`,
      });
    }
    // Lock dengan urutan id yang stabil untuk menghindari deadlock antar
    // transaksi yang mengunci beberapa kelas sekaligus.
    const kelasIds = [...byKelas.keys()].sort();
    for (const kelasId of kelasIds) {
      await tx.$queryRaw`SELECT id FROM \`Kelas\` WHERE id = ${kelasId} FOR UPDATE`;
      const terisi = await tx.krs.count({
        where: { kelasId, status: { in: ['diajukan', 'disetujui'] } },
      });
      const info = byKelas.get(kelasId)!;
      if (terisi + info.count > info.kapasitas) {
        throw Conflict(`Kapasitas kelas ${info.label} sudah penuh — hapus dari KRS lalu pilih kelas lain`);
      }
    }
    await tx.krs.updateMany({
      where: { mahasiswaId: m.id, semesterId: semester.id, status: 'draft' },
      data: { status: 'diajukan' },
    });
  });
  void writeAudit(req, {
    action: 'krs.submit',
    entity: 'mahasiswa',
    entityId: m.id,
    metadata: { semesterId: semester.id, submitted: drafts.length },
  });
  res.json({ ok: true, submitted: drafts.length });
});

/**
 * Riwayat KRS semua semester selain semester aktif — read-only.
 */
krsRouter.get('/krs/riwayat', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const active = await getActiveSemester();

  const rows = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: { not: active.id } },
    include: {
      semester: { include: { tahunAjaran: true } },
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
        },
      },
    },
    orderBy: [{ semester: { kode: 'desc' } }, { createdAt: 'asc' }],
  });

  const grouped = new Map<string, {
    semester: { kode: string; jenis: string; nama: string };
    items: Array<{
      id: string; status: string; catatan: string | null;
      kelas: { kodeMK: string; namaMK: string; sks: number; kodeKelas: string; dosen: string };
    }>;
    totalSks: number;
  }>();
  for (const r of rows) {
    const key = r.semester.kode;
    if (!grouped.has(key)) {
      grouped.set(key, {
        semester: {
          kode: r.semester.kode,
          jenis: r.semester.jenis,
          nama: `${r.semester.tahunAjaran.nama} ${r.semester.jenis === 'ganjil' ? 'Ganjil' : 'Genap'}`,
        },
        items: [],
        totalSks: 0,
      });
    }
    const g = grouped.get(key)!;
    g.items.push({
      id: r.id,
      status: r.status,
      catatan: r.catatan,
      kelas: {
        kodeMK: r.kelas.mataKuliah.kode,
        namaMK: r.kelas.mataKuliah.nama,
        sks: r.kelas.mataKuliah.sks,
        kodeKelas: r.kelas.kodeKelas,
        dosen: [r.kelas.dosen.gelarDepan, r.kelas.dosen.nama, r.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      },
    });
    g.totalSks += r.kelas.mataKuliah.sks;
  }

  res.json({ semesters: [...grouped.values()] });
});

/**
 * Tarik kembali pengajuan KRS — ubah semua `diajukan` menjadi `draft`.
 * Hanya berlaku selama periode KRS masih buka. Tidak bisa menarik kembali
 * yang sudah `disetujui` atau `ditolak`.
 */
krsRouter.post('/krs/withdraw', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const now = new Date();
  const inKrs = inPeriode(now, semester.krsMulai, semester.krsSelesai);
  const inPrs = inPeriode(now, semester.prsMulai, semester.prsSelesai);
  if (!inKrs && !inPrs) {
    throw BadRequest('Periode KRS/PRS telah ditutup — tidak dapat menarik kembali');
  }

  const pending = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id, status: 'diajukan' },
  });
  if (pending.length === 0) throw BadRequest('Tidak ada KRS berstatus "diajukan" untuk ditarik');

  await prisma.krs.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: { status: 'draft', catatan: null },
  });
  void writeAudit(req, {
    action: 'krs.withdraw',
    entity: 'mahasiswa',
    entityId: m.id,
    metadata: { semesterId: semester.id, withdrawn: pending.length },
  });
  res.json({ ok: true, withdrawn: pending.length });
});

function inferKrsStatus(statuses: string[]): 'kosong' | 'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'campuran' {
  if (statuses.length === 0) return 'kosong';
  const uniq = [...new Set(statuses)];
  if (uniq.length === 1) return uniq[0] as 'draft' | 'diajukan' | 'disetujui' | 'ditolak';
  return 'campuran';
}

function timeOverlap(a1: string | null, a2: string | null, b1: string | null, b2: string | null): boolean {
  if (!a1 || !a2 || !b1 || !b2) return false;
  return a1 < b2 && b1 < a2;
}

function inPeriode(now: Date, mulai: Date | null, selesai: Date | null): boolean {
  if (!mulai || !selesai) return false;
  return now >= mulai && now <= selesai;
}
