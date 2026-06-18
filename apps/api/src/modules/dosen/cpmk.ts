// ============================================================
// Dosen — input nilai CPMK per peserta kelas.
// Read-only struktur CPMK (di-define oleh akademik / koordinator MK).
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const cpmkRouter = Router();

/** List CPMK + nilai per peserta untuk kelas tertentu. */
cpmkRouter.get('/kelas/:kelasId/cpmk', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);

  const kelas = await prisma.kelas.findUnique({
    where: { id: req.params.kelasId },
    include: { mataKuliah: { select: { id: true, kode: true, nama: true } } },
  });
  if (!kelas) throw NotFound('Kelas tidak ditemukan');

  const cpmkList = await prisma.cpmk.findMany({
    where: { mataKuliahId: kelas.mataKuliahId, isAktif: true },
    include: {
      cpl: { include: { cpl: { select: { kode: true, deskripsi: true, aspek: true } } } },
    },
    orderBy: [{ urutan: 'asc' }, { kode: 'asc' }],
  });

  const peserta = await prisma.krs.findMany({
    where: { kelasId: req.params.kelasId, status: 'disetujui' },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true } },
      nilaiCpmk: { include: { cpmk: { select: { kode: true } } } },
    },
    orderBy: { mahasiswa: { nim: 'asc' } },
  });

  res.json({
    kelas: { id: kelas.id, kodeMK: kelas.mataKuliah.kode, namaMK: kelas.mataKuliah.nama, kodeKelas: kelas.kodeKelas },
    cpmk: cpmkList.map((c) => ({
      id: c.id,
      kode: c.kode,
      deskripsi: c.deskripsi,
      bobotPenilaian: c.bobotPenilaian,
      ambangTercapai: c.ambangTercapai,
      cpl: c.cpl.map((m) => ({ kode: m.cpl.kode, aspek: m.cpl.aspek, bobot: m.bobot })),
    })),
    peserta: peserta.map((p) => ({
      krsId: p.id,
      mahasiswaId: p.mahasiswaId,
      nim: p.mahasiswa.nim,
      nama: p.mahasiswa.nama,
      nilai: p.nilaiCpmk.map((n) => ({
        cpmkId: n.cpmkId,
        cpmkKode: n.cpmk.kode,
        nilai: n.nilai,
        status: n.status,
      })),
    })),
  });
});

const upsertSchema = z.object({
  items: z.array(z.object({
    krsId: z.string().uuid(),
    cpmkId: z.string().uuid(),
    nilai: z.number().min(0).max(100),
  })).min(1).max(500),
});

/** Bulk upsert nilai CPMK. */
cpmkRouter.post('/kelas/:kelasId/cpmk/nilai', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const { items } = upsertSchema.parse(req.body);

  // Validasi: semua krsId untuk kelas ini + cpmkId untuk MK kelas
  const kelas = await prisma.kelas.findUnique({
    where: { id: req.params.kelasId },
    select: { mataKuliahId: true },
  });
  if (!kelas) throw NotFound('Kelas tidak ditemukan');

  const krsIds = [...new Set(items.map((it) => it.krsId))];
  const cpmkIds = [...new Set(items.map((it) => it.cpmkId))];

  const krsRows = await prisma.krs.findMany({
    where: { id: { in: krsIds }, kelasId: req.params.kelasId, status: 'disetujui' },
    select: { id: true },
  });
  if (krsRows.length !== krsIds.length) throw BadRequest('Ada KRS yang bukan dari kelas ini atau belum disetujui');

  const cpmkRows = await prisma.cpmk.findMany({
    where: { id: { in: cpmkIds }, mataKuliahId: kelas.mataKuliahId },
    select: { id: true, ambangTercapai: true },
  });
  if (cpmkRows.length !== cpmkIds.length) throw BadRequest('Ada CPMK yang bukan dari MK kelas ini');
  const ambangById = new Map(cpmkRows.map((c) => [c.id, c.ambangTercapai]));

  // Upsert dengan auto-status berdasarkan ambang
  await prisma.$transaction(
    items.map((it) =>
      prisma.nilaiCpmk.upsert({
        where: { krsId_cpmkId: { krsId: it.krsId, cpmkId: it.cpmkId } },
        create: {
          krsId: it.krsId,
          cpmkId: it.cpmkId,
          nilai: it.nilai,
          status: it.nilai >= (ambangById.get(it.cpmkId) ?? 56) ? 'tercapai' : 'belum_tercapai',
        },
        update: {
          nilai: it.nilai,
          status: it.nilai >= (ambangById.get(it.cpmkId) ?? 56) ? 'tercapai' : 'belum_tercapai',
        },
      }),
    ),
  );
  void writeAudit(req, {
    action: 'obe.nilai_cpmk.upsert',
    entity: 'kelas',
    entityId: req.params.kelasId,
    metadata: { count: items.length },
  });
  res.json({ ok: true, updated: items.length });
});
