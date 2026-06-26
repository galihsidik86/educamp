// ============================================================
// Aktivitas Mahasiswa — unified MBKM/Pertukaran/Magang/Riset/PKL/PPL.
// Endpoint: list/CRUD aktivitas + manage peserta + manage pembimbing.
// ============================================================
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound, Forbidden } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { enqueueFeederChange, buildFeederPayload } from '../../lib/feeder/queue.js';
import { getProdiScope } from '../../lib/context.js';

export const aktivitasMhsRouter = Router();

const JENIS = [
  'pertukaran_pelajar', 'magang', 'asistensi_mengajar', 'riset',
  'pengabdian_masyarakat', 'kewirausahaan', 'proyek_independen',
  'proyek_kemanusiaan', 'bela_negara', 'kkn_tematik', 'kerja_praktek',
  'studi_independen', 'ppl', 'lainnya',
] as const;

aktivitasMhsRouter.get('/aktivitas-mahasiswa', async (req, res) => {
  const semesterId = req.query.semesterId as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const status = req.query.status as string | undefined;
  const isMbkm = req.query.isMbkm as string | undefined;

  const items = await prisma.aktivitasMahasiswa.findMany({
    where: {
      ...(semesterId && { semesterId }),
      ...(jenis && { jenis: jenis as any }),
      ...(status && { status: status as any }),
      ...(isMbkm === 'true' && { isMbkm: true }),
    },
    include: {
      semester: { select: { kode: true, jenis: true } },
      peserta: {
        include: { mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true } } } } },
      },
      pembimbing: {
        include: { dosen: { select: { id: true, nidn: true, nama: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  res.json({ items });
});

aktivitasMhsRouter.get('/aktivitas-mahasiswa/:id', async (req, res) => {
  const item = await prisma.aktivitasMahasiswa.findUnique({
    where: { id: req.params.id },
    include: {
      semester: { select: { kode: true, jenis: true } },
      peserta: {
        include: { mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } } },
      },
      pembimbing: {
        include: { dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } } },
      },
    },
  });
  if (!item) throw NotFound();
  res.json(item);
});

const upsertSchema = z.object({
  jenis: z.enum(JENIS),
  nama: z.string().min(1).max(200),
  deskripsi: z.string().max(2000).optional().nullable(),
  semesterId: z.string().uuid(),
  lokasi: z.string().max(200).optional().nullable(),
  mitra: z.string().max(200).optional().nullable(),
  isMbkm: z.boolean().optional(),
  isFlagship: z.boolean().optional(),
  isEksternal: z.boolean().optional(),
  linkProposal: z.string().max(500).optional().nullable(),
  linkLaporan: z.string().max(500).optional().nullable(),
  linkSertifikat: z.string().max(500).optional().nullable(),
  tanggalMulai: z.string().optional().nullable(),
  tanggalSelesai: z.string().optional().nullable(),
  status: z.enum(['diajukan', 'berjalan', 'selesai', 'dibatalkan']).optional(),
  catatan: z.string().max(2000).optional().nullable(),
});

aktivitasMhsRouter.post('/aktivitas-mahasiswa', async (req, res) => {
  const body = upsertSchema.parse(req.body);
  const created = await prisma.aktivitasMahasiswa.create({
    data: {
      ...body,
      tanggalMulai: body.tanggalMulai ? new Date(body.tanggalMulai) : null,
      tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null,
    },
  });
  void enqueueAktivitasPayload(created.id, 'create');
  void writeAudit(req, { action: 'aktivitas_mhs.create', entity: 'aktivitas' as any, entityId: created.id });
  res.status(201).json(created);
});

aktivitasMhsRouter.patch('/aktivitas-mahasiswa/:id', async (req, res) => {
  const body = upsertSchema.partial().parse(req.body);
  const exist = await prisma.aktivitasMahasiswa.findUnique({ where: { id: req.params.id } });
  if (!exist) throw NotFound();

  const updated = await prisma.aktivitasMahasiswa.update({
    where: { id: req.params.id },
    data: {
      ...(body.jenis !== undefined && { jenis: body.jenis }),
      ...(body.nama !== undefined && { nama: body.nama }),
      ...(body.deskripsi !== undefined && { deskripsi: body.deskripsi }),
      ...(body.semesterId !== undefined && { semesterId: body.semesterId }),
      ...(body.lokasi !== undefined && { lokasi: body.lokasi }),
      ...(body.mitra !== undefined && { mitra: body.mitra }),
      ...(body.isMbkm !== undefined && { isMbkm: body.isMbkm }),
      ...(body.isFlagship !== undefined && { isFlagship: body.isFlagship }),
      ...(body.isEksternal !== undefined && { isEksternal: body.isEksternal }),
      ...(body.linkProposal !== undefined && { linkProposal: body.linkProposal }),
      ...(body.linkLaporan !== undefined && { linkLaporan: body.linkLaporan }),
      ...(body.linkSertifikat !== undefined && { linkSertifikat: body.linkSertifikat }),
      ...(body.tanggalMulai !== undefined && { tanggalMulai: body.tanggalMulai ? new Date(body.tanggalMulai) : null }),
      ...(body.tanggalSelesai !== undefined && { tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.catatan !== undefined && { catatan: body.catatan }),
    },
  });
  void enqueueAktivitasPayload(updated.id, 'update');
  void writeAudit(req, { action: 'aktivitas_mhs.update', entity: 'aktivitas' as any, entityId: updated.id });
  res.json(updated);
});

aktivitasMhsRouter.delete('/aktivitas-mahasiswa/:id', async (req, res) => {
  const exist = await prisma.aktivitasMahasiswa.findUnique({ where: { id: req.params.id } });
  if (!exist) throw NotFound();
  if (exist.feederId) {
    void enqueueAktivitasPayload(exist.id, 'delete');
  }
  await prisma.aktivitasMahasiswa.delete({ where: { id: req.params.id } });
  void writeAudit(req, { action: 'aktivitas_mhs.delete', entity: 'aktivitas' as any, entityId: req.params.id });
  res.json({ ok: true });
});

// ============================================================
// Peserta — manage anggota aktivitas.
// PUT replace semua peserta sekaligus (simpler).
// ============================================================
const pesertaSchema = z.object({
  items: z.array(z.object({
    mahasiswaId: z.string().uuid(),
    peran: z.string().max(80).optional().nullable(),
    konversiSks: z.number().int().min(0).max(40).optional().nullable(),
  })).max(100),
});

aktivitasMhsRouter.put('/aktivitas-mahasiswa/:id/peserta', async (req, res) => {
  const exist = await prisma.aktivitasMahasiswa.findUnique({ where: { id: req.params.id } });
  if (!exist) throw NotFound();
  const body = pesertaSchema.parse(req.body);

  // Scope check: kalau prodi-scoped admin, semua mhs harus di prodi-nya
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && body.items.length > 0) {
    const mhsList = await prisma.mahasiswa.findMany({
      where: { id: { in: body.items.map((i) => i.mahasiswaId) } },
      select: { id: true, prodiId: true, nim: true },
    });
    const outOfScope = mhsList.filter((m) => m.prodiId !== scopeId);
    if (outOfScope.length > 0) {
      throw Forbidden(`Mhs di luar scope prodi: ${outOfScope.map((m) => m.nim).join(', ')}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    const keepIds = new Set(body.items.map((i) => i.mahasiswaId));
    await tx.pesertaAktivitas.deleteMany({
      where: { aktivitasId: req.params.id, mahasiswaId: { notIn: Array.from(keepIds) as string[] } },
    });
    for (const item of body.items) {
      await tx.pesertaAktivitas.upsert({
        where: { aktivitasId_mahasiswaId: { aktivitasId: req.params.id, mahasiswaId: item.mahasiswaId } },
        create: { aktivitasId: req.params.id, mahasiswaId: item.mahasiswaId, peran: item.peran ?? null, konversiSks: item.konversiSks ?? null },
        update: { peran: item.peran ?? null, konversiSks: item.konversiSks ?? null },
      });
    }
  });

  void enqueueAktivitasPayload(req.params.id, 'update');
  void writeAudit(req, { action: 'aktivitas_mhs.peserta.update', entity: 'aktivitas' as any, entityId: req.params.id, metadata: { count: body.items.length } });

  const updated = await prisma.pesertaAktivitas.findMany({
    where: { aktivitasId: req.params.id },
    include: { mahasiswa: { select: { id: true, nim: true, nama: true } } },
  });
  res.json({ items: updated });
});

// Pembimbing
const pembimbingSchema = z.object({
  items: z.array(z.object({
    dosenId: z.string().uuid(),
    peran: z.string().max(80).optional().nullable(),
  })).max(20),
});

aktivitasMhsRouter.put('/aktivitas-mahasiswa/:id/pembimbing', async (req, res) => {
  const exist = await prisma.aktivitasMahasiswa.findUnique({ where: { id: req.params.id } });
  if (!exist) throw NotFound();
  const body = pembimbingSchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    const keepIds = new Set(body.items.map((i) => i.dosenId));
    await tx.pembimbingAktivitas.deleteMany({
      where: { aktivitasId: req.params.id, dosenId: { notIn: Array.from(keepIds) as string[] } },
    });
    for (const item of body.items) {
      await tx.pembimbingAktivitas.upsert({
        where: { aktivitasId_dosenId: { aktivitasId: req.params.id, dosenId: item.dosenId } },
        create: { aktivitasId: req.params.id, dosenId: item.dosenId, peran: item.peran ?? null },
        update: { peran: item.peran ?? null },
      });
    }
  });

  void enqueueAktivitasPayload(req.params.id, 'update');
  void writeAudit(req, { action: 'aktivitas_mhs.pembimbing.update', entity: 'aktivitas' as any, entityId: req.params.id, metadata: { count: body.items.length } });

  const updated = await prisma.pembimbingAktivitas.findMany({
    where: { aktivitasId: req.params.id },
    include: { dosen: { select: { id: true, nidn: true, nama: true } } },
  });
  res.json({ items: updated });
});

async function enqueueAktivitasPayload(id: string, op: 'create' | 'update' | 'delete') {
  const payload = await buildFeederPayload('aktivitas' as any, id);
  if (!payload) return;
  await enqueueFeederChange({ entity: 'aktivitas' as any, entityId: id, operation: op, payload });
}
