import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const bimbinganRouter = Router();

/**
 * List mahasiswa yang DPA-nya dosen ini, + ringkasan KRS semester aktif (status & jumlah SKS diajukan).
 */
bimbinganRouter.get('/bimbingan', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const mhs = await prisma.mahasiswa.findMany({
    where: { dpaId: d.id },
    include: {
      prodi: { select: { kode: true, nama: true } },
      krs: {
        where: { semesterId: semester.id },
        include: { kelas: { include: { mataKuliah: true } } },
      },
    },
    orderBy: { nim: 'asc' },
  });

  res.json({
    semester: { kode: semester.kode, nama: `${semester.jenis}` },
    items: mhs.map((m) => {
      const totalSks = m.krs.reduce((s, k) => s + k.kelas.mataKuliah.sks, 0);
      const statuses = [...new Set(m.krs.map((k) => k.status))];
      const status =
        m.krs.length === 0 ? 'kosong'
        : statuses.length === 1 ? statuses[0]!
        : 'campuran';
      const adaDiajukan = m.krs.some((k) => k.status === 'diajukan');
      return {
        id: m.id,
        nim: m.nim,
        nama: m.nama,
        angkatan: m.angkatan,
        prodi: m.prodi,
        krsStatus: status,
        krsTotal: m.krs.length,
        krsSks: totalSks,
        perluValidasi: adaDiajukan,
      };
    }),
  });
});

/**
 * Detail KRS mahasiswa bimbingan di semester aktif.
 */
bimbinganRouter.get('/bimbingan/:mahasiswaId/krs', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const mhs = await prisma.mahasiswa.findUnique({
    where: { id: req.params.mahasiswaId },
    include: { prodi: true },
  });
  if (!mhs) throw NotFound('Mahasiswa tidak ditemukan');
  if (mhs.dpaId !== d.id) throw Forbidden('Bukan mahasiswa bimbingan Anda');

  const semester = await getActiveSemester();
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: mhs.id, semesterId: semester.id },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          ruangan: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    mahasiswa: {
      id: mhs.id, nim: mhs.nim, nama: mhs.nama, angkatan: mhs.angkatan,
      prodi: { kode: mhs.prodi.kode, nama: mhs.prodi.nama },
    },
    semester: { kode: semester.kode },
    items: krs.map((it) => ({
      id: it.id,
      status: it.status,
      catatan: it.catatan,
      kelas: {
        kodeMK: it.kelas.mataKuliah.kode,
        namaMK: it.kelas.mataKuliah.nama,
        sks: it.kelas.mataKuliah.sks,
        kodeKelas: it.kelas.kodeKelas,
        hari: it.kelas.hari,
        jamMulai: it.kelas.jamMulai,
        jamSelesai: it.kelas.jamSelesai,
        ruangan: it.kelas.ruangan?.kode ?? null,
        dosen: [it.kelas.dosen.gelarDepan, it.kelas.dosen.nama, it.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      },
    })),
    totalSks: krs.reduce((s, k) => s + k.kelas.mataKuliah.sks, 0),
  });
});

const actionSchema = z.object({
  action: z.enum(['setujui', 'tolak']),
  catatan: z.string().max(500).optional(),
});

/**
 * Setujui/tolak SEMUA item KRS berstatus 'diajukan' milik mahasiswa bimbingan.
 */
bimbinganRouter.post('/bimbingan/:mahasiswaId/krs/validasi', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const { action, catatan } = actionSchema.parse(req.body);
  const mhs = await prisma.mahasiswa.findUnique({ where: { id: req.params.mahasiswaId } });
  if (!mhs) throw NotFound('Mahasiswa tidak ditemukan');
  if (mhs.dpaId !== d.id) throw Forbidden('Bukan mahasiswa bimbingan Anda');

  const semester = await getActiveSemester();
  const krsList = await prisma.krs.findMany({
    where: { mahasiswaId: mhs.id, semesterId: semester.id, status: 'diajukan' },
  });
  if (krsList.length === 0) throw BadRequest('Tidak ada KRS berstatus "diajukan" untuk divalidasi');

  const newStatus = action === 'setujui' ? 'disetujui' : 'ditolak';

  await prisma.krs.updateMany({
    where: { id: { in: krsList.map((k) => k.id) } },
    data: { status: newStatus, catatan: catatan ?? null },
  });

  void writeAudit(req, {
    action: `krs.${action}.dpa`,
    entity: 'mahasiswa',
    entityId: mhs.id,
    metadata: { updated: krsList.length, catatan: catatan ?? null, krsIds: krsList.map((k) => k.id) },
  });

  // notifikasi ke mahasiswa
  void (async () => {
    const userId = await userIdFromMahasiswa(mhs.id);
    if (!userId) return;
    const isApprove = action === 'setujui';
    await createNotifikasi({
      userId,
      title: isApprove ? 'KRS Anda disetujui oleh DPA' : 'KRS Anda ditolak oleh DPA',
      body: isApprove
        ? `${krsList.length} mata kuliah telah disetujui oleh dosen pembimbing akademik. Jadwal akan tampil di menu Jadwal Kuliah.`
        : `${krsList.length} mata kuliah ditolak DPA${catatan ? `. Catatan: ${catatan}` : ''}. Silakan revisi dan ajukan kembali.`,
      type: 'krs',
      link: '/mahasiswa/krs',
      entity: 'krs',
      entityId: mhs.id,
    });
  })();

  res.json({ ok: true, updated: krsList.length, status: newStatus });
});
