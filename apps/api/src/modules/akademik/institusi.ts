import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { writeAudit } from '../../lib/audit.js';

export const institusiAdminRouter = Router();

const SINGLETON = 'singleton';

const updateSchema = z.object({
  nama: z.string().min(2).max(200),
  namaPendek: z.string().max(80).optional().nullable(),
  tagline: z.string().max(120).optional().nullable(),
  akreditasiPT: z.string().max(40).optional().nullable(),
  akreditasiSk: z.string().max(120).optional().nullable(),
  alamat: z.string().max(500).optional().nullable(),
  kota: z.string().max(80).optional().nullable(),
  kodePos: z.string().max(20).optional().nullable(),
  telepon: z.string().max(40).optional().nullable(),
  email: z.string().email().max(120).optional().nullable().or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  logoUrl: z.string().max(2000).optional().nullable(),
  logoInverseUrl: z.string().max(2000).optional().nullable(),
  rektorNama: z.string().max(120).optional().nullable(),
  rektorNip: z.string().max(40).optional().nullable(),
  rektorJabatan: z.string().max(120).optional().nullable(),
  bagianAkademikNama: z.string().max(120).optional().nullable(),
  kepalaBaakNama: z.string().max(120).optional().nullable(),
  kopSurat: z.string().max(2000).optional().nullable(),
});

institusiAdminRouter.get('/institusi', async (_req, res) => {
  const cfg = await prisma.institusiConfig.findUnique({ where: { id: SINGLETON } });
  res.json(cfg ?? { id: SINGLETON, nama: 'STMIK Tazkia' });
});

institusiAdminRouter.patch('/institusi', async (req, res) => {
  const body = updateSchema.parse(req.body);
  // Normalisasi: kosongkan email empty string menjadi null
  const data: Record<string, unknown> = { ...body };
  if (data.email === '') data.email = null;
  const cfg = await prisma.institusiConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...(data as any) },
    update: data as any,
  });
  void writeAudit(req, {
    action: 'institusi.update',
    entity: 'institusi-config',
    entityId: SINGLETON,
    metadata: { fields: Object.keys(body) },
  });
  res.json(cfg);
});

/**
 * Versi publik (no auth) — dipakai halaman verifikasi ijazah, verifikasi sertifikat,
 * dan survei publik untuk menampilkan kop institusi yang konsisten.
 */
export const institusiPublicRouter = Router();

institusiPublicRouter.get('/institusi', async (_req, res) => {
  const cfg = await prisma.institusiConfig.findUnique({ where: { id: SINGLETON } });
  if (!cfg) {
    return res.json({
      nama: 'STMIK Tazkia',
      namaPendek: null,
      tagline: null,
      logoUrl: null,
    });
  }
  // Hanya expose field publik (jangan kasih NIP rektor / kepala BAAK dst)
  res.json({
    nama: cfg.nama,
    namaPendek: cfg.namaPendek,
    tagline: cfg.tagline,
    akreditasiPT: cfg.akreditasiPT,
    alamat: cfg.alamat,
    kota: cfg.kota,
    telepon: cfg.telepon,
    email: cfg.email,
    website: cfg.website,
    logoUrl: cfg.logoUrl,
    logoInverseUrl: cfg.logoInverseUrl,
  });
});
