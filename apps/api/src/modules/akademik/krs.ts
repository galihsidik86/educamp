import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';
import { enqueueFeederChange, buildFeederPayload } from '../../lib/feeder/queue.js';
import { createTagihanUkt } from '../../lib/tagihan-ukt.js';

export const krsRouter = Router();

/**
 * List mahasiswa dengan KRS di semester aktif + ringkasan status.
 */
krsRouter.get('/krs', async (req, res) => {
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;
  const status = req.query.status as string | undefined;
  const prodiId = req.query.prodiId as string | undefined;

  const rows = await prisma.krs.groupBy({
    by: ['mahasiswaId', 'status'],
    where: { semesterId, ...(status && { status: status as any }) },
    _count: { _all: true },
  });

  const mahasiswaIds = [...new Set(rows.map((r) => r.mahasiswaId))];
  const mhs = await prisma.mahasiswa.findMany({
    where: {
      id: { in: mahasiswaIds },
      ...(prodiId && { prodiId }),
    },
    include: {
      prodi: { select: { kode: true, nama: true } },
      dpa: { select: { nama: true } },
      krs: {
        where: { semesterId },
        include: { kelas: { include: { mataKuliah: true } } },
      },
    },
    orderBy: { nim: 'asc' },
  });

  res.json({
    items: mhs.map((m) => {
      const statuses = [...new Set(m.krs.map((k) => k.status))];
      const sksEfektif = m.krs
        .filter((k) => k.status !== 'ditolak')
        .reduce((s, k) => s + k.kelas.mataKuliah.sks, 0);
      const adaDiajukan = m.krs.some((k) => k.status === 'diajukan');
      const adaDisetujui = m.krs.some((k) => k.status === 'disetujui');
      // Revisi PRS = ada `diajukan` baru ATAU ada drop, sedangkan sebagian sudah `disetujui`.
      const adaDropPrs = m.krs.some((k) => k.status === 'ditolak' && k.catatan?.includes('PRS'));
      const isPrsRevisi = adaDisetujui && (adaDiajukan || adaDropPrs);
      return {
        id: m.id,
        nim: m.nim,
        nama: m.nama,
        angkatan: m.angkatan,
        prodi: m.prodi,
        dpa: m.dpa?.nama ?? null,
        krsStatus: m.krs.length === 0 ? 'kosong' : statuses.length === 1 ? statuses[0] : 'campuran',
        krsTotal: m.krs.length,
        krsSks: sksEfektif,
        perluValidasi: adaDiajukan,
        isPrsRevisi,
      };
    }),
  });
});

/** Detail KRS mahasiswa di semester aktif (atau ?semesterId). */
krsRouter.get('/krs/:mahasiswaId', async (req, res) => {
  const active = await getActiveSemester();
  const semesterId = (req.query.semesterId as string | undefined) ?? active.id;
  const m = await prisma.mahasiswa.findUnique({
    where: { id: req.params.mahasiswaId },
    include: { prodi: true, dpa: { select: { nama: true, nidn: true } } },
  });
  if (!m) throw NotFound();
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          ruangan: true,
        },
      },
    },
  });

  const now = new Date();
  const inPrsPeriode = !!(semester?.prsMulai && semester?.prsSelesai &&
    now >= semester.prsMulai && now <= semester.prsSelesai);
  const adaDisetujui = krs.some((k) => k.status === 'disetujui');

  function tipe(it: typeof krs[number]): 'krs' | 'prs-tambah' | 'prs-drop' {
    if (it.status === 'ditolak' && it.catatan?.includes('PRS')) return 'prs-drop';
    // diajukan/draft + ada item lain yang sudah disetujui = revisi PRS
    if ((it.status === 'diajukan' || it.status === 'draft') && adaDisetujui) return 'prs-tambah';
    return 'krs';
  }

  res.json({
    mahasiswa: { id: m.id, nim: m.nim, nama: m.nama, angkatan: m.angkatan, prodi: m.prodi, dpa: m.dpa, defaultCicilanUkt: m.defaultCicilanUkt },
    semester: semester ? { kode: semester.kode, prsMulai: semester.prsMulai, prsSelesai: semester.prsSelesai } : null,
    inPrsPeriode,
    items: krs.map((it) => ({
      id: it.id, status: it.status, catatan: it.catatan,
      tipe: tipe(it),
      kelasId: it.kelasId,
      kelas: {
        kodeMK: it.kelas.mataKuliah.kode, namaMK: it.kelas.mataKuliah.nama, sks: it.kelas.mataKuliah.sks,
        kodeKelas: it.kelas.kodeKelas,
        hari: it.kelas.hari, jamMulai: it.kelas.jamMulai, jamSelesai: it.kelas.jamSelesai,
        ruangan: it.kelas.ruangan?.kode ?? null,
        dosen: [it.kelas.dosen.gelarDepan, it.kelas.dosen.nama, it.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      },
    })),
    totalSks: krs.reduce((s, k) => s + k.kelas.mataKuliah.sks, 0),
    sksEfektif: krs.filter((k) => k.status !== 'ditolak').reduce((s, k) => s + k.kelas.mataKuliah.sks, 0),
  });
});

const validasiSchema = z.object({
  action: z.enum(['setujui', 'tolak']),
  catatan: z.string().max(500).optional(),
  /** Mode tagihan UKT: 1 = sekaligus, 2-12 = cicilan bulanan. Default 1. */
  cicilanUkt: z.number().int().min(1).max(12).optional(),
});

/**
 * Akademik tambah item KRS manual (override) — bypass periode/kapasitas/bentrok validation,
 * langsung set status default 'disetujui'. Untuk koreksi/late registration.
 */
const addItemSchema = z.object({
  kelasId: z.string().uuid(),
  status: z.enum(['draft', 'diajukan', 'disetujui']).optional(),
  catatan: z.string().max(500).optional().nullable(),
});

krsRouter.post('/krs/:mahasiswaId/items', async (req, res) => {
  const body = addItemSchema.parse(req.body);
  const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.mahasiswaId } });
  if (!m) throw NotFound('Mahasiswa tidak ditemukan');
  const kelas = await prisma.kelas.findUnique({ where: { id: body.kelasId }, include: { mataKuliah: true } });
  if (!kelas) throw BadRequest('Kelas tidak ditemukan');
  // Cek duplikat (di semester yang sama, status bukan ditolak)
  const dup = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: body.kelasId, status: { not: 'ditolak' } },
  });
  if (dup) throw BadRequest('Kelas sudah ada di KRS mahasiswa ini');
  const created = await prisma.krs.create({
    data: {
      mahasiswaId: m.id,
      kelasId: body.kelasId,
      semesterId: kelas.semesterId,
      status: body.status ?? 'disetujui',
      catatan: body.catatan ?? 'Ditambahkan manual oleh Akademik',
    },
    include: { kelas: { include: { mataKuliah: true } } },
  });
  void writeAudit(req, {
    action: 'krs.item.add.akademik',
    entity: 'mahasiswa',
    entityId: m.id,
    metadata: { kelasId: body.kelasId, kodeMK: kelas.mataKuliah.kode, kodeKelas: kelas.kodeKelas, status: created.status },
  });
  res.status(201).json(created);
});

/** Hapus item KRS — akademik manual delete. */
krsRouter.delete('/krs/items/:krsId', async (req, res) => {
  const item = await prisma.krs.findUnique({
    where: { id: req.params.krsId },
    include: { kelas: { include: { mataKuliah: true } } },
  });
  if (!item) throw NotFound('Item KRS tidak ditemukan');
  await prisma.krs.delete({ where: { id: item.id } });
  void writeAudit(req, {
    action: 'krs.item.delete.akademik',
    entity: 'mahasiswa',
    entityId: item.mahasiswaId,
    metadata: { kelasId: item.kelasId, kodeMK: item.kelas.mataKuliah.kode, kodeKelas: item.kelas.kodeKelas, status: item.status },
  });
  res.status(204).end();
});

/** Update status item KRS (override single item, mis. drop satu MK). */
const updateItemSchema = z.object({
  status: z.enum(['draft', 'diajukan', 'disetujui', 'ditolak']),
  catatan: z.string().max(500).optional().nullable(),
});

krsRouter.patch('/krs/items/:krsId', async (req, res) => {
  const body = updateItemSchema.parse(req.body);
  const item = await prisma.krs.findUnique({ where: { id: req.params.krsId } });
  if (!item) throw NotFound('Item KRS tidak ditemukan');
  const updated = await prisma.krs.update({
    where: { id: item.id },
    data: { status: body.status, catatan: body.catatan ?? item.catatan },
  });
  void writeAudit(req, {
    action: 'krs.item.update.akademik',
    entity: 'mahasiswa',
    entityId: item.mahasiswaId,
    metadata: { krsId: item.id, statusBaru: body.status },
  });
  res.json(updated);
});

krsRouter.post('/krs/:mahasiswaId/validasi', async (req, res) => {
  const { action, catatan, cicilanUkt } = validasiSchema.parse(req.body);
  const semester = await getActiveSemester();

  const list = await prisma.krs.findMany({
    where: { mahasiswaId: req.params.mahasiswaId, semesterId: semester.id, status: 'diajukan' },
  });
  if (list.length === 0) throw BadRequest('Tidak ada KRS berstatus "diajukan" untuk divalidasi');

  await prisma.krs.updateMany({
    where: { id: { in: list.map((k) => k.id) } },
    data: { status: action === 'setujui' ? 'disetujui' : 'ditolak', catatan: catatan ?? null },
  });
  void writeAudit(req, {
    action: `krs.${action}.akademik`,
    entity: 'mahasiswa',
    entityId: req.params.mahasiswaId,
    metadata: { updated: list.length, catatan: catatan ?? null, krsIds: list.map((k) => k.id) },
  });

  // Feeder sync + auto-create tagihan UKT saat disetujui
  let tagihanInfo: { dibuat: boolean; nominal?: number; potonganBeasiswa?: number; cicilan?: number; fullBeasiswa?: boolean; sudahAda?: boolean } = { dibuat: false };
  if (action === 'setujui') {
    void (async () => {
      for (const k of list) {
        const payload = await buildFeederPayload('krs', k.id);
        if (payload) {
          await enqueueFeederChange({
            entity: 'krs',
            entityId: k.id,
            operation: k.feederId ? 'update' : 'create',
            payload,
          });
        }
      }
    })();

    // Auto-create tagihan UKT — pakai helper yang memperhitungkan kategori UKT + beasiswa + cicilan
    const m = await prisma.mahasiswa.findUnique({ where: { id: req.params.mahasiswaId } });
    if (m) {
      const result = await createTagihanUkt({
        mahasiswa: m,
        semester: { id: semester.id, kode: semester.kode },
        cicilan: cicilanUkt ?? m.defaultCicilanUkt ?? 1,
      });
      if (result.skipped === null && result.tagihanIds.length > 0) {
        tagihanInfo = {
          dibuat: true,
          nominal: result.hitung.sisaTagihan,
          potonganBeasiswa: result.hitung.totalPotongan,
          cicilan: result.cicilan,
        } as any;
      } else if (result.skipped === 'full_coverage') {
        tagihanInfo = { dibuat: false, fullBeasiswa: true } as any;
      } else if (result.skipped === 'sudah_ada') {
        tagihanInfo = { dibuat: false, sudahAda: true } as any;
      }
    }
  }

  void (async () => {
    const userId = await userIdFromMahasiswa(req.params.mahasiswaId);
    if (!userId) return;
    const isApprove = action === 'setujui';
    await createNotifikasi({
      userId,
      title: isApprove ? 'KRS Anda disahkan Akademik' : 'KRS Anda ditolak Akademik',
      body: isApprove
        ? `${list.length} mata kuliah telah disahkan. Jadwal & ruangan siap di menu Jadwal.`
        : `KRS dikembalikan${catatan ? `. Catatan: ${catatan}` : ''}. Silakan revisi.`,
      type: 'krs',
      link: '/mahasiswa/krs',
      entity: 'krs',
      entityId: req.params.mahasiswaId,
      sendEmail: true,
    });
  })();

  res.json({ ok: true, updated: list.length, tagihanInfo });
});
