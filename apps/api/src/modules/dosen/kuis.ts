import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser, requireKelasOwnership } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const kuisRouter = Router();

const kuisSchema = z.object({
  judul: z.string().min(3).max(200),
  deskripsi: z.string().max(2000).optional().nullable(),
  durasiMenit: z.number().int().min(5).max(240),
  mulai: z.string().min(1),
  selesai: z.string().min(1),
  acak: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  masukNilaiTugas: z.boolean().optional(),
});

const soalSchema = z.object({
  pertanyaan: z.string().min(3).max(2000),
  opsi: z.array(z.string().min(1).max(500)).min(2).max(8),
  jawaban: z.number().int().min(0),
  bobot: z.number().int().min(1).max(100).optional(),
  urutan: z.number().int().min(0).max(9999).optional(),
});

/** List kuis di sebuah kelas (lengkap dengan ringkasan attempt). */
kuisRouter.get('/kelas/:kelasId/kuis', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const items = await prisma.kuis.findMany({
    where: { kelasId: req.params.kelasId },
    include: { _count: { select: { soal: true, attempt: true } } },
    orderBy: { mulai: 'desc' },
  });
  res.json({ items });
});

kuisRouter.post('/kelas/:kelasId/kuis', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  await requireKelasOwnership(d.id, req.params.kelasId);
  const body = kuisSchema.parse(req.body);
  const mulai = new Date(body.mulai);
  const selesai = new Date(body.selesai);
  if (mulai >= selesai) throw BadRequest('Waktu mulai harus sebelum waktu selesai');
  const created = await prisma.kuis.create({
    data: {
      kelasId: req.params.kelasId,
      judul: body.judul,
      deskripsi: body.deskripsi ?? null,
      durasiMenit: body.durasiMenit,
      mulai,
      selesai,
      acak: body.acak ?? true,
      isPublished: body.isPublished ?? false,
      masukNilaiTugas: body.masukNilaiTugas ?? false,
    },
  });
  void writeAudit(req, { action: 'kuis.create', entity: 'kuis', entityId: created.id, metadata: { kelasId: req.params.kelasId } });
  res.status(201).json(created);
});

kuisRouter.get('/kuis/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.kuis.findUnique({
    where: { id: req.params.id },
    include: {
      kelas: { include: { mataKuliah: true } },
      soal: { orderBy: { urutan: 'asc' } },
      _count: { select: { attempt: true } },
    },
  });
  if (!k) throw NotFound('Kuis tidak ditemukan');
  await requireKelasOwnership(d.id, k.kelasId);
  res.json(k);
});

kuisRouter.patch('/kuis/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.kuis.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kuis tidak ditemukan');
  await requireKelasOwnership(d.id, k.kelasId);
  const body = kuisSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.mulai !== undefined) data.mulai = new Date(body.mulai);
  if (body.selesai !== undefined) data.selesai = new Date(body.selesai);
  // Publish requires minimal 1 soal
  if (body.isPublished === true) {
    const count = await prisma.kuisSoal.count({ where: { kuisId: k.id } });
    if (count === 0) throw BadRequest('Tambahkan minimal 1 soal sebelum publish');
  }
  const updated = await prisma.kuis.update({ where: { id: k.id }, data });
  res.json(updated);
});

kuisRouter.delete('/kuis/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.kuis.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kuis tidak ditemukan');
  await requireKelasOwnership(d.id, k.kelasId);
  const attemptCount = await prisma.kuisAttempt.count({ where: { kuisId: k.id } });
  if (attemptCount > 0) throw BadRequest('Kuis sudah dikerjakan mahasiswa, tidak dapat dihapus');
  await prisma.kuis.delete({ where: { id: k.id } });
  res.status(204).end();
});

// ---------- Soal ----------

async function getKuisOwned(userId: string, kuisId: string) {
  const d = await getDosenForUser(userId);
  const k = await prisma.kuis.findUnique({ where: { id: kuisId } });
  if (!k) throw NotFound('Kuis tidak ditemukan');
  await requireKelasOwnership(d.id, k.kelasId);
  return k;
}

kuisRouter.post('/kuis/:kuisId/soal', async (req, res) => {
  const k = await getKuisOwned(req.user!.sub, req.params.kuisId);
  const body = soalSchema.parse(req.body);
  if (body.jawaban >= body.opsi.length) throw BadRequest('Index jawaban di luar jumlah opsi');
  const lastUrutan = body.urutan ?? (await prisma.kuisSoal.count({ where: { kuisId: k.id } }));
  const created = await prisma.kuisSoal.create({
    data: {
      kuisId: k.id,
      pertanyaan: body.pertanyaan,
      opsi: body.opsi,
      jawaban: body.jawaban,
      bobot: body.bobot ?? 1,
      urutan: lastUrutan,
    },
  });
  res.status(201).json(created);
});

kuisRouter.patch('/soal/:id', async (req, res) => {
  const existing = await prisma.kuisSoal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Soal tidak ditemukan');
  await getKuisOwned(req.user!.sub, existing.kuisId);
  const body = soalSchema.partial().parse(req.body);
  if (body.opsi && body.jawaban !== undefined && body.jawaban >= body.opsi.length) {
    throw BadRequest('Index jawaban di luar jumlah opsi');
  }
  const updated = await prisma.kuisSoal.update({ where: { id: existing.id }, data: body });
  res.json(updated);
});

kuisRouter.delete('/soal/:id', async (req, res) => {
  const existing = await prisma.kuisSoal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Soal tidak ditemukan');
  await getKuisOwned(req.user!.sub, existing.kuisId);
  await prisma.kuisSoal.delete({ where: { id: existing.id } });
  res.status(204).end();
});

// ---------- Hasil / rekap ----------

kuisRouter.get('/kuis/:id/hasil', async (req, res) => {
  const k = await getKuisOwned(req.user!.sub, req.params.id);
  const attempt = await prisma.kuisAttempt.findMany({
    where: { kuisId: k.id },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
    orderBy: [{ status: 'asc' }, { selesaiPada: 'desc' }],
  });
  // Peserta = mahasiswa KRS disetujui di kelas kuis
  const peserta = await prisma.krs.findMany({
    where: { kelasId: k.kelasId, status: 'disetujui' },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
    orderBy: { mahasiswa: { nim: 'asc' } },
  });
  const attemptByMhs = new Map(attempt.map((a) => [a.mahasiswaId, a]));
  res.json({
    kuis: { id: k.id, judul: k.judul, mulai: k.mulai, selesai: k.selesai, durasiMenit: k.durasiMenit },
    items: peserta.map((p) => {
      const a = attemptByMhs.get(p.mahasiswaId);
      return {
        mahasiswaId: p.mahasiswaId,
        nim: p.mahasiswa.nim,
        nama: p.mahasiswa.nama,
        attempt: a ? {
          id: a.id, status: a.status,
          mulaiPada: a.mulaiPada, selesaiPada: a.selesaiPada,
          skor: a.skor, maxSkor: a.maxSkor, persen: a.persen,
        } : null,
      };
    }),
  });
});
