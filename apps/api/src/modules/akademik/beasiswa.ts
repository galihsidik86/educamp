import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const beasiswaRouter = Router();

const masterSchema = z.object({
  kode: z.string().regex(/^[A-Z0-9-]{3,40}$/, 'Kode hanya huruf besar, angka, dan tanda hubung'),
  nama: z.string().min(3).max(150),
  penyelenggara: z.string().min(2).max(100),
  deskripsi: z.string().max(5000).optional().nullable(),
  kuota: z.number().int().min(0).max(10000).optional().nullable(),
  nominal: z.number().min(0),
  syaratIpk: z.number().min(0).max(4).optional().nullable(),
  syaratAngkatanMin: z.number().int().optional().nullable(),
  syaratAngkatanMax: z.number().int().optional().nullable(),
  pendaftaranBuka: z.boolean().optional(),
  tanggalBuka: z.string().optional().nullable(),
  tanggalTutup: z.string().optional().nullable(),
});

// ============================================================
// Master Beasiswa CRUD
// ============================================================

beasiswaRouter.get('/beasiswa', async (_req, res) => {
  const items = await prisma.beasiswa.findMany({
    include: { _count: { select: { pendaftaran: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: items.map((b) => ({
      ...b,
      nominal: Number(b.nominal),
      jumlahPendaftar: b._count.pendaftaran,
    })),
  });
});

beasiswaRouter.post('/beasiswa', async (req, res) => {
  const body = masterSchema.parse(req.body);
  const dup = await prisma.beasiswa.findUnique({ where: { kode: body.kode } });
  if (dup) throw Conflict('Kode beasiswa sudah dipakai');
  const data: any = { ...body };
  if (body.tanggalBuka !== undefined) data.tanggalBuka = body.tanggalBuka ? new Date(body.tanggalBuka) : null;
  if (body.tanggalTutup !== undefined) data.tanggalTutup = body.tanggalTutup ? new Date(body.tanggalTutup) : null;
  const created = await prisma.beasiswa.create({ data });
  void writeAudit(req, { action: 'beasiswa.create', entity: 'beasiswa', entityId: created.id, metadata: { kode: body.kode } });
  res.status(201).json({ ...created, nominal: Number(created.nominal) });
});

beasiswaRouter.patch('/beasiswa/:id', async (req, res) => {
  const exists = await prisma.beasiswa.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Beasiswa tidak ditemukan');
  const body = masterSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggalBuka !== undefined) data.tanggalBuka = body.tanggalBuka ? new Date(body.tanggalBuka) : null;
  if (body.tanggalTutup !== undefined) data.tanggalTutup = body.tanggalTutup ? new Date(body.tanggalTutup) : null;
  const updated = await prisma.beasiswa.update({ where: { id: exists.id }, data });
  res.json({ ...updated, nominal: Number(updated.nominal) });
});

beasiswaRouter.delete('/beasiswa/:id', async (req, res) => {
  const count = await prisma.pendaftaranBeasiswa.count({ where: { beasiswaId: req.params.id } });
  if (count > 0) throw BadRequest(`Beasiswa dipakai oleh ${count} pendaftaran`);
  await prisma.beasiswa.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ============================================================
// Pendaftar
// ============================================================

beasiswaRouter.get('/beasiswa/:id/pendaftar', async (req, res) => {
  const status = req.query.status as string | undefined;
  const items = await prisma.pendaftaranBeasiswa.findMany({
    where: {
      beasiswaId: req.params.id,
      ...(status && { status: status as any }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, angkatan: true, prodi: { select: { kode: true, nama: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

const patchPendaftaranSchema = z.object({
  status: z.enum(['diajukan', 'dalam_seleksi', 'diterima', 'ditolak', 'batal']).optional(),
  catatan: z.string().max(1000).optional().nullable(),
});

beasiswaRouter.patch('/beasiswa/pendaftaran/:id', async (req, res) => {
  const body = patchPendaftaranSchema.parse(req.body);
  const existing = await prisma.pendaftaranBeasiswa.findUnique({
    where: { id: req.params.id },
    include: { beasiswa: true },
  });
  if (!existing) throw NotFound('Pendaftaran tidak ditemukan');

  // Saat menerima, cek kuota
  if (body.status === 'diterima' && existing.beasiswa.kuota != null) {
    const sudahDiterima = await prisma.pendaftaranBeasiswa.count({
      where: { beasiswaId: existing.beasiswaId, status: 'diterima', NOT: { id: existing.id } },
    });
    if (sudahDiterima >= existing.beasiswa.kuota) {
      throw BadRequest(`Kuota beasiswa (${existing.beasiswa.kuota}) sudah penuh dengan ${sudahDiterima} penerima`);
    }
  }

  const updated = await prisma.pendaftaranBeasiswa.update({ where: { id: existing.id }, data: body });
  void writeAudit(req, {
    action: 'beasiswa.pendaftaran.update',
    entity: 'pendaftaran-beasiswa',
    entityId: updated.id,
    metadata: { fields: Object.keys(body) },
  });

  if (body.status && body.status !== existing.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(updated.mahasiswaId);
      if (!userId) return;
      const judul = body.status === 'diterima' ? `Selamat! Anda diterima sebagai penerima ${existing.beasiswa.nama}`
        : body.status === 'ditolak' ? `Pengajuan beasiswa ${existing.beasiswa.nama} ditolak`
        : body.status === 'dalam_seleksi' ? `Pengajuan beasiswa ${existing.beasiswa.nama} masuk seleksi`
        : 'Status pendaftaran beasiswa Anda diperbarui';
      await createNotifikasi({
        userId,
        title: judul,
        body: body.catatan ?? undefined,
        type: 'beasiswa',
        link: '/mahasiswa/beasiswa',
        entity: 'pendaftaran-beasiswa',
        entityId: updated.id,
      });
    })();
  }

  res.json(updated);
});
