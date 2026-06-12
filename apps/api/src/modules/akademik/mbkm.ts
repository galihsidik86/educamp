import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';
import { hurufToBobot } from '../../lib/grade.js';

export const mbkmRouter = Router();

const STATUS = ['pengajuan', 'disetujui', 'berjalan', 'selesai', 'ditolak'] as const;

const patchSchema = z.object({
  dplDosenId: z.string().uuid().optional().nullable(),
  tanggalMulai: z.string().optional().nullable(),
  tanggalSelesai: z.string().optional().nullable(),
  status: z.enum(STATUS).optional(),
  catatan: z.string().max(1000).optional().nullable(),
  lokasi: z.string().max(150).optional().nullable(),
});

const konversiAddSchema = z.object({
  mataKuliahId: z.string().uuid(),
  nilaiHuruf: z.string().regex(/^(A|AB|B|BC|C|D|E)$/).optional().nullable(),
});

const konversiNilaiSchema = z.object({
  nilaiHuruf: z.string().regex(/^(A|AB|B|BC|C|D|E)$/),
});

/** List semua MBKM dengan filter periode/status/jenis. */
mbkmRouter.get('/mbkm', async (req, res) => {
  const periode = req.query.periode as string | undefined;
  const status = req.query.status as string | undefined;
  const jenis = req.query.jenis as string | undefined;

  const items = await prisma.mbkm.findMany({
    where: {
      ...(periode && { periode }),
      ...(status && STATUS.includes(status as (typeof STATUS)[number]) && { status: status as (typeof STATUS)[number] }),
      ...(jenis && { jenis: jenis as any }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      dplDosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
      konversi: {
        include: { mataKuliah: { select: { id: true, kode: true, nama: true, sks: true } } },
      },
    },
    orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  const periodeList = await prisma.mbkm.findMany({
    select: { periode: true },
    distinct: ['periode'],
    orderBy: { periode: 'desc' },
  });

  res.json({
    items: items.map((m) => ({
      id: m.id,
      jenis: m.jenis,
      namaProgram: m.namaProgram,
      mitra: m.mitra,
      lokasi: m.lokasi,
      periode: m.periode,
      tanggalMulai: m.tanggalMulai,
      tanggalSelesai: m.tanggalSelesai,
      status: m.status,
      catatan: m.catatan,
      linkProposal: m.linkProposal,
      linkLaporan: m.linkLaporan,
      linkSertifikat: m.linkSertifikat,
      mahasiswa: m.mahasiswa,
      dpl: m.dplDosen
        ? {
            id: m.dplDosen.id,
            nidn: m.dplDosen.nidn,
            nama: [m.dplDosen.gelarDepan, m.dplDosen.nama, m.dplDosen.gelarBelakang].filter(Boolean).join(' '),
          }
        : null,
      konversi: m.konversi.map((k) => ({
        id: k.id,
        mataKuliahId: k.mataKuliahId,
        kodeMK: k.mataKuliah.kode,
        namaMK: k.mataKuliah.nama,
        sks: k.mataKuliah.sks,
        nilaiHuruf: k.nilaiHuruf,
        bobot: k.bobot,
      })),
      totalSksKonversi: m.konversi.reduce((s, k) => s + k.mataKuliah.sks, 0),
    })),
    periodeList: periodeList.map((p) => p.periode),
  });
});

mbkmRouter.patch('/mbkm/:id', async (req, res) => {
  const body = patchSchema.parse(req.body);
  const existing = await prisma.mbkm.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('MBKM tidak ditemukan');

  if (body.dplDosenId) {
    const d = await prisma.dosen.findUnique({ where: { id: body.dplDosenId } });
    if (!d) throw BadRequest('Dosen DPL tidak ditemukan');
  }

  const data: any = { ...body };
  if (body.tanggalMulai !== undefined) data.tanggalMulai = body.tanggalMulai ? new Date(body.tanggalMulai) : null;
  if (body.tanggalSelesai !== undefined) data.tanggalSelesai = body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;

  const updated = await prisma.mbkm.update({ where: { id: existing.id }, data });
  void writeAudit(req, {
    action: 'mbkm.update.akademik',
    entity: 'mbkm',
    entityId: updated.id,
    metadata: { fields: Object.keys(body) },
  });

  if (body.status && body.status !== existing.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(updated.mahasiswaId);
      if (!userId) return;
      const judul = body.status === 'disetujui' ? 'MBKM Anda disetujui'
        : body.status === 'berjalan' ? 'MBKM Anda dimulai'
        : body.status === 'selesai' ? 'MBKM Anda telah selesai'
        : body.status === 'ditolak' ? 'MBKM Anda ditolak'
        : 'Status MBKM Anda diperbarui';
      await createNotifikasi({
        userId,
        title: judul,
        body: `${updated.namaProgram} · ${updated.mitra}${body.catatan ? `. Catatan: ${body.catatan}` : ''}`,
        type: 'mbkm',
        link: '/mahasiswa/mbkm',
        entity: 'mbkm',
        entityId: updated.id,
      });
    })();
  }

  res.json(updated);
});

mbkmRouter.delete('/mbkm/:id', async (req, res) => {
  const existing = await prisma.mbkm.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('MBKM tidak ditemukan');
  await prisma.mbkm.delete({ where: { id: existing.id } });
  void writeAudit(req, {
    action: 'mbkm.delete',
    entity: 'mbkm',
    entityId: existing.id,
  });
  res.status(204).end();
});

/** Tambah MK konversi ke program MBKM. */
mbkmRouter.post('/mbkm/:id/konversi', async (req, res) => {
  const body = konversiAddSchema.parse(req.body);
  const mbkm = await prisma.mbkm.findUnique({ where: { id: req.params.id } });
  if (!mbkm) throw NotFound('MBKM tidak ditemukan');

  const mk = await prisma.mataKuliah.findUnique({ where: { id: body.mataKuliahId } });
  if (!mk) throw BadRequest('Mata kuliah tidak ditemukan');

  const dup = await prisma.mbkmKonversi.findUnique({
    where: { mbkmId_mataKuliahId: { mbkmId: mbkm.id, mataKuliahId: mk.id } },
  });
  if (dup) throw BadRequest(`MK ${mk.kode} sudah ada di konversi MBKM ini`);

  const created = await prisma.mbkmKonversi.create({
    data: {
      mbkmId: mbkm.id,
      mataKuliahId: mk.id,
      nilaiHuruf: body.nilaiHuruf ?? null,
      bobot: body.nilaiHuruf ? hurufToBobot(body.nilaiHuruf) : null,
    },
  });
  void writeAudit(req, {
    action: 'mbkm.konversi.add',
    entity: 'mbkm',
    entityId: mbkm.id,
    metadata: { mataKuliahKode: mk.kode },
  });
  res.status(201).json(created);
});

mbkmRouter.patch('/mbkm/:id/konversi/:konversiId', async (req, res) => {
  const body = konversiNilaiSchema.parse(req.body);
  const k = await prisma.mbkmKonversi.findUnique({ where: { id: req.params.konversiId } });
  if (!k || k.mbkmId !== req.params.id) throw NotFound('Konversi tidak ditemukan');

  const updated = await prisma.mbkmKonversi.update({
    where: { id: k.id },
    data: { nilaiHuruf: body.nilaiHuruf, bobot: hurufToBobot(body.nilaiHuruf) },
  });
  res.json(updated);
});

mbkmRouter.delete('/mbkm/:id/konversi/:konversiId', async (req, res) => {
  const k = await prisma.mbkmKonversi.findUnique({ where: { id: req.params.konversiId } });
  if (!k || k.mbkmId !== req.params.id) throw NotFound('Konversi tidak ditemukan');
  await prisma.mbkmKonversi.delete({ where: { id: k.id } });
  res.status(204).end();
});
