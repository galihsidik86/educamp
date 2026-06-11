import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

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
    mahasiswa: { id: m.id, nim: m.nim, nama: m.nama, angkatan: m.angkatan, prodi: m.prodi, dpa: m.dpa },
    semester: semester ? { kode: semester.kode, prsMulai: semester.prsMulai, prsSelesai: semester.prsSelesai } : null,
    inPrsPeriode,
    items: krs.map((it) => ({
      id: it.id, status: it.status, catatan: it.catatan,
      tipe: tipe(it),
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
});

krsRouter.post('/krs/:mahasiswaId/validasi', async (req, res) => {
  const { action, catatan } = validasiSchema.parse(req.body);
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
    });
  })();

  res.json({ ok: true, updated: list.length });
});
