import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { getProdiScope } from '../../lib/context.js';

export const obeRouter = Router();

// ============================================================
// CPL — Capaian Pembelajaran Lulusan per Prodi
// ============================================================

const ASPEK = ['sikap', 'pengetahuan', 'ketrampilan_umum', 'ketrampilan_khusus'] as const;

const cplSchema = z.object({
  prodiId: z.string().uuid(),
  kode: z.string().min(2).max(20),
  deskripsi: z.string().min(10).max(2000),
  aspek: z.enum(ASPEK),
  urutan: z.number().int().min(0).max(999).optional(),
  isAktif: z.boolean().optional(),
});

obeRouter.get('/cpl', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);
  const aspek = req.query.aspek as string | undefined;
  const items = await prisma.cpl.findMany({
    where: {
      ...(prodiId && { prodiId }),
      ...(aspek && { aspek: aspek as any }),
    },
    include: {
      prodi: { select: { kode: true, nama: true } },
      _count: { select: { cpmk: true } },
    },
    orderBy: [{ aspek: 'asc' }, { urutan: 'asc' }, { kode: 'asc' }],
  });
  res.json({ items });
});

obeRouter.post('/cpl', async (req, res) => {
  const body = cplSchema.parse(req.body);
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && body.prodiId !== scopeId) {
    throw Forbidden('Admin prodi hanya boleh kelola CPL untuk prodi-nya sendiri');
  }
  try {
    const created = await prisma.cpl.create({
      data: {
        prodiId: body.prodiId,
        kode: body.kode,
        deskripsi: body.deskripsi,
        aspek: body.aspek,
        urutan: body.urutan ?? 0,
        isAktif: body.isAktif ?? true,
      },
    });
    void writeAudit(req, { action: 'obe.cpl.create', entity: 'cpl', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode CPL sudah dipakai di prodi ini');
    throw e;
  }
});

obeRouter.patch('/cpl/:id', async (req, res) => {
  const exists = await prisma.cpl.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('CPL tidak ditemukan');
  const body = cplSchema.partial().parse(req.body);
  const updated = await prisma.cpl.update({ where: { id: exists.id }, data: body });
  res.json(updated);
});

obeRouter.delete('/cpl/:id', async (req, res) => {
  const exists = await prisma.cpl.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('CPL tidak ditemukan');
  const mappingCount = await prisma.cpmkCpl.count({ where: { cplId: exists.id } });
  if (mappingCount > 0) throw Conflict(`CPL masih dipakai di ${mappingCount} CPMK — hapus mapping dulu`);
  await prisma.cpl.delete({ where: { id: exists.id } });
  res.status(204).end();
});

// ============================================================
// CPMK — Capaian Pembelajaran Mata Kuliah
// ============================================================

const cpmkSchema = z.object({
  mataKuliahId: z.string().uuid(),
  kode: z.string().min(2).max(20),
  deskripsi: z.string().min(10).max(2000),
  bobotPenilaian: z.number().min(0).max(10).optional(),
  ambangTercapai: z.number().min(0).max(100).optional(),
  urutan: z.number().int().min(0).max(999).optional(),
  isAktif: z.boolean().optional(),
});

obeRouter.get('/cpmk', async (req, res) => {
  const mataKuliahId = req.query.mataKuliahId as string | undefined;
  const items = await prisma.cpmk.findMany({
    where: { ...(mataKuliahId && { mataKuliahId }) },
    include: {
      mataKuliah: { select: { kode: true, nama: true, sks: true } },
      cpl: { include: { cpl: { select: { id: true, kode: true, aspek: true, deskripsi: true } } } },
      _count: { select: { nilai: true } },
    },
    orderBy: [{ mataKuliah: { kode: 'asc' } }, { urutan: 'asc' }, { kode: 'asc' }],
  });
  res.json({ items });
});

obeRouter.post('/cpmk', async (req, res) => {
  const body = cpmkSchema.parse(req.body);
  try {
    const created = await prisma.cpmk.create({
      data: {
        mataKuliahId: body.mataKuliahId,
        kode: body.kode,
        deskripsi: body.deskripsi,
        bobotPenilaian: body.bobotPenilaian ?? 1.0,
        ambangTercapai: body.ambangTercapai ?? 56,
        urutan: body.urutan ?? 0,
        isAktif: body.isAktif ?? true,
      },
    });
    void writeAudit(req, { action: 'obe.cpmk.create', entity: 'cpmk', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode CPMK sudah dipakai di MK ini');
    throw e;
  }
});

obeRouter.patch('/cpmk/:id', async (req, res) => {
  const exists = await prisma.cpmk.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('CPMK tidak ditemukan');
  const body = cpmkSchema.partial().parse(req.body);
  const updated = await prisma.cpmk.update({ where: { id: exists.id }, data: body });
  res.json(updated);
});

obeRouter.delete('/cpmk/:id', async (req, res) => {
  const exists = await prisma.cpmk.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('CPMK tidak ditemukan');
  const nilaiCount = await prisma.nilaiCpmk.count({ where: { cpmkId: exists.id } });
  if (nilaiCount > 0) throw Conflict(`CPMK sudah punya ${nilaiCount} nilai mahasiswa — tidak dapat dihapus`);
  await prisma.cpmk.delete({ where: { id: exists.id } });
  res.status(204).end();
});

// ============================================================
// Mapping CPMK ↔ CPL
// ============================================================

const mappingSchema = z.object({
  cplId: z.string().uuid(),
  bobot: z.number().min(0).max(1),
});

obeRouter.post('/cpmk/:cpmkId/cpl', async (req, res) => {
  const cpmk = await prisma.cpmk.findUnique({
    where: { id: req.params.cpmkId },
    include: { mataKuliah: { select: { prodiId: true } } },
  });
  if (!cpmk) throw NotFound('CPMK tidak ditemukan');
  const body = mappingSchema.parse(req.body);
  const cpl = await prisma.cpl.findUnique({ where: { id: body.cplId } });
  if (!cpl) throw BadRequest('CPL tidak ditemukan');
  if (cpl.prodiId !== cpmk.mataKuliah.prodiId) {
    throw BadRequest('CPL harus dari prodi yang sama dengan mata kuliah');
  }
  try {
    const created = await prisma.cpmkCpl.create({
      data: { cpmkId: cpmk.id, cplId: body.cplId, bobot: body.bobot },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('CPL ini sudah ter-mapping ke CPMK tsb');
    throw e;
  }
});

obeRouter.patch('/cpmk/:cpmkId/cpl/:cplId', async (req, res) => {
  const body = z.object({ bobot: z.number().min(0).max(1) }).parse(req.body);
  const existing = await prisma.cpmkCpl.findUnique({
    where: { cpmkId_cplId: { cpmkId: req.params.cpmkId, cplId: req.params.cplId } },
  });
  if (!existing) throw NotFound('Mapping tidak ditemukan');
  const updated = await prisma.cpmkCpl.update({
    where: { cpmkId_cplId: { cpmkId: req.params.cpmkId, cplId: req.params.cplId } },
    data: { bobot: body.bobot },
  });
  res.json(updated);
});

obeRouter.delete('/cpmk/:cpmkId/cpl/:cplId', async (req, res) => {
  await prisma.cpmkCpl.delete({
    where: { cpmkId_cplId: { cpmkId: req.params.cpmkId, cplId: req.params.cplId } },
  }).catch(() => { throw NotFound('Mapping tidak ditemukan'); });
  res.status(204).end();
});

// ============================================================
// Laporan capaian CPL per prodi / angkatan
// ============================================================

/**
 * Rata-rata skor CPL per cohort, hitung dari NilaiCpmk × bobot mapping.
 * Filter: ?prodiId=<id>&angkatan=<tahun>
 */
obeRouter.get('/obe/laporan', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);
  const angkatanQuery = req.query.angkatan as string | undefined;
  if (!prodiId) throw BadRequest('prodiId wajib');

  const angkatan = angkatanQuery ? Number(angkatanQuery) : undefined;
  const mhs = await prisma.mahasiswa.findMany({
    where: { prodiId, ...(angkatan && { angkatan }) },
    select: { id: true, nim: true, nama: true, angkatan: true },
  });
  const mhsIds = mhs.map((m) => m.id);

  const cplList = await prisma.cpl.findMany({
    where: { prodiId, isAktif: true },
    include: { cpmk: { include: { cpmk: true } } },
    orderBy: [{ aspek: 'asc' }, { urutan: 'asc' }, { kode: 'asc' }],
  });

  // Ambil semua nilai CPMK yang relevan
  const nilai = await prisma.nilaiCpmk.findMany({
    where: { krs: { mahasiswaId: { in: mhsIds } } },
    include: { krs: { select: { mahasiswaId: true } } },
  });

  // Index nilai by (mahasiswaId, cpmkId)
  const nilaiByMhsCpmk = new Map<string, number>();
  for (const n of nilai) {
    nilaiByMhsCpmk.set(`${n.krs.mahasiswaId}:${n.cpmkId}`, n.nilai);
  }

  const reportCpl = cplList.map((cpl) => {
    let totalSkorTertimbang = 0;
    let totalBobot = 0;
    let countMhs = 0;
    let countTercapai = 0;

    for (const m of mhs) {
      // Hitung skor CPL mahasiswa ini sebagai weighted avg dari CPMK yang ter-mapping
      let skorMhs = 0;
      let bobotMhs = 0;
      for (const mapping of cpl.cpmk) {
        const key = `${m.id}:${mapping.cpmk.id}`;
        if (nilaiByMhsCpmk.has(key)) {
          skorMhs += nilaiByMhsCpmk.get(key)! * mapping.bobot;
          bobotMhs += mapping.bobot;
        }
      }
      if (bobotMhs > 0) {
        const skor = skorMhs / bobotMhs;
        totalSkorTertimbang += skor;
        totalBobot += 1;
        countMhs++;
        if (skor >= 56) countTercapai++; // threshold default nilai C
      }
    }

    const rataRata = totalBobot > 0 ? totalSkorTertimbang / totalBobot : null;
    return {
      cpl: { id: cpl.id, kode: cpl.kode, deskripsi: cpl.deskripsi, aspek: cpl.aspek },
      jumlahCpmk: cpl.cpmk.length,
      mhsDinilai: countMhs,
      rataRataSkor: rataRata != null ? Math.round(rataRata * 100) / 100 : null,
      persenTercapai: countMhs > 0 ? Math.round((countTercapai / countMhs) * 100) : null,
    };
  });

  res.json({
    prodiId,
    angkatan,
    totalMahasiswa: mhs.length,
    cpl: reportCpl,
  });
});
