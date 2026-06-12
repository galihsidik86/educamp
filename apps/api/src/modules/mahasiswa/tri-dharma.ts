import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Conflict } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const triDharmaRouter = Router();

const kknDaftarSchema = z.object({
  periode: z.string().regex(/^\d{4} (Ganjil|Genap|Pendek)$/, 'Format periode: "2025 Ganjil"'),
  lokasi: z.string().min(2).max(120),
  desa: z.string().max(80).optional().nullable(),
  kecamatan: z.string().max(80).optional().nullable(),
  kabupaten: z.string().max(80).optional().nullable(),
});

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

/**
 * Daftar KKN. Mahasiswa hanya boleh punya satu entri per periode.
 * Status awal: pendaftaran (menunggu akademik menetapkan DPL).
 */
triDharmaRouter.post('/kkn', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = kknDaftarSchema.parse(req.body);

  const exists = await prisma.kkn.findFirst({
    where: { mahasiswaId: m.id, periode: body.periode },
  });
  if (exists) throw Conflict(`Anda sudah mendaftar KKN periode ${body.periode}`);

  const created = await prisma.kkn.create({
    data: {
      mahasiswaId: m.id,
      periode: body.periode,
      lokasi: body.lokasi,
      desa: body.desa ?? null,
      kecamatan: body.kecamatan ?? null,
      kabupaten: body.kabupaten ?? null,
      status: 'pendaftaran',
    },
  });
  void writeAudit(req, {
    action: 'kkn.daftar',
    entity: 'kkn',
    entityId: created.id,
    metadata: { periode: body.periode, lokasi: body.lokasi },
  });
  res.status(201).json(created);
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
