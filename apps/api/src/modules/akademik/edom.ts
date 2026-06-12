import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const edomRouter = Router();

const kuesionerSchema = z.object({
  judul: z.string().min(3).max(150),
  semesterId: z.string().uuid(),
});

const aspekSchema = z.object({
  pertanyaan: z.string().min(3).max(500),
  urutan: z.number().int().min(1).max(50).optional(),
});

/** List semua kuesioner EDOM dengan jumlah aspek + response. */
edomRouter.get('/edom/kuesioner', async (_req, res) => {
  const items = await prisma.edomKuesioner.findMany({
    include: {
      semester: { select: { kode: true, jenis: true } },
      _count: { select: { aspek: true, response: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

edomRouter.post('/edom/kuesioner', async (req, res) => {
  const body = kuesionerSchema.parse(req.body);
  const sem = await prisma.semester.findUnique({ where: { id: body.semesterId } });
  if (!sem) throw BadRequest('Semester tidak ditemukan');
  const created = await prisma.edomKuesioner.create({ data: body });
  void writeAudit(req, { action: 'edom.kuesioner.create', entity: 'edom', entityId: created.id });
  res.status(201).json(created);
});

const updateSchema = z.object({
  judul: z.string().min(3).max(150).optional(),
  isAktif: z.boolean().optional(),
});

edomRouter.patch('/edom/kuesioner/:id', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const k = await prisma.edomKuesioner.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kuesioner tidak ditemukan');
  // Saat menyalakan, matikan kuesioner lain di semester yang sama.
  if (body.isAktif === true) {
    await prisma.edomKuesioner.updateMany({
      where: { semesterId: k.semesterId, isAktif: true, NOT: { id: k.id } },
      data: { isAktif: false },
    });
  }
  const updated = await prisma.edomKuesioner.update({ where: { id: k.id }, data: body });
  void writeAudit(req, { action: 'edom.kuesioner.update', entity: 'edom', entityId: k.id, metadata: body });
  res.json(updated);
});

edomRouter.delete('/edom/kuesioner/:id', async (req, res) => {
  const k = await prisma.edomKuesioner.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kuesioner tidak ditemukan');
  await prisma.edomKuesioner.delete({ where: { id: k.id } });
  res.status(204).end();
});

/** Tambah aspek. urutan opsional — auto-increment dari yang ada. */
/** Detail kuesioner + aspek-nya (untuk halaman manage). */
edomRouter.get('/edom/kuesioner/:id', async (req, res) => {
  const k = await prisma.edomKuesioner.findUnique({
    where: { id: req.params.id },
    include: {
      aspek: { orderBy: { urutan: 'asc' } },
      semester: { select: { kode: true, jenis: true } },
    },
  });
  if (!k) throw NotFound('Kuesioner tidak ditemukan');
  res.json(k);
});

edomRouter.post('/edom/kuesioner/:id/aspek', async (req, res) => {
  const body = aspekSchema.parse(req.body);
  const k = await prisma.edomKuesioner.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Kuesioner tidak ditemukan');

  let urutan = body.urutan;
  if (!urutan) {
    const last = await prisma.edomAspek.findFirst({
      where: { kuesionerId: k.id },
      orderBy: { urutan: 'desc' },
      select: { urutan: true },
    });
    urutan = (last?.urutan ?? 0) + 1;
  }
  const dup = await prisma.edomAspek.findUnique({
    where: { kuesionerId_urutan: { kuesionerId: k.id, urutan } },
  });
  if (dup) throw BadRequest(`Urutan ${urutan} sudah dipakai`);

  const created = await prisma.edomAspek.create({
    data: { kuesionerId: k.id, urutan, pertanyaan: body.pertanyaan },
  });
  res.status(201).json(created);
});

edomRouter.patch('/edom/aspek/:id', async (req, res) => {
  const body = aspekSchema.partial().parse(req.body);
  const a = await prisma.edomAspek.findUnique({ where: { id: req.params.id } });
  if (!a) throw NotFound('Aspek tidak ditemukan');
  const updated = await prisma.edomAspek.update({ where: { id: a.id }, data: body });
  res.json(updated);
});

edomRouter.delete('/edom/aspek/:id', async (req, res) => {
  await prisma.edomAspek.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

/**
 * Rekap EDOM untuk satu kuesioner: per kelas, rata-rata per aspek + total.
 * Response rate = jumlah response / jumlah mahasiswa KRS disetujui.
 */
edomRouter.get('/edom/kuesioner/:id/rekap', async (req, res) => {
  const k = await prisma.edomKuesioner.findUnique({
    where: { id: req.params.id },
    include: {
      aspek: { orderBy: { urutan: 'asc' } },
    },
  });
  if (!k) throw NotFound('Kuesioner tidak ditemukan');

  // ambil semua response untuk kuesioner ini + jawaban-nya
  const responses = await prisma.edomResponse.findMany({
    where: { kuesionerId: k.id },
    include: {
      jawaban: true,
      kelas: {
        include: {
          mataKuliah: { select: { kode: true, nama: true } },
          dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
        },
      },
    },
  });

  // group by kelasId
  type KelasRekap = {
    kelasId: string;
    kodeMK: string; namaMK: string; kodeKelas: string;
    dosen: { id: string; nidn: string; nama: string };
    totalResponse: number;
    rataAspek: Record<string, number>; // aspekId -> avg
    rataAgregat: number;
  };
  const byKelas = new Map<string, KelasRekap>();
  // running sums
  const sumAspekPerKelas = new Map<string, Map<string, { sum: number; count: number }>>();

  for (const r of responses) {
    if (!byKelas.has(r.kelasId)) {
      byKelas.set(r.kelasId, {
        kelasId: r.kelasId,
        kodeMK: r.kelas.mataKuliah.kode,
        namaMK: r.kelas.mataKuliah.nama,
        kodeKelas: r.kelas.kodeKelas,
        dosen: {
          id: r.kelas.dosen.id,
          nidn: r.kelas.dosen.nidn,
          nama: [r.kelas.dosen.gelarDepan, r.kelas.dosen.nama, r.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
        },
        totalResponse: 0,
        rataAspek: {},
        rataAgregat: 0,
      });
      sumAspekPerKelas.set(r.kelasId, new Map());
    }
    byKelas.get(r.kelasId)!.totalResponse++;
    const sumMap = sumAspekPerKelas.get(r.kelasId)!;
    for (const j of r.jawaban) {
      const cur = sumMap.get(j.aspekId) ?? { sum: 0, count: 0 };
      cur.sum += j.nilai;
      cur.count++;
      sumMap.set(j.aspekId, cur);
    }
  }
  // jumlah peserta KRS disetujui per kelas (denominator response rate)
  const krsCount = await prisma.krs.groupBy({
    by: ['kelasId'],
    where: { kelasId: { in: [...byKelas.keys()] }, status: 'disetujui' },
    _count: { _all: true },
  });
  const krsCountMap = new Map(krsCount.map((c) => [c.kelasId, c._count._all]));

  const items = [...byKelas.values()].map((b) => {
    const sumMap = sumAspekPerKelas.get(b.kelasId)!;
    const rataAspek: Record<string, number> = {};
    let sumTotal = 0;
    let countTotal = 0;
    for (const a of k.aspek) {
      const s = sumMap.get(a.id);
      const avg = s && s.count > 0 ? +(s.sum / s.count).toFixed(2) : 0;
      rataAspek[a.id] = avg;
      sumTotal += avg;
      countTotal++;
    }
    const rataAgregat = countTotal > 0 ? +(sumTotal / countTotal).toFixed(2) : 0;
    const peserta = krsCountMap.get(b.kelasId) ?? 0;
    const responseRate = peserta > 0 ? Math.round((b.totalResponse / peserta) * 100) : 0;
    return { ...b, rataAspek, rataAgregat, peserta, responseRate };
  });

  res.json({
    kuesioner: { id: k.id, judul: k.judul },
    aspek: k.aspek.map((a) => ({ id: a.id, urutan: a.urutan, pertanyaan: a.pertanyaan })),
    items,
  });
});
