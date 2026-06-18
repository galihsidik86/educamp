import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const tiketRouter = Router();

/** List semua tiket dengan filter. */
tiketRouter.get('/tiket', async (req, res) => {
  const status = req.query.status as string | undefined;
  const kategori = req.query.kategori as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.tiket.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(kategori && { kategori: kategori as any }),
      ...(q && {
        OR: [
          { judul: { contains: q } },
          { mahasiswa: { is: { nama: { contains: q } } } },
          { mahasiswa: { is: { nim: { contains: q } } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ status: 'asc' }, { prioritas: 'desc' }, { updatedAt: 'desc' }],
  });
  res.json({ items });
});

/** Detail + thread. */
tiketRouter.get('/tiket/:id', async (req, res) => {
  const t = await prisma.tiket.findUnique({
    where: { id: req.params.id },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } }, angkatan: true } },
      replies: {
        include: { author: { select: { email: true, role: true, mahasiswa: { select: { nama: true } }, akademik: { select: { nama: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  res.json(t);
});

const patchSchema = z.object({
  status: z.enum(['terbuka', 'proses', 'menunggu_user', 'selesai', 'ditutup']).optional(),
  prioritas: z.enum(['rendah', 'normal', 'tinggi']).optional(),
});

/** Update status / prioritas tiket. */
tiketRouter.patch('/tiket/:id', async (req, res) => {
  const t = await prisma.tiket.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  const body = patchSchema.parse(req.body);
  const data: any = { ...body };
  if (body.status === 'selesai' || body.status === 'ditutup') {
    data.tanggalTutup = new Date();
  }
  const updated = await prisma.tiket.update({ where: { id: t.id }, data });
  void writeAudit(req, { action: 'tiket.update', entity: 'tiket', entityId: updated.id, metadata: { from: t.status, to: updated.status } });

  if (body.status && body.status !== t.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(t.mahasiswaId);
      if (!userId) return;
      await createNotifikasi({
        userId,
        title: `Tiket "${t.judul}" → ${body.status}`,
        type: 'tiket',
        link: '/mahasiswa/tiket',
        entity: 'tiket',
        entityId: t.id,
      });
    })();
  }

  res.json(updated);
});

const replySchema = z.object({ isi: z.string().min(1).max(5000) });

/** Reply akademik — bila status terbuka → otomatis proses. */
tiketRouter.post('/tiket/:id/reply', async (req, res) => {
  const t = await prisma.tiket.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  if (t.status === 'ditutup') throw BadRequest('Tiket sudah ditutup');
  const body = replySchema.parse(req.body);

  const reply = await prisma.tiketReply.create({
    data: { tiketId: t.id, authorId: req.user!.sub, authorRole: 'akademik', isi: body.isi },
  });

  // status auto-progression: terbuka → proses
  if (t.status === 'terbuka') {
    await prisma.tiket.update({ where: { id: t.id }, data: { status: 'proses' } });
  } else {
    await prisma.tiket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
  }

  void (async () => {
    const userId = await userIdFromMahasiswa(t.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Tanggapan baru pada tiket "${t.judul}"`,
      type: 'tiket',
      link: '/mahasiswa/tiket',
      entity: 'tiket',
      entityId: t.id,
    });
  })();

  res.status(201).json(reply);
});

tiketRouter.delete('/tiket/:id', async (req, res) => {
  const t = await prisma.tiket.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Tiket tidak ditemukan');
  await prisma.tiket.delete({ where: { id: t.id } });
  void writeAudit(req, { action: 'tiket.delete.akademik', entity: 'tiket', entityId: t.id });
  res.status(204).end();
});
