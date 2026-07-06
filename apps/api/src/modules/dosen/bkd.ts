import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi } from '../../lib/notifikasi.js';

export const bkdRouter = Router();

const KATEGORI = ['pengajaran', 'penelitian', 'pengabdian', 'penunjang'] as const;

const itemSchema = z.object({
  kategori: z.enum(KATEGORI),
  jenis: z.string().min(3).max(100),
  deskripsi: z.string().min(5).max(2000),
  bobotSks: z.number().min(0.1).max(20),
  sumberEntity: z.enum(['kelas', 'skripsi', 'penelitian', 'pengabdian']).optional().nullable(),
  sumberId: z.string().uuid().optional().nullable(),
  fileUrl: optionalHttpUrl, // http/https saja — anti stored-XSS pada link bukti
});

/** List laporan BKD dosen (semua semester). */
bkdRouter.get('/bkd', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const items = await prisma.bkdLaporan.findMany({
    where: { dosenId: d.id },
    include: {
      semester: { include: { tahunAjaran: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

/** Detail satu laporan dengan items. */
bkdRouter.get('/bkd/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const lap = await prisma.bkdLaporan.findUnique({
    where: { id: req.params.id },
    include: {
      semester: { include: { tahunAjaran: true } },
      items: { orderBy: [{ kategori: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  if (lap.dosenId !== d.id) throw Forbidden('Bukan laporan Anda');
  res.json(lap);
});

/** Buat laporan untuk semester aktif (kalau belum ada) — sekaligus auto-populate dari data yang sudah ada. */
bkdRouter.post('/bkd', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semester = req.body?.semesterId
    ? await prisma.semester.findUnique({ where: { id: req.body.semesterId } })
    : await getActiveSemester();
  if (!semester) throw BadRequest('Semester tidak ditemukan');

  const existing = await prisma.bkdLaporan.findUnique({
    where: { dosenId_semesterId: { dosenId: d.id, semesterId: semester.id } },
  });
  if (existing) return res.status(200).json(existing);

  const laporan = await prisma.bkdLaporan.create({
    data: { dosenId: d.id, semesterId: semester.id },
  });

  // Auto-populate dari kelas yang diampu di semester ini + skripsi + penelitian + pengabdian
  const autoItems = await buildAutoItems(d.id, semester.id);
  if (autoItems.length > 0) {
    await prisma.bkdItem.createMany({
      data: autoItems.map((it) => ({ ...it, laporanId: laporan.id })),
    });
  }
  await recalcTotal(laporan.id);

  void writeAudit(req, { action: 'bkd.create', entity: 'bkd', entityId: laporan.id, metadata: { autoItems: autoItems.length } });
  const fresh = await prisma.bkdLaporan.findUnique({ where: { id: laporan.id }, include: { items: true } });
  res.status(201).json(fresh);
});

/** Build items otomatis dari data SIAKAD. */
async function buildAutoItems(dosenId: string, semesterId: string): Promise<Array<{
  kategori: 'pengajaran' | 'penelitian' | 'pengabdian' | 'penunjang';
  jenis: string;
  deskripsi: string;
  bobotSks: number;
  sumberEntity: string;
  sumberId: string;
}>> {
  const result: any[] = [];

  // Pengajaran: kelas yang diampu (lead atau team)
  const kelas = await prisma.kelas.findMany({
    where: {
      semesterId,
      OR: [{ dosenId }, { team: { some: { dosenId } } }],
    },
    include: { mataKuliah: { select: { kode: true, nama: true, sks: true } } },
  });
  for (const k of kelas) {
    result.push({
      kategori: 'pengajaran',
      jenis: 'Mengajar Kelas',
      deskripsi: `${k.mataKuliah.kode} ${k.mataKuliah.nama} — Kelas ${k.kodeKelas}`,
      bobotSks: k.mataKuliah.sks, // 1 SKS MK = 1 SKS ekuivalen mengajar
      sumberEntity: 'kelas',
      sumberId: k.id,
    });
  }

  // Pengajaran: bimbingan skripsi aktif
  const skripsi = await prisma.skripsi.findMany({
    where: {
      OR: [{ pembimbing1Id: dosenId }, { pembimbing2Id: dosenId }],
      status: { in: ['disetujui', 'proposal', 'penelitian', 'sidang'] },
    },
    include: { mahasiswa: { select: { nim: true, nama: true } } },
  });
  for (const s of skripsi) {
    const isPemb1 = s.pembimbing1Id === dosenId;
    result.push({
      kategori: 'pengajaran',
      jenis: isPemb1 ? 'Bimbingan Skripsi (Pembimbing 1)' : 'Bimbingan Skripsi (Pembimbing 2)',
      deskripsi: `${s.mahasiswa.nim} ${s.mahasiswa.nama} — ${s.judul ?? 'Skripsi'}`,
      bobotSks: isPemb1 ? 1 : 0.5,
      sumberEntity: 'skripsi',
      sumberId: s.id,
    });
  }

  // Penelitian: yang masih berjalan
  const penelitian = await prisma.penelitian.findMany({
    where: { ketuaDosenId: dosenId, status: { in: ['disetujui', 'berjalan'] } },
  });
  for (const p of penelitian) {
    result.push({
      kategori: 'penelitian',
      jenis: 'Penelitian (Ketua)',
      deskripsi: `${p.judul} (${p.tahun})`,
      bobotSks: 3, // 3 SKS untuk ketua penelitian
      sumberEntity: 'penelitian',
      sumberId: p.id,
    });
  }

  // Pengabdian: yang masih berjalan
  const pengabdian = await prisma.pengabdian.findMany({
    where: { ketuaDosenId: dosenId, status: { in: ['disetujui', 'berjalan'] } },
  });
  for (const p of pengabdian) {
    result.push({
      kategori: 'pengabdian',
      jenis: 'Pengabdian Masyarakat (Ketua)',
      deskripsi: `${p.judul} (${p.tahun}) — ${p.lokasi ?? '—'}`,
      bobotSks: 2,
      sumberEntity: 'pengabdian',
      sumberId: p.id,
    });
  }

  return result;
}

async function recalcTotal(laporanId: string) {
  const agg = await prisma.bkdItem.aggregate({
    where: { laporanId },
    _sum: { bobotSks: true },
  });
  await prisma.bkdLaporan.update({
    where: { id: laporanId },
    data: { totalSks: agg._sum.bobotSks ?? 0 },
  });
}

/** Refresh auto-populate (replace pengajaran/penelitian/pengabdian items dari source). */
bkdRouter.post('/bkd/:id/refresh', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const lap = await prisma.bkdLaporan.findUnique({ where: { id: req.params.id } });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  if (lap.dosenId !== d.id) throw Forbidden('Bukan laporan Anda');
  if (lap.status !== 'draft') throw BadRequest('Hanya laporan status draft yang dapat di-refresh');

  // Hapus item auto-populated (yang punya sumberEntity), pertahankan manual
  await prisma.bkdItem.deleteMany({
    where: { laporanId: lap.id, sumberEntity: { not: null } },
  });
  const autoItems = await buildAutoItems(d.id, lap.semesterId);
  if (autoItems.length > 0) {
    await prisma.bkdItem.createMany({
      data: autoItems.map((it) => ({ ...it, laporanId: lap.id })),
    });
  }
  await recalcTotal(lap.id);
  const fresh = await prisma.bkdLaporan.findUnique({ where: { id: lap.id }, include: { items: true } });
  res.json(fresh);
});

/** Tambah item manual. */
bkdRouter.post('/bkd/:id/items', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const lap = await prisma.bkdLaporan.findUnique({ where: { id: req.params.id } });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  if (lap.dosenId !== d.id) throw Forbidden('Bukan laporan Anda');
  if (lap.status !== 'draft') throw BadRequest('Hanya laporan status draft yang dapat ditambah item');

  const body = itemSchema.parse(req.body);
  const item = await prisma.bkdItem.create({
    data: {
      laporanId: lap.id,
      kategori: body.kategori,
      jenis: body.jenis,
      deskripsi: body.deskripsi,
      bobotSks: body.bobotSks,
      sumberEntity: body.sumberEntity ?? null,
      sumberId: body.sumberId ?? null,
      fileUrl: body.fileUrl ?? null,
    },
  });
  await recalcTotal(lap.id);
  res.status(201).json(item);
});

/** Edit item. */
bkdRouter.patch('/bkd/items/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const item = await prisma.bkdItem.findUnique({ where: { id: req.params.id }, include: { laporan: true } });
  if (!item) throw NotFound('Item tidak ditemukan');
  if (item.laporan.dosenId !== d.id) throw Forbidden('Bukan item Anda');
  if (item.laporan.status !== 'draft') throw BadRequest('Hanya laporan status draft yang dapat diedit');

  const body = itemSchema.partial().parse(req.body);
  const updated = await prisma.bkdItem.update({ where: { id: item.id }, data: body });
  await recalcTotal(item.laporanId);
  res.json(updated);
});

/** Hapus item. */
bkdRouter.delete('/bkd/items/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const item = await prisma.bkdItem.findUnique({ where: { id: req.params.id }, include: { laporan: true } });
  if (!item) throw NotFound('Item tidak ditemukan');
  if (item.laporan.dosenId !== d.id) throw Forbidden('Bukan item Anda');
  if (item.laporan.status !== 'draft') throw BadRequest('Hanya laporan status draft yang dapat dihapus item');

  await prisma.bkdItem.delete({ where: { id: item.id } });
  await recalcTotal(item.laporanId);
  res.status(204).end();
});

/** Submit laporan untuk verifikasi. */
bkdRouter.post('/bkd/:id/submit', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const lap = await prisma.bkdLaporan.findUnique({ where: { id: req.params.id } });
  if (!lap) throw NotFound('Laporan tidak ditemukan');
  if (lap.dosenId !== d.id) throw Forbidden('Bukan laporan Anda');
  if (lap.status !== 'draft' && lap.status !== 'ditolak') {
    throw BadRequest(`Status ${lap.status} tidak dapat diajukan ulang`);
  }
  const count = await prisma.bkdItem.count({ where: { laporanId: lap.id } });
  if (count === 0) throw BadRequest('Tambahkan minimal 1 item sebelum submit');

  const updated = await prisma.bkdLaporan.update({
    where: { id: lap.id },
    data: { status: 'diajukan', catatanAkademik: null },
  });
  void writeAudit(req, { action: 'bkd.submit', entity: 'bkd', entityId: lap.id });

  // Notif ke akademik
  void (async () => {
    const akademikUsers = await prisma.user.findMany({ where: { role: 'akademik' }, select: { id: true } });
    const semester = await prisma.semester.findUnique({ where: { id: lap.semesterId }, include: { tahunAjaran: true } });
    for (const u of akademikUsers) {
      await createNotifikasi({
        userId: u.id,
        title: `BKD diajukan: ${d.nama}`,
        body: `Semester ${semester?.jenis ?? ''} ${semester?.tahunAjaran.kode ?? ''} · Total ${lap.totalSks} SKS`,
        type: 'bkd',
        link: '/akademik/bkd',
        entity: 'bkd',
        entityId: lap.id,
      });
    }
  })();

  res.json(updated);
});
