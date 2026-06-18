import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const yudisiumRouter = Router();

// ============================================================
// Periode Wisuda CRUD
// ============================================================

const periodeSchema = z.object({
  kode: z.string().regex(/^\d{4}-\d$/, 'Format kode: 2026-1'),
  nama: z.string().min(3).max(120),
  tanggal: z.string().min(1),
  isPendaftaranBuka: z.boolean().optional(),
  batasIpk: z.number().min(0).max(4).optional().nullable(),
  batasSks: z.number().int().min(0).max(500).optional().nullable(),
});

yudisiumRouter.get('/periode-wisuda', async (_req, res) => {
  const items = await prisma.periodeWisuda.findMany({
    include: { _count: { select: { yudisium: true } } },
    orderBy: { tanggal: 'desc' },
  });
  res.json({ items });
});

yudisiumRouter.post('/periode-wisuda', async (req, res) => {
  const body = periodeSchema.parse(req.body);
  const dup = await prisma.periodeWisuda.findUnique({ where: { kode: body.kode } });
  if (dup) throw Conflict('Kode periode sudah dipakai');
  const created = await prisma.periodeWisuda.create({
    data: {
      kode: body.kode,
      nama: body.nama,
      tanggal: new Date(body.tanggal),
      isPendaftaranBuka: body.isPendaftaranBuka ?? true,
      batasIpk: body.batasIpk ?? null,
      batasSks: body.batasSks ?? null,
    },
  });
  void writeAudit(req, { action: 'periode-wisuda.create', entity: 'periode-wisuda', entityId: created.id });
  res.status(201).json(created);
});

yudisiumRouter.patch('/periode-wisuda/:id', async (req, res) => {
  const body = periodeSchema.partial().parse(req.body);
  const exists = await prisma.periodeWisuda.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Periode wisuda tidak ditemukan');
  const data: any = { ...body };
  if (body.tanggal !== undefined) data.tanggal = new Date(body.tanggal);
  const updated = await prisma.periodeWisuda.update({ where: { id: exists.id }, data });
  res.json(updated);
});

yudisiumRouter.delete('/periode-wisuda/:id', async (req, res) => {
  const used = await prisma.yudisium.count({ where: { periodeWisudaId: req.params.id } });
  if (used > 0) throw BadRequest(`Periode dipakai oleh ${used} pendaftaran yudisium`);
  await prisma.periodeWisuda.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ============================================================
// Pendaftaran Yudisium
// ============================================================

const yudisiumPatchSchema = z.object({
  status: z.enum(['pendaftaran', 'verifikasi', 'layak', 'tidak_layak', 'wisuda', 'batal']).optional(),
  predikat: z.enum(['cumlaude', 'sangat_memuaskan', 'memuaskan', 'tidak_lulus']).optional().nullable(),
  catatan: z.string().max(1000).optional().nullable(),
  noIjazah: z.string().max(50).optional().nullable(),
  noSkl: z.string().max(50).optional().nullable(),
  tanggalLulus: z.string().optional().nullable(),
});

yudisiumRouter.get('/yudisium', async (req, res) => {
  const status = req.query.status as string | undefined;
  const periodeWisudaId = req.query.periodeWisudaId as string | undefined;

  const items = await prisma.yudisium.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(periodeWisudaId && { periodeWisudaId }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } }, angkatan: true } },
      periodeWisuda: true,
    },
    orderBy: [{ periodeWisuda: { tanggal: 'desc' } }, { mahasiswa: { nim: 'asc' } }],
    take: 500,
  });

  res.json({ items });
});

yudisiumRouter.patch('/yudisium/:id', async (req, res) => {
  const body = yudisiumPatchSchema.parse(req.body);
  const existing = await prisma.yudisium.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Pendaftaran yudisium tidak ditemukan');

  const data: any = { ...body };
  if (body.tanggalLulus !== undefined) data.tanggalLulus = body.tanggalLulus ? new Date(body.tanggalLulus) : null;

  // Auto-generate token verifikasi saat transisi pertama kali ke 'wisuda'
  if (body.status === 'wisuda' && existing.status !== 'wisuda' && !existing.verifikasiToken) {
    data.verifikasiToken = generateVerifikasiToken();
  }

  const updated = await prisma.yudisium.update({ where: { id: existing.id }, data });

  // Auto-sync mahasiswa.status → 'lulus' saat yudisium berstatus 'wisuda'
  if (body.status === 'wisuda' && existing.status !== 'wisuda') {
    await prisma.mahasiswa.update({
      where: { id: updated.mahasiswaId },
      data: { status: 'lulus' },
    });
  }
  void writeAudit(req, {
    action: 'yudisium.update.akademik',
    entity: 'yudisium',
    entityId: updated.id,
    metadata: { fields: Object.keys(body) },
  });

  if (body.status && body.status !== existing.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(updated.mahasiswaId);
      if (!userId) return;
      const judul = body.status === 'layak' ? 'Anda dinyatakan layak yudisium'
        : body.status === 'tidak_layak' ? 'Pendaftaran yudisium Anda ditolak'
        : body.status === 'wisuda' ? 'Selamat! Anda telah diwisuda'
        : body.status === 'verifikasi' ? 'Pendaftaran yudisium sedang diverifikasi'
        : 'Status yudisium Anda diperbarui';
      await createNotifikasi({
        userId,
        title: judul,
        body: body.catatan ?? undefined,
        type: 'yudisium',
        link: '/mahasiswa/yudisium',
        entity: 'yudisium',
        entityId: updated.id,
      });
    })();
  }

  res.json(updated);
});

/** Generate / regen token verifikasi (untuk QR di ijazah & SKL). */
yudisiumRouter.post('/yudisium/:id/regen-token', async (req, res) => {
  const existing = await prisma.yudisium.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Pendaftaran yudisium tidak ditemukan');
  const token = generateVerifikasiToken();
  const updated = await prisma.yudisium.update({
    where: { id: existing.id },
    data: { verifikasiToken: token },
  });
  void writeAudit(req, {
    action: 'yudisium.regen_token',
    entity: 'yudisium',
    entityId: updated.id,
    metadata: { tokenLama: existing.verifikasiToken },
  });
  res.json({ verifikasiToken: updated.verifikasiToken });
});

/** Helper: generate token URL-safe 16 char (~96 bit entropy). */
function generateVerifikasiToken(): string {
  return crypto.randomBytes(12).toString('base64url');
}
