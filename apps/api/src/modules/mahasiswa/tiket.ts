import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi } from '../../lib/notifikasi.js';

export const tiketRouter = Router();

const KATEGORI = ['krs', 'keuangan', 'akun', 'nilai', 'layanan', 'lain'] as const;

const createSchema = z.object({
  kategori: z.enum(KATEGORI),
  judul: z.string().min(5).max(200),
  deskripsi: z.string().min(10).max(5000),
});

/** List tiket milik mahasiswa ini. */
tiketRouter.get('/tiket', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const status = req.query.status as string | undefined;
  const items = await prisma.tiket.findMany({
    where: { mahasiswaId: m.id, ...(status && { status: status as any }) },
    include: { _count: { select: { replies: true } } },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  res.json({ items });
});

/** Buat tiket baru → notif ke semua akademik (broadcast). */
tiketRouter.post('/tiket', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = createSchema.parse(req.body);
  const created = await prisma.tiket.create({
    data: {
      mahasiswaId: m.id,
      kategori: body.kategori,
      judul: body.judul,
      deskripsi: body.deskripsi,
    },
  });
  void writeAudit(req, { action: 'tiket.create', entity: 'tiket', entityId: created.id, metadata: { kategori: body.kategori } });

  void (async () => {
    const akademikUsers = await prisma.user.findMany({ where: { role: 'akademik' }, select: { id: true } });
    for (const u of akademikUsers) {
      await createNotifikasi({
        userId: u.id,
        title: `Tiket baru: ${body.judul}`,
        body: `Dari ${m.nama} (${m.nim}) · Kategori: ${body.kategori}`,
        type: 'tiket',
        link: '/akademik/tiket',
        entity: 'tiket',
        entityId: created.id,
      });
    }
  })();

  res.status(201).json(created);
});

/** Detail tiket + thread reply. */
tiketRouter.get('/tiket/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const t = await prisma.tiket.findUnique({
    where: { id: req.params.id },
    include: {
      replies: {
        include: { author: { select: { email: true, mahasiswa: { select: { nama: true } }, akademik: { select: { nama: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  if (t.mahasiswaId !== m.id) throw Forbidden('Bukan tiket Anda');
  res.json(t);
});

const replySchema = z.object({ isi: z.string().min(1).max(5000) });

/** Tambah reply mahasiswa — bila status = menunggu_user → kembalikan ke proses. */
tiketRouter.post('/tiket/:id/reply', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const t = await prisma.tiket.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  if (t.mahasiswaId !== m.id) throw Forbidden('Bukan tiket Anda');
  if (t.status === 'selesai' || t.status === 'ditutup') throw BadRequest('Tiket sudah ditutup');

  const body = replySchema.parse(req.body);
  const reply = await prisma.tiketReply.create({
    data: { tiketId: t.id, authorId: req.user!.sub, authorRole: 'mahasiswa', isi: body.isi },
  });

  // status auto: menunggu_user → proses
  if (t.status === 'menunggu_user') {
    await prisma.tiket.update({ where: { id: t.id }, data: { status: 'proses' } });
  } else {
    await prisma.tiket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
  }

  res.status(201).json(reply);
});

/** Mahasiswa tutup tiket (resolved acknowledged). */
tiketRouter.post('/tiket/:id/close', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const t = await prisma.tiket.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  if (t.mahasiswaId !== m.id) throw Forbidden('Bukan tiket Anda');
  if (t.status === 'ditutup') return res.json(t);
  const updated = await prisma.tiket.update({ where: { id: t.id }, data: { status: 'ditutup', tanggalTutup: new Date() } });
  res.json(updated);
});
