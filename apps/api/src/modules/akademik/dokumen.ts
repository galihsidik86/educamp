import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { httpUrl, intParam } from '../../lib/validators.js';

export const dokumenAdminRouter = Router();

// ---------- Kategori ----------

const kategoriSchema = z.object({
  kode: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Kode hanya huruf kecil/angka/strip'),
  nama: z.string().min(2).max(100),
  deskripsi: z.string().max(500).optional().nullable(),
  urutan: z.number().int().min(0).max(999).optional(),
  isAktif: z.boolean().optional(),
});

dokumenAdminRouter.get('/dokumen/kategori', async (_req, res) => {
  const items = await prisma.kategoriDokumen.findMany({
    include: { _count: { select: { dokumen: true } } },
    orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
  });
  res.json({ items });
});

dokumenAdminRouter.post('/dokumen/kategori', async (req, res) => {
  const body = kategoriSchema.parse(req.body);
  try {
    const created = await prisma.kategoriDokumen.create({
      data: {
        kode: body.kode, nama: body.nama,
        deskripsi: body.deskripsi ?? null,
        urutan: body.urutan ?? 0,
        isAktif: body.isAktif ?? true,
      },
    });
    void writeAudit(req, { action: 'dokumen.kategori.create', entity: 'kategori-dokumen', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode kategori sudah dipakai');
    throw e;
  }
});

dokumenAdminRouter.patch('/dokumen/kategori/:id', async (req, res) => {
  const exists = await prisma.kategoriDokumen.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Kategori tidak ditemukan');
  const body = kategoriSchema.partial().parse(req.body);
  const updated = await prisma.kategoriDokumen.update({ where: { id: exists.id }, data: body });
  res.json(updated);
});

dokumenAdminRouter.delete('/dokumen/kategori/:id', async (req, res) => {
  const exists = await prisma.kategoriDokumen.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Kategori tidak ditemukan');
  const dokCount = await prisma.dokumen.count({ where: { kategoriId: exists.id } });
  if (dokCount > 0) throw Conflict(`Kategori dipakai di ${dokCount} dokumen — pindahkan/hapus dokumen terlebih dahulu`);
  await prisma.kategoriDokumen.delete({ where: { id: exists.id } });
  res.status(204).end();
});

// ---------- Dokumen ----------

const targetRegex = /^(all|mahasiswa|dosen|prodi:[0-9a-f-]{36})$/;

const dokumenSchema = z.object({
  kategoriId: z.string().uuid(),
  judul: z.string().min(3).max(200),
  deskripsi: z.string().max(2000).optional().nullable(),
  versi: z.string().max(40).optional().nullable(),
  target: z.string().regex(targetRegex, 'Target harus all/mahasiswa/dosen/prodi:<id>'),
  fileUrl: httpUrl, // http/https saja — anti stored-XSS pada link dokumen
  jenisFile: z.string().max(20).optional().nullable(),
  ukuranByte: z.number().int().min(0).optional().nullable(),
  tanggalBerlaku: z.string().optional().nullable(),
  tanggalKedaluwarsa: z.string().optional().nullable(),
  isAktif: z.boolean().optional(),
});

dokumenAdminRouter.get('/dokumen', async (req, res) => {
  const kategoriId = req.query.kategoriId as string | undefined;
  const status = req.query.status as 'aktif' | 'nonaktif' | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.dokumen.findMany({
    where: {
      ...(kategoriId && { kategoriId }),
      ...(status === 'aktif' && { isAktif: true }),
      ...(status === 'nonaktif' && { isAktif: false }),
      ...(q && {
        OR: [
          { judul: { contains: q } },
          { deskripsi: { contains: q } },
        ],
      }),
    },
    include: { kategori: { select: { kode: true, nama: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ items });
});

dokumenAdminRouter.post('/dokumen', async (req, res) => {
  const body = dokumenSchema.parse(req.body);
  // Validasi prodi target bila bentuknya prodi:<id>
  if (body.target.startsWith('prodi:')) {
    const pid = body.target.slice(6);
    const exists = await prisma.prodi.findUnique({ where: { id: pid } });
    if (!exists) throw BadRequest('Prodi tujuan target tidak ditemukan');
  }
  const created = await prisma.dokumen.create({
    data: {
      kategoriId: body.kategoriId,
      judul: body.judul,
      deskripsi: body.deskripsi ?? null,
      versi: body.versi ?? null,
      target: body.target,
      fileUrl: body.fileUrl,
      jenisFile: body.jenisFile ?? null,
      ukuranByte: body.ukuranByte ?? null,
      tanggalBerlaku: body.tanggalBerlaku ? new Date(body.tanggalBerlaku) : null,
      tanggalKedaluwarsa: body.tanggalKedaluwarsa ? new Date(body.tanggalKedaluwarsa) : null,
      isAktif: body.isAktif ?? true,
    },
  });
  void writeAudit(req, { action: 'dokumen.create', entity: 'dokumen', entityId: created.id, metadata: { judul: created.judul, target: created.target } });
  res.status(201).json(created);
});

dokumenAdminRouter.patch('/dokumen/:id', async (req, res) => {
  const exists = await prisma.dokumen.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Dokumen tidak ditemukan');
  const body = dokumenSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggalBerlaku !== undefined) data.tanggalBerlaku = body.tanggalBerlaku ? new Date(body.tanggalBerlaku) : null;
  if (body.tanggalKedaluwarsa !== undefined) data.tanggalKedaluwarsa = body.tanggalKedaluwarsa ? new Date(body.tanggalKedaluwarsa) : null;
  if (body.target && body.target.startsWith('prodi:')) {
    const pid = body.target.slice(6);
    const p = await prisma.prodi.findUnique({ where: { id: pid } });
    if (!p) throw BadRequest('Prodi tujuan target tidak ditemukan');
  }
  const updated = await prisma.dokumen.update({ where: { id: exists.id }, data });
  res.json(updated);
});

dokumenAdminRouter.delete('/dokumen/:id', async (req, res) => {
  const exists = await prisma.dokumen.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Dokumen tidak ditemukan');
  await prisma.dokumen.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'dokumen.delete', entity: 'dokumen', entityId: exists.id, metadata: { judul: exists.judul } });
  res.status(204).end();
});

dokumenAdminRouter.get('/dokumen/:id/akses', async (req, res) => {
  const take = intParam(req.query.take, 100, { min: 1, max: 500 });
  const items = await prisma.dokumenAkses.findMany({
    where: { dokumenId: req.params.id },
    include: {
      user: { select: { email: true, role: true, mahasiswa: { select: { nim: true, nama: true } }, dosen: { select: { nidn: true, nama: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json({ items });
});
