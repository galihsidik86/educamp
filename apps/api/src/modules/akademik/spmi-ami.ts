import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, Conflict, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const spmiAmiRouter = Router();

const STATUS_AMI = ['perencanaan', 'pelaksanaan', 'selesai', 'ditangguhkan'] as const;
const KATEGORI_TEMUAN = ['ktsm', 'kts', 'observasi', 'saran'] as const;
const STATUS_CAPA = ['rencana', 'pelaksanaan', 'verifikasi', 'closed', 'ditolak'] as const;

const amiSchema = z.object({
  kode: z.string().min(3).max(40),
  nama: z.string().min(5).max(200),
  periode: z.string().min(3).max(50),
  tanggalMulai: z.string(),
  tanggalSelesai: z.string().optional().nullable(),
  status: z.enum(STATUS_AMI).optional(),
  ruangLingkup: z.string().max(5000).optional().nullable(),
  catatan: z.string().max(5000).optional().nullable(),
  // Pelaporan ke SPME (BAN-PT/LAM) — Permenristekdikti 39/2025
  dilaporkanKeSpme: z.boolean().optional(),
  dilaporkanKeSpmePada: z.string().optional().nullable(),
  dampakAkreditasi: z.string().max(5000).optional().nullable(),
});

spmiAmiRouter.get('/spmi/ami', async (req, res) => {
  const status = req.query.status as string | undefined;
  const periode = req.query.periode as string | undefined;
  const items = await prisma.auditMutuInternal.findMany({
    where: {
      ...(status && STATUS_AMI.includes(status as any) && { status: status as any }),
      ...(periode && { periode }),
    },
    include: {
      auditor: { include: { dosen: { select: { id: true, nidn: true, nama: true } } } },
      lingkup: { include: { prodi: { select: { id: true, kode: true, nama: true } } } },
      _count: { select: { temuan: true } },
    },
    orderBy: { tanggalMulai: 'desc' },
  });
  res.json({ items });
});

spmiAmiRouter.get('/spmi/ami/:id', async (req, res) => {
  const ami = await prisma.auditMutuInternal.findUnique({
    where: { id: req.params.id },
    include: {
      auditor: { include: { dosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } } } },
      lingkup: { include: { prodi: { select: { id: true, kode: true, nama: true } } } },
      temuan: {
        include: {
          standar: { select: { kode: true, nama: true } },
          capa: true,
        },
        orderBy: { kode: 'asc' },
      },
    },
  });
  if (!ami) throw NotFound('AMI tidak ditemukan');
  res.json(ami);
});

spmiAmiRouter.post('/spmi/ami', async (req, res) => {
  const body = amiSchema.parse(req.body);
  try {
    const created = await prisma.auditMutuInternal.create({
      data: {
        kode: body.kode,
        nama: body.nama,
        periode: body.periode,
        tanggalMulai: new Date(body.tanggalMulai),
        tanggalSelesai: body.tanggalSelesai ? new Date(body.tanggalSelesai) : null,
        status: body.status ?? 'perencanaan',
        ruangLingkup: body.ruangLingkup ?? null,
        catatan: body.catatan ?? null,
        dilaporkanKeSpme: body.dilaporkanKeSpme ?? false,
        dilaporkanKeSpmePada: body.dilaporkanKeSpmePada ? new Date(body.dilaporkanKeSpmePada) : null,
        dampakAkreditasi: body.dampakAkreditasi ?? null,
      },
    });
    void writeAudit(req, { action: 'spmi.ami.create', entity: 'ami', entityId: created.id });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode AMI sudah dipakai');
    throw e;
  }
});

spmiAmiRouter.patch('/spmi/ami/:id', async (req, res) => {
  const exists = await prisma.auditMutuInternal.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('AMI tidak ditemukan');
  const body = amiSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.tanggalMulai) data.tanggalMulai = new Date(body.tanggalMulai);
  if (body.tanggalSelesai !== undefined) data.tanggalSelesai = body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;
  if (body.dilaporkanKeSpmePada !== undefined) data.dilaporkanKeSpmePada = body.dilaporkanKeSpmePada ? new Date(body.dilaporkanKeSpmePada) : null;
  const updated = await prisma.auditMutuInternal.update({ where: { id: exists.id }, data });
  void writeAudit(req, { action: 'spmi.ami.update', entity: 'ami', entityId: exists.id, metadata: { fields: Object.keys(body) } });
  res.json(updated);
});

spmiAmiRouter.delete('/spmi/ami/:id', async (req, res) => {
  const exists = await prisma.auditMutuInternal.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('AMI tidak ditemukan');
  await prisma.auditMutuInternal.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'spmi.ami.delete', entity: 'ami', entityId: exists.id });
  res.status(204).end();
});

// -------- Auditor & Lingkup --------

const auditorSchema = z.object({
  dosenId: z.string().uuid(),
  peran: z.string().max(30).optional(),
});

spmiAmiRouter.post('/spmi/ami/:id/auditor', async (req, res) => {
  const ami = await prisma.auditMutuInternal.findUnique({ where: { id: req.params.id } });
  if (!ami) throw NotFound('AMI tidak ditemukan');
  const body = auditorSchema.parse(req.body);
  const d = await prisma.dosen.findUnique({ where: { id: body.dosenId } });
  if (!d) throw BadRequest('Dosen tidak ditemukan');
  try {
    const created = await prisma.auditorAmi.create({
      data: { amiId: ami.id, dosenId: body.dosenId, peran: body.peran ?? 'auditor' },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Dosen sudah ditambahkan sebagai auditor');
    throw e;
  }
});

spmiAmiRouter.delete('/spmi/ami/:id/auditor/:auditorId', async (req, res) => {
  const a = await prisma.auditorAmi.findUnique({ where: { id: req.params.auditorId } });
  if (!a || a.amiId !== req.params.id) throw NotFound('Auditor tidak ditemukan');
  await prisma.auditorAmi.delete({ where: { id: a.id } });
  res.status(204).end();
});

const lingkupSchema = z.object({ prodiId: z.string().uuid() });

spmiAmiRouter.post('/spmi/ami/:id/lingkup', async (req, res) => {
  const ami = await prisma.auditMutuInternal.findUnique({ where: { id: req.params.id } });
  if (!ami) throw NotFound('AMI tidak ditemukan');
  const body = lingkupSchema.parse(req.body);
  const p = await prisma.prodi.findUnique({ where: { id: body.prodiId } });
  if (!p) throw BadRequest('Prodi tidak ditemukan');
  try {
    const created = await prisma.lingkupAmi.create({
      data: { amiId: ami.id, prodiId: body.prodiId },
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Prodi sudah ada dalam lingkup AMI ini');
    throw e;
  }
});

spmiAmiRouter.delete('/spmi/ami/:id/lingkup/:lingkupId', async (req, res) => {
  const l = await prisma.lingkupAmi.findUnique({ where: { id: req.params.lingkupId } });
  if (!l || l.amiId !== req.params.id) throw NotFound('Lingkup tidak ditemukan');
  await prisma.lingkupAmi.delete({ where: { id: l.id } });
  res.status(204).end();
});

// -------- Temuan --------

const temuanSchema = z.object({
  kode: z.string().min(2).max(40),
  kategori: z.enum(KATEGORI_TEMUAN),
  standarId: z.string().uuid().optional().nullable(),
  deskripsi: z.string().min(5).max(5000),
  buktiUrl: z.string().max(2000).optional().nullable(),
  rekomendasi: z.string().max(5000).optional().nullable(),
});

spmiAmiRouter.post('/spmi/ami/:id/temuan', async (req, res) => {
  const ami = await prisma.auditMutuInternal.findUnique({ where: { id: req.params.id } });
  if (!ami) throw NotFound('AMI tidak ditemukan');
  const body = temuanSchema.parse(req.body);
  if (body.standarId) {
    const std = await prisma.standarMutu.findUnique({ where: { id: body.standarId } });
    if (!std) throw BadRequest('Standar tidak ditemukan');
  }
  try {
    const created = await prisma.temuanAmi.create({
      data: {
        amiId: ami.id,
        kode: body.kode,
        kategori: body.kategori,
        standarId: body.standarId ?? null,
        deskripsi: body.deskripsi,
        buktiUrl: body.buktiUrl ?? null,
        rekomendasi: body.rekomendasi ?? null,
      },
    });
    void writeAudit(req, { action: 'spmi.temuan.create', entity: 'temuan-ami', entityId: created.id, metadata: { amiId: ami.id } });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') throw Conflict('Kode temuan sudah dipakai di AMI ini');
    throw e;
  }
});

spmiAmiRouter.patch('/spmi/temuan/:temuanId', async (req, res) => {
  const t = await prisma.temuanAmi.findUnique({ where: { id: req.params.temuanId } });
  if (!t) throw NotFound('Temuan tidak ditemukan');
  const body = temuanSchema.partial().parse(req.body);
  const updated = await prisma.temuanAmi.update({ where: { id: t.id }, data: body as any });
  res.json(updated);
});

spmiAmiRouter.delete('/spmi/temuan/:temuanId', async (req, res) => {
  const t = await prisma.temuanAmi.findUnique({ where: { id: req.params.temuanId } });
  if (!t) throw NotFound('Temuan tidak ditemukan');
  await prisma.temuanAmi.delete({ where: { id: t.id } });
  res.status(204).end();
});

// -------- CAPA --------

const capaCreateSchema = z.object({
  akarMasalah: z.string().max(5000).optional().nullable(),
  rencanaTindakan: z.string().min(5).max(5000),
  picUserId: z.string().uuid().optional().nullable(),
  picDosenId: z.string().uuid().optional().nullable(),
  targetSelesai: z.string(),
});

spmiAmiRouter.post('/spmi/temuan/:temuanId/capa', async (req, res) => {
  const t = await prisma.temuanAmi.findUnique({ where: { id: req.params.temuanId }, include: { capa: true } });
  if (!t) throw NotFound('Temuan tidak ditemukan');
  if (t.capa) throw Conflict('CAPA sudah ada untuk temuan ini');
  const body = capaCreateSchema.parse(req.body);
  if (body.picUserId) {
    const u = await prisma.user.findUnique({ where: { id: body.picUserId } });
    if (!u) throw BadRequest('PIC user tidak ditemukan');
  }
  if (body.picDosenId) {
    const d = await prisma.dosen.findUnique({ where: { id: body.picDosenId } });
    if (!d) throw BadRequest('PIC dosen tidak ditemukan');
  }
  const created = await prisma.tindakLanjutCapa.create({
    data: {
      temuanId: t.id,
      akarMasalah: body.akarMasalah ?? null,
      rencanaTindakan: body.rencanaTindakan,
      picUserId: body.picUserId ?? null,
      picDosenId: body.picDosenId ?? null,
      targetSelesai: new Date(body.targetSelesai),
      status: 'rencana',
    },
  });
  void writeAudit(req, { action: 'spmi.capa.create', entity: 'capa', entityId: created.id, metadata: { temuanId: t.id } });
  res.status(201).json(created);
});

const capaUpdateSchema = z.object({
  akarMasalah: z.string().max(5000).optional().nullable(),
  rencanaTindakan: z.string().min(5).max(5000).optional(),
  picUserId: z.string().uuid().optional().nullable(),
  picDosenId: z.string().uuid().optional().nullable(),
  targetSelesai: z.string().optional(),
  realisasiTindakan: z.string().max(5000).optional().nullable(),
  bukti: z.string().max(2000).optional().nullable(),
  tanggalSelesai: z.string().optional().nullable(),
  status: z.enum(STATUS_CAPA).optional(),
});

spmiAmiRouter.patch('/spmi/capa/:capaId', async (req, res) => {
  const c = await prisma.tindakLanjutCapa.findUnique({ where: { id: req.params.capaId } });
  if (!c) throw NotFound('CAPA tidak ditemukan');
  const body = capaUpdateSchema.parse(req.body);
  const data: any = { ...body };
  if (body.targetSelesai) data.targetSelesai = new Date(body.targetSelesai);
  if (body.tanggalSelesai !== undefined) data.tanggalSelesai = body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;
  const updated = await prisma.tindakLanjutCapa.update({ where: { id: c.id }, data });
  void writeAudit(req, { action: 'spmi.capa.update', entity: 'capa', entityId: c.id, metadata: { fields: Object.keys(body) } });
  res.json(updated);
});

const verifSchema = z.object({
  setuju: z.boolean(),
  catatan: z.string().max(5000).optional().nullable(),
});

/** Verifikasi CAPA → closed (setuju=true) atau ditolak (setuju=false → balik ke pelaksanaan). */
spmiAmiRouter.post('/spmi/capa/:capaId/verifikasi', async (req, res) => {
  const c = await prisma.tindakLanjutCapa.findUnique({ where: { id: req.params.capaId } });
  if (!c) throw NotFound('CAPA tidak ditemukan');
  if (c.status !== 'verifikasi') throw BadRequest('CAPA belum siap diverifikasi');
  const body = verifSchema.parse(req.body);
  const updated = await prisma.tindakLanjutCapa.update({
    where: { id: c.id },
    data: {
      status: body.setuju ? 'closed' : 'pelaksanaan',
      verifikator: req.user!.sub,
      verifikasiPada: new Date(),
      catatanVerifikasi: body.catatan ?? null,
    },
  });
  void writeAudit(req, {
    action: 'spmi.capa.verifikasi',
    entity: 'capa',
    entityId: c.id,
    metadata: { setuju: body.setuju },
  });
  res.json(updated);
});

/** List CAPA dengan filter status/target — utk dashboard tindak lanjut. */
spmiAmiRouter.get('/spmi/capa', async (req, res) => {
  const status = req.query.status as string | undefined;
  const overdue = req.query.overdue as string | undefined;
  const items = await prisma.tindakLanjutCapa.findMany({
    where: {
      ...(status && STATUS_CAPA.includes(status as any) && { status: status as any }),
      ...(overdue === 'true' && { targetSelesai: { lt: new Date() }, status: { in: ['rencana', 'pelaksanaan'] } }),
    },
    include: {
      temuan: {
        include: {
          ami: { select: { id: true, kode: true, nama: true } },
          standar: { select: { kode: true, nama: true } },
        },
      },
      picUser: { select: { id: true, email: true, akademik: { select: { nama: true } } } },
      picDosen: { select: { id: true, nidn: true, nama: true } },
    },
    orderBy: { targetSelesai: 'asc' },
    take: 200,
  });
  res.json({ items });
});
