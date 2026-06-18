import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getDosenForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const konsultasiRouter = Router();

/** List konsultasi yang ditujukan ke dosen (sebagai DPA). */
konsultasiRouter.get('/konsultasi', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const status = req.query.status as string | undefined;
  const items = await prisma.konsultasiDpa.findMany({
    where: {
      dpaId: d.id,
      ...(status && { status: status as any }),
    },
    include: {
      mahasiswa: {
        select: { id: true, nim: true, nama: true, angkatan: true, prodi: { select: { kode: true, nama: true } } },
      },
    },
    orderBy: [{ status: 'asc' }, { waktuMulai: 'desc' }],
  });
  res.json({ items });
});

const respondSchema = z.object({
  status: z.enum(['diterima', 'ditolak']),
  catatanDpa: z.string().max(1000).optional().nullable(),
  waktuMulai: z.string().min(1).optional(),
});

/** Terima / tolak permintaan konsultasi. Saat diterima, DPA boleh reschedule waktuMulai. */
konsultasiRouter.patch('/konsultasi/:id/respond', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.konsultasiDpa.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Konsultasi tidak ditemukan');
  if (k.dpaId !== d.id) throw Forbidden('Anda bukan DPA yang dituju');
  if (k.status !== 'diajukan') throw BadRequest(`Hanya status diajukan yang dapat direspons (sekarang: ${k.status})`);

  const body = respondSchema.parse(req.body);
  const data: any = { status: body.status, catatanDpa: body.catatanDpa ?? null };
  if (body.status === 'diterima' && body.waktuMulai) {
    const wm = new Date(body.waktuMulai);
    if (Number.isNaN(wm.getTime())) throw BadRequest('Waktu mulai tidak valid');
    data.waktuMulai = wm;
  }
  const updated = await prisma.konsultasiDpa.update({ where: { id: k.id }, data });
  void writeAudit(req, { action: `konsultasi.${body.status}`, entity: 'konsultasi', entityId: updated.id });

  void (async () => {
    const userId = await userIdFromMahasiswa(k.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Konsultasi DPA ${body.status === 'diterima' ? 'diterima' : 'ditolak'}`,
      body: body.catatanDpa ?? undefined,
      type: 'konsultasi',
      link: '/mahasiswa/konsultasi',
      entity: 'konsultasi',
      entityId: updated.id,
    });
  })();

  res.json(updated);
});

const completeSchema = z.object({
  catatanDpa: z.string().min(1).max(5000),
});

/** Tutup sesi konsultasi dengan catatan hasil. Hanya dari status diterima. */
konsultasiRouter.patch('/konsultasi/:id/selesai', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.konsultasiDpa.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Konsultasi tidak ditemukan');
  if (k.dpaId !== d.id) throw Forbidden('Anda bukan DPA yang dituju');
  if (k.status !== 'diterima') throw BadRequest('Hanya konsultasi yang sudah diterima yang dapat ditutup');

  const body = completeSchema.parse(req.body);
  const updated = await prisma.konsultasiDpa.update({
    where: { id: k.id },
    data: { status: 'selesai', catatanDpa: body.catatanDpa, tanggalSelesai: new Date() },
  });
  void writeAudit(req, { action: 'konsultasi.selesai', entity: 'konsultasi', entityId: updated.id });

  void (async () => {
    const userId = await userIdFromMahasiswa(k.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: 'Sesi konsultasi telah selesai',
      body: 'DPA telah mencatat hasil konsultasi. Buka untuk melihat catatan.',
      type: 'konsultasi',
      link: '/mahasiswa/konsultasi',
      entity: 'konsultasi',
      entityId: updated.id,
    });
  })();

  res.json(updated);
});
