import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi } from '../../lib/notifikasi.js';

export const skpiRouter = Router();

const JENIS_SERTIFIKAT = ['bahasa', 'kompetensi', 'pelatihan', 'lain'] as const;
const JENIS_PRESTASI = ['lomba_akademik', 'lomba_non_akademik', 'kepanitiaan', 'organisasi', 'publikasi', 'lain'] as const;
const LEVEL = ['internasional', 'nasional', 'regional', 'lokal', 'internal'] as const;

const sertifikatSchema = z.object({
  jenis: z.enum(JENIS_SERTIFIKAT),
  nama: z.string().min(3).max(200),
  penerbit: z.string().min(2).max(150),
  nomorSertifikat: z.string().max(80).optional().nullable(),
  tanggalTerbit: z.string().min(1),
  tanggalKadaluwarsa: z.string().optional().nullable(),
  level: z.enum(LEVEL).optional().nullable(),
  skor: z.string().max(50).optional().nullable(),
  fileUrl: z.string().max(500).optional().nullable(),
});

const prestasiSchema = z.object({
  jenis: z.enum(JENIS_PRESTASI),
  nama: z.string().min(3).max(200),
  penyelenggara: z.string().max(150).optional().nullable(),
  tanggal: z.string().min(1),
  level: z.enum(LEVEL).optional().nullable(),
  peran: z.string().max(100).optional().nullable(),
  deskripsi: z.string().max(2000).optional().nullable(),
  fileUrl: z.string().max(500).optional().nullable(),
});

// ---------- Sertifikasi ----------

skpiRouter.get('/sertifikasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.sertifikasi.findMany({
    where: { mahasiswaId: m.id },
    orderBy: { tanggalTerbit: 'desc' },
  });
  res.json({ items });
});

skpiRouter.post('/sertifikasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = sertifikatSchema.parse(req.body);
  const created = await prisma.sertifikasi.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      nama: body.nama,
      penerbit: body.penerbit,
      nomorSertifikat: body.nomorSertifikat ?? null,
      tanggalTerbit: new Date(body.tanggalTerbit),
      tanggalKadaluwarsa: body.tanggalKadaluwarsa ? new Date(body.tanggalKadaluwarsa) : null,
      level: body.level ?? null,
      skor: body.skor ?? null,
      fileUrl: body.fileUrl ?? null,
    },
  });
  void writeAudit(req, { action: 'sertifikasi.create', entity: 'sertifikasi', entityId: created.id });
  res.status(201).json(created);
});

skpiRouter.patch('/sertifikasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const s = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Sertifikat tidak ditemukan');
  if (s.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (s.status === 'diverifikasi') throw BadRequest('Sertifikat sudah diverifikasi — tidak dapat diedit');
  const body = sertifikatSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggalTerbit !== undefined) data.tanggalTerbit = new Date(body.tanggalTerbit);
  if (body.tanggalKadaluwarsa !== undefined) data.tanggalKadaluwarsa = body.tanggalKadaluwarsa ? new Date(body.tanggalKadaluwarsa) : null;
  // edit setelah ditolak → kembali ke draft
  if (s.status === 'ditolak') data.status = 'draft';
  const updated = await prisma.sertifikasi.update({ where: { id: s.id }, data });
  res.json(updated);
});

skpiRouter.delete('/sertifikasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const s = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Sertifikat tidak ditemukan');
  if (s.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (s.status === 'diverifikasi') throw BadRequest('Sertifikat sudah diverifikasi — tidak dapat dihapus');
  await prisma.sertifikasi.delete({ where: { id: s.id } });
  res.status(204).end();
});

/** Submit untuk verifikasi: draft|ditolak → diajukan. */
skpiRouter.post('/sertifikasi/:id/submit', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const s = await prisma.sertifikasi.findUnique({ where: { id: req.params.id } });
  if (!s) throw NotFound('Sertifikat tidak ditemukan');
  if (s.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (s.status !== 'draft' && s.status !== 'ditolak') throw BadRequest(`Status ${s.status} tidak dapat diajukan ulang`);
  const updated = await prisma.sertifikasi.update({
    where: { id: s.id },
    data: { status: 'diajukan', catatanVerifikator: null },
  });

  // Notif ke akademik
  void (async () => {
    const akademikUsers = await prisma.user.findMany({ where: { role: 'akademik' }, select: { id: true } });
    for (const u of akademikUsers) {
      await createNotifikasi({
        userId: u.id,
        title: `Sertifikat baru diajukan: ${s.nama}`,
        body: `Oleh ${m.nama} (${m.nim})`,
        type: 'skpi',
        link: '/akademik/skpi',
        entity: 'sertifikasi',
        entityId: s.id,
      });
    }
  })();

  res.json(updated);
});

// ---------- Prestasi ----------

skpiRouter.get('/prestasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.prestasi.findMany({
    where: { mahasiswaId: m.id },
    orderBy: { tanggal: 'desc' },
  });
  res.json({ items });
});

skpiRouter.post('/prestasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = prestasiSchema.parse(req.body);
  const created = await prisma.prestasi.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      nama: body.nama,
      penyelenggara: body.penyelenggara ?? null,
      tanggal: new Date(body.tanggal),
      level: body.level ?? null,
      peran: body.peran ?? null,
      deskripsi: body.deskripsi ?? null,
      fileUrl: body.fileUrl ?? null,
    },
  });
  void writeAudit(req, { action: 'prestasi.create', entity: 'prestasi', entityId: created.id });
  res.status(201).json(created);
});

skpiRouter.patch('/prestasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const p = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound('Prestasi tidak ditemukan');
  if (p.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (p.status === 'diverifikasi') throw BadRequest('Prestasi sudah diverifikasi — tidak dapat diedit');
  const body = prestasiSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggal !== undefined) data.tanggal = new Date(body.tanggal);
  if (p.status === 'ditolak') data.status = 'draft';
  const updated = await prisma.prestasi.update({ where: { id: p.id }, data });
  res.json(updated);
});

skpiRouter.delete('/prestasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const p = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound('Prestasi tidak ditemukan');
  if (p.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (p.status === 'diverifikasi') throw BadRequest('Prestasi sudah diverifikasi — tidak dapat dihapus');
  await prisma.prestasi.delete({ where: { id: p.id } });
  res.status(204).end();
});

skpiRouter.post('/prestasi/:id/submit', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const p = await prisma.prestasi.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound('Prestasi tidak ditemukan');
  if (p.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (p.status !== 'draft' && p.status !== 'ditolak') throw BadRequest(`Status ${p.status} tidak dapat diajukan ulang`);
  const updated = await prisma.prestasi.update({
    where: { id: p.id },
    data: { status: 'diajukan', catatanVerifikator: null },
  });
  void (async () => {
    const akademikUsers = await prisma.user.findMany({ where: { role: 'akademik' }, select: { id: true } });
    for (const u of akademikUsers) {
      await createNotifikasi({
        userId: u.id,
        title: `Prestasi baru diajukan: ${p.nama}`,
        body: `Oleh ${m.nama} (${m.nim})`,
        type: 'skpi',
        link: '/akademik/skpi',
        entity: 'prestasi',
        entityId: p.id,
      });
    }
  })();
  res.json(updated);
});

// ---------- SKPI data assembly ----------

/**
 * Endpoint sumber data SKPI mahasiswa. Mengembalikan semua item yang
 * sudah `diverifikasi` plus data identitas, penelitian, pengabdian, KKN, MBKM.
 * Mahasiswa hanya dapat melihat datanya sendiri.
 */
skpiRouter.get('/skpi', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({
    where: { userId: req.user!.sub },
    include: { prodi: { include: { fakultas: true } } },
  });
  if (!m) throw Forbidden('Akun bukan mahasiswa');

  const [sertifikasi, prestasi, penelitian, pengabdian, kkn, mbkm, cpl, institusi, transkrip] = await Promise.all([
    prisma.sertifikasi.findMany({
      where: { mahasiswaId: m.id, status: 'diverifikasi' },
      orderBy: { tanggalTerbit: 'desc' },
    }),
    prisma.prestasi.findMany({
      where: { mahasiswaId: m.id, status: 'diverifikasi' },
      orderBy: { tanggal: 'desc' },
    }),
    prisma.penelitianMahasiswa.findMany({
      where: { mahasiswaId: m.id },
      include: { penelitian: { select: { judul: true, tahun: true, sumberDana: true, status: true } } },
      orderBy: { penelitian: { tahun: 'desc' } },
    }),
    prisma.pengabdianMahasiswa.findMany({
      where: { mahasiswaId: m.id },
      include: { pengabdian: { select: { judul: true, tahun: true, lokasi: true, status: true } } },
      orderBy: { pengabdian: { tahun: 'desc' } },
    }),
    prisma.kkn.findMany({
      where: { mahasiswaId: m.id, status: 'selesai' },
      select: { periode: true, lokasi: true, nilai: true, tanggalSelesai: true },
      orderBy: { tanggalSelesai: 'desc' },
    }),
    prisma.mbkm.findMany({
      where: { mahasiswaId: m.id, status: { in: ['selesai', 'disetujui'] } },
      include: { konversi: { include: { mataKuliah: { select: { sks: true } } } } },
      orderBy: { tanggalMulai: 'desc' },
    }),
    // CPL Prodi — capaian pembelajaran lulusan (Profil Lulusan)
    prisma.cpl.findMany({
      where: { prodiId: m.prodiId, isAktif: true },
      orderBy: [{ aspek: 'asc' }, { urutan: 'asc' }, { kode: 'asc' }],
      select: { kode: true, deskripsi: true, aspek: true },
    }),
    // Identitas institusi untuk header & TTD
    prisma.institusiConfig.findUnique({ where: { id: 'singleton' } }),
    // Transkrip: total SKS + IPK final (untuk validasi & display)
    prisma.nilai.findMany({
      where: { mahasiswaId: m.id, status: 'finalized' },
      include: { krs: { include: { kelas: { include: { mataKuliah: { select: { sks: true } } } } } } },
    }),
  ]);

  // Hitung total SKS + IPK
  let totalMutu = 0;
  let totalSks = 0;
  for (const n of transkrip) {
    if (n.bobot == null) continue;
    const sks = n.krs.kelas.mataKuliah.sks;
    totalMutu += sks * n.bobot;
    totalSks += sks;
  }
  const ipk = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;

  // KKNI level dari jenjang
  const KKNI_LEVEL: Record<string, number> = { d3: 5, d4: 6, s1: 6, s2: 8, s3: 9, profesi: 7 };
  const kkniLevel = KKNI_LEVEL[m.prodi.jenjang as string] ?? null;

  res.json({
    mahasiswa: {
      id: m.id,
      nim: m.nim,
      nama: m.nama,
      tempatLahir: m.tempatLahir,
      tanggalLahir: m.tanggalLahir,
      jenisKelamin: m.jenisKelamin,
      angkatan: m.angkatan,
      status: m.status,
      prodi: { kode: m.prodi.kode, nama: m.prodi.nama, jenjang: m.prodi.jenjang },
      fakultas: { kode: m.prodi.fakultas.kode, nama: m.prodi.fakultas.nama },
    },
    kualifikasi: {
      jenjang: m.prodi.jenjang,
      kkniLevel,  // KKNI level untuk Diploma Supplement
      ipk,
      totalSks,
    },
    cpl,
    institusi: institusi
      ? {
          nama: institusi.nama,
          namaPendek: institusi.namaPendek,
          alamat: institusi.alamat,
          kota: institusi.kota,
          akreditasiPT: institusi.akreditasiPT,
          akreditasiSk: institusi.akreditasiSk,
          rektorNama: institusi.rektorNama,
          rektorNip: institusi.rektorNip,
          rektorJabatan: institusi.rektorJabatan,
          kepalaBaakNama: institusi.kepalaBaakNama,
        }
      : null,
    sertifikasi,
    prestasi,
    penelitian: penelitian.map((pm) => ({
      judul: pm.penelitian.judul,
      tahun: pm.penelitian.tahun,
      sumberDana: pm.penelitian.sumberDana,
      peran: pm.peran,
      status: pm.penelitian.status,
    })),
    pengabdian: pengabdian.map((pm) => ({
      judul: pm.pengabdian.judul,
      tahun: pm.pengabdian.tahun,
      lokasi: pm.pengabdian.lokasi,
      peran: pm.peran,
      status: pm.pengabdian.status,
    })),
    kkn,
    mbkm: mbkm.map((mb) => ({
      jenis: mb.jenis,
      namaProgram: mb.namaProgram,
      mitra: mb.mitra,
      tanggalMulai: mb.tanggalMulai,
      tanggalSelesai: mb.tanggalSelesai,
      totalSks: mb.konversi.reduce((s, k) => s + (k.mataKuliah.sks ?? 0), 0),
    })),
  });
});
