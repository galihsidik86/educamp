import { Router } from 'express';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';

export const triDharmaRouter = Router();

triDharmaRouter.get('/penelitian', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.penelitianMahasiswa.findMany({
    where: { mahasiswaId: m.id },
    include: {
      penelitian: {
        include: {
          ketuaDosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
        },
      },
    },
    orderBy: { penelitian: { tahun: 'desc' } },
  });
  res.json({
    items: rows.map((r) => ({
      id: r.penelitian.id,
      judul: r.penelitian.judul,
      tahun: r.penelitian.tahun,
      status: r.penelitian.status,
      peran: r.peran,
      ketua: [r.penelitian.ketuaDosen.gelarDepan, r.penelitian.ketuaDosen.nama, r.penelitian.ketuaDosen.gelarBelakang].filter(Boolean).join(' '),
      sumberDana: r.penelitian.sumberDana,
      jumlahDana: r.penelitian.jumlahDana ? Number(r.penelitian.jumlahDana) : null,
    })),
  });
});

triDharmaRouter.get('/pengabdian', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.pengabdianMahasiswa.findMany({
    where: { mahasiswaId: m.id },
    include: {
      pengabdian: {
        include: {
          ketuaDosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
        },
      },
    },
    orderBy: { pengabdian: { tahun: 'desc' } },
  });
  res.json({
    items: rows.map((r) => ({
      id: r.pengabdian.id,
      judul: r.pengabdian.judul,
      tahun: r.pengabdian.tahun,
      lokasi: r.pengabdian.lokasi,
      status: r.pengabdian.status,
      peran: r.peran,
      ketua: [r.pengabdian.ketuaDosen.gelarDepan, r.pengabdian.ketuaDosen.nama, r.pengabdian.ketuaDosen.gelarBelakang].filter(Boolean).join(' '),
      sumberDana: r.pengabdian.sumberDana,
      jumlahDana: r.pengabdian.jumlahDana ? Number(r.pengabdian.jumlahDana) : null,
    })),
  });
});

triDharmaRouter.get('/kkn', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.kkn.findMany({
    where: { mahasiswaId: m.id },
    include: {
      dplDosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: rows.map((k) => ({
      id: k.id,
      periode: k.periode,
      lokasi: k.lokasi,
      desa: k.desa,
      kecamatan: k.kecamatan,
      kabupaten: k.kabupaten,
      status: k.status,
      tanggalMulai: k.tanggalMulai,
      tanggalSelesai: k.tanggalSelesai,
      nilai: k.nilai,
      dpl: k.dplDosen
        ? [k.dplDosen.gelarDepan, k.dplDosen.nama, k.dplDosen.gelarBelakang].filter(Boolean).join(' ')
        : null,
    })),
  });
});
