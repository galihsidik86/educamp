import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { getAkademikForUser } from '../../lib/context.js';
import { generateSertifikatToken, issueSertifikat } from '../../lib/sertifikat.js';

export const sertifikatAdminRouter = Router();

const JENIS = ['kkn', 'mbkm', 'edom', 'workshop', 'panitia', 'asisten', 'lain'] as const;

const createSchema = z.object({
  mahasiswaId: z.string().uuid(),
  jenis: z.enum(JENIS),
  judul: z.string().min(5).max(200),
  deskripsi: z.string().max(2000).optional().nullable(),
  periode: z.string().max(50).optional().nullable(),
  ttdNama: z.string().max(100).optional().nullable(),
  ttdJabatan: z.string().max(100).optional().nullable(),
});

/** List sertifikat dengan filter jenis/status + search NIM/nama. */
sertifikatAdminRouter.get('/sertifikat', async (req, res) => {
  const jenis = req.query.jenis as string | undefined;
  const status = req.query.status as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.sertifikatDigital.findMany({
    where: {
      ...(jenis && { jenis: jenis as any }),
      ...(status && { status: status as any }),
      ...(q && {
        OR: [
          { nomorSertifikat: { contains: q } },
          { judul: { contains: q } },
          { mahasiswa: { is: { OR: [{ nim: { contains: q } }, { nama: { contains: q } }] } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ items });
});

/** Create sertifikat manual. */
sertifikatAdminRouter.post('/sertifikat', async (req, res) => {
  const body = createSchema.parse(req.body);
  const m = await prisma.mahasiswa.findUnique({ where: { id: body.mahasiswaId } });
  if (!m) throw BadRequest('Mahasiswa tidak ditemukan');

  const created = await issueSertifikat({
    mahasiswaId: body.mahasiswaId,
    jenis: body.jenis,
    judul: body.judul,
    deskripsi: body.deskripsi,
    periode: body.periode,
    ttdNama: body.ttdNama,
    ttdJabatan: body.ttdJabatan,
  });
  void writeAudit(req, { action: 'sertifikat.create', entity: 'sertifikat-digital', entityId: created.id });
  res.status(201).json(created);
});

const cabutSchema = z.object({
  alasan: z.string().min(5).max(500),
});

/** Cabut sertifikat. */
sertifikatAdminRouter.post('/sertifikat/:id/cabut', async (req, res) => {
  const akd = await getAkademikForUser(req.user!.sub);
  const exists = await prisma.sertifikatDigital.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikat tidak ditemukan');
  if (exists.status === 'dicabut') throw BadRequest('Sertifikat sudah dicabut sebelumnya');
  const body = cabutSchema.parse(req.body);

  const updated = await prisma.sertifikatDigital.update({
    where: { id: exists.id },
    data: {
      status: 'dicabut',
      alasanCabut: body.alasan,
      dicabutPada: new Date(),
      dicabutOleh: akd.id,
    },
  });
  void writeAudit(req, { action: 'sertifikat.cabut', entity: 'sertifikat-digital', entityId: exists.id, metadata: { alasan: body.alasan } });
  res.json(updated);
});

/** Aktifkan kembali sertifikat yang dicabut. */
sertifikatAdminRouter.post('/sertifikat/:id/aktifkan', async (req, res) => {
  const exists = await prisma.sertifikatDigital.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikat tidak ditemukan');
  if (exists.status === 'terbit') throw BadRequest('Sertifikat sudah berstatus terbit');
  const updated = await prisma.sertifikatDigital.update({
    where: { id: exists.id },
    data: { status: 'terbit', alasanCabut: null, dicabutPada: null, dicabutOleh: null },
  });
  void writeAudit(req, { action: 'sertifikat.aktifkan', entity: 'sertifikat-digital', entityId: exists.id });
  res.json(updated);
});

/** Regen token verifikasi (token lama langsung invalid karena unique). */
sertifikatAdminRouter.post('/sertifikat/:id/regen-token', async (req, res) => {
  const exists = await prisma.sertifikatDigital.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Sertifikat tidak ditemukan');
  const updated = await prisma.sertifikatDigital.update({
    where: { id: exists.id },
    data: { verifikasiToken: generateSertifikatToken() },
  });
  void writeAudit(req, { action: 'sertifikat.regen_token', entity: 'sertifikat-digital', entityId: exists.id });
  res.json({ verifikasiToken: updated.verifikasiToken });
});
