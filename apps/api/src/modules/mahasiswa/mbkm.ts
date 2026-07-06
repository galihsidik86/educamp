import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';

export const mbkmRouter = Router();

const JENIS = [
  'pertukaran_mahasiswa',
  'magang_industri',
  'asistensi_mengajar',
  'penelitian',
  'proyek_kemanusiaan',
  'kewirausahaan',
  'studi_independen',
  'kkn_tematik',
] as const;

const daftarSchema = z.object({
  jenis: z.enum(JENIS),
  namaProgram: z.string().min(3).max(150),
  mitra: z.string().min(2).max(150),
  lokasi: z.string().max(150).optional().nullable(),
  periode: z.string().regex(/^\d{5}$/, 'Periode: kode semester 5 digit, mis. 20251'),
  tanggalMulai: z.string().optional().nullable(),
  tanggalSelesai: z.string().optional().nullable(),
  linkProposal: optionalHttpUrl,
});

const updateSchema = z.object({
  linkLaporan: optionalHttpUrl,
  linkSertifikat: optionalHttpUrl,
  linkProposal: optionalHttpUrl,
});

/** List MBKM mahasiswa, terbaru di atas, dengan konversi-nya. */
mbkmRouter.get('/mbkm', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.mbkm.findMany({
    where: { mahasiswaId: m.id },
    include: {
      dplDosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
      konversi: {
        include: { mataKuliah: { select: { kode: true, nama: true, sks: true } } },
      },
    },
    orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      jenis: r.jenis,
      namaProgram: r.namaProgram,
      mitra: r.mitra,
      lokasi: r.lokasi,
      periode: r.periode,
      tanggalMulai: r.tanggalMulai,
      tanggalSelesai: r.tanggalSelesai,
      status: r.status,
      catatan: r.catatan,
      linkProposal: r.linkProposal,
      linkLaporan: r.linkLaporan,
      linkSertifikat: r.linkSertifikat,
      dpl: r.dplDosen
        ? [r.dplDosen.gelarDepan, r.dplDosen.nama, r.dplDosen.gelarBelakang].filter(Boolean).join(' ')
        : null,
      konversi: r.konversi.map((k) => ({
        id: k.id,
        kodeMK: k.mataKuliah.kode,
        namaMK: k.mataKuliah.nama,
        sks: k.mataKuliah.sks,
        nilaiHuruf: k.nilaiHuruf,
        bobot: k.bobot,
      })),
      totalSksKonversi: r.konversi.reduce((s, k) => s + k.mataKuliah.sks, 0),
    })),
  });
});

mbkmRouter.post('/mbkm', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = daftarSchema.parse(req.body);

  const exists = await prisma.mbkm.findFirst({
    where: { mahasiswaId: m.id, periode: body.periode, jenis: body.jenis, status: { in: ['pengajuan', 'disetujui', 'berjalan'] } },
  });
  if (exists) throw BadRequest(`Anda sudah memiliki pengajuan ${body.jenis} aktif di periode ${body.periode}`);

  const created = await prisma.mbkm.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      namaProgram: body.namaProgram,
      mitra: body.mitra,
      lokasi: body.lokasi ?? null,
      periode: body.periode,
      tanggalMulai: body.tanggalMulai ? new Date(body.tanggalMulai) : null,
      tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null,
      linkProposal: body.linkProposal ?? null,
      status: 'pengajuan',
    },
  });
  void writeAudit(req, {
    action: 'mbkm.daftar',
    entity: 'mbkm',
    entityId: created.id,
    metadata: { jenis: body.jenis, periode: body.periode, mitra: body.mitra },
  });
  res.status(201).json(created);
});

mbkmRouter.patch('/mbkm/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.mbkm.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('MBKM tidak ditemukan');

  const body = updateSchema.parse(req.body);
  const updated = await prisma.mbkm.update({ where: { id: item.id }, data: body });
  res.json(updated);
});

mbkmRouter.delete('/mbkm/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.mbkm.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('MBKM tidak ditemukan');
  if (item.status !== 'pengajuan' && item.status !== 'ditolak') {
    throw Forbidden('Hanya pengajuan yang belum disetujui atau yang ditolak yang dapat dibatalkan');
  }
  await prisma.mbkm.delete({ where: { id: item.id } });
  res.status(204).end();
});
