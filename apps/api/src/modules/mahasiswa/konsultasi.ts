import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromDosen } from '../../lib/notifikasi.js';

export const konsultasiRouter = Router();

const createSchema = z.object({
  topik: z.string().min(3).max(150),
  agenda: z.string().max(2000).optional().nullable(),
  waktuMulai: z.string().min(1),
  durasiMenit: z.number().int().min(15).max(180).optional(),
});

/** List konsultasi yang dibuat mahasiswa ini. */
konsultasiRouter.get('/konsultasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const status = req.query.status as string | undefined;
  const items = await prisma.konsultasiDpa.findMany({
    where: {
      mahasiswaId: m.id,
      ...(status && { status: status as any }),
    },
    include: {
      dpa: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
    },
    orderBy: { waktuMulai: 'desc' },
  });
  res.json({ items });
});

/** Request slot konsultasi ke DPA milik mahasiswa. */
konsultasiRouter.post('/konsultasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  if (!m.dpaId) throw BadRequest('Anda belum memiliki DPA. Hubungi BAAK.');
  const body = createSchema.parse(req.body);
  const waktuMulai = new Date(body.waktuMulai);
  if (Number.isNaN(waktuMulai.getTime())) throw BadRequest('Waktu mulai tidak valid');
  if (waktuMulai.getTime() < Date.now()) throw BadRequest('Waktu konsultasi harus di masa depan');

  // Tolak duplikasi aktif di slot sama untuk mahasiswa ini
  const dup = await prisma.konsultasiDpa.findFirst({
    where: {
      mahasiswaId: m.id,
      waktuMulai,
      status: { in: ['diajukan', 'diterima'] },
    },
  });
  if (dup) throw BadRequest('Anda sudah punya pengajuan konsultasi di waktu yang sama');

  const created = await prisma.konsultasiDpa.create({
    data: {
      mahasiswaId: m.id,
      dpaId: m.dpaId,
      topik: body.topik,
      agenda: body.agenda ?? null,
      waktuMulai,
      durasiMenit: body.durasiMenit ?? 30,
    },
  });
  void writeAudit(req, { action: 'konsultasi.request', entity: 'konsultasi', entityId: created.id });

  // Notif ke DPA
  void (async () => {
    const userId = await userIdFromDosen(m.dpaId!);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Permintaan konsultasi baru dari ${m.nama}`,
      body: `Topik: ${body.topik}. Buka menu Konsultasi untuk merespons.`,
      type: 'konsultasi',
      link: '/dosen/konsultasi',
      entity: 'konsultasi',
      entityId: created.id,
    });
  })();

  res.status(201).json(created);
});

/** Mahasiswa batalkan permintaan (hanya status diajukan/diterima → batal). */
konsultasiRouter.delete('/konsultasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const k = await prisma.konsultasiDpa.findUnique({ where: { id: req.params.id } });
  if (!k) throw NotFound('Konsultasi tidak ditemukan');
  if (k.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (k.status !== 'diajukan' && k.status !== 'diterima') {
    throw Forbidden(`Tidak dapat dibatalkan dari status ${k.status}`);
  }
  await prisma.konsultasiDpa.update({ where: { id: k.id }, data: { status: 'batal' } });
  res.status(204).end();
});
