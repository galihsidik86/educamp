import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';
import { issueSertifikat } from '../../lib/sertifikat.js';

export const kknRouter = Router();

const STATUS = ['pendaftaran', 'ditugaskan', 'berjalan', 'selesai'] as const;

const patchSchema = z.object({
  lokasi: z.string().min(2).max(120).optional(),
  desa: z.string().max(80).optional().nullable(),
  kecamatan: z.string().max(80).optional().nullable(),
  kabupaten: z.string().max(80).optional().nullable(),
  dplDosenId: z.string().uuid().optional().nullable(),
  tanggalMulai: z.string().optional().nullable(),
  tanggalSelesai: z.string().optional().nullable(),
  nilai: z.string().max(3).optional().nullable(),
  status: z.enum(STATUS).optional(),
});

/** List semua KKN, optional filter periode & status. */
kknRouter.get('/kkn', async (req, res) => {
  const periode = req.query.periode as string | undefined;
  const status = req.query.status as string | undefined;

  const items = await prisma.kkn.findMany({
    where: {
      ...(periode && { periode }),
      ...(status && STATUS.includes(status as (typeof STATUS)[number]) && { status: status as (typeof STATUS)[number] }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      dplDosen: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
    },
    orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });

  // Periode unik untuk dropdown filter
  const periodeList = await prisma.kkn.findMany({
    select: { periode: true },
    distinct: ['periode'],
    orderBy: { periode: 'desc' },
  });

  res.json({
    items: items.map((k) => ({
      id: k.id,
      periode: k.periode,
      lokasi: k.lokasi,
      desa: k.desa, kecamatan: k.kecamatan, kabupaten: k.kabupaten,
      status: k.status,
      tanggalMulai: k.tanggalMulai, tanggalSelesai: k.tanggalSelesai,
      nilai: k.nilai,
      mahasiswa: k.mahasiswa,
      dpl: k.dplDosen
        ? {
            id: k.dplDosen.id,
            nidn: k.dplDosen.nidn,
            nama: [k.dplDosen.gelarDepan, k.dplDosen.nama, k.dplDosen.gelarBelakang].filter(Boolean).join(' '),
          }
        : null,
    })),
    periodeList: periodeList.map((p) => p.periode),
  });
});

kknRouter.patch('/kkn/:id', async (req, res) => {
  const body = patchSchema.parse(req.body);
  const existing = await prisma.kkn.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('KKN tidak ditemukan');

  if (body.dplDosenId) {
    const d = await prisma.dosen.findUnique({ where: { id: body.dplDosenId } });
    if (!d) throw BadRequest('Dosen DPL tidak ditemukan');
  }

  const data: any = { ...body };
  if (body.tanggalMulai !== undefined) data.tanggalMulai = body.tanggalMulai ? new Date(body.tanggalMulai) : null;
  if (body.tanggalSelesai !== undefined) data.tanggalSelesai = body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;

  const updated = await prisma.kkn.update({ where: { id: existing.id }, data });
  void writeAudit(req, {
    action: 'kkn.update.akademik',
    entity: 'kkn',
    entityId: updated.id,
    metadata: { fields: Object.keys(body) },
  });

  // Notif ke mahasiswa untuk transisi status atau assignment DPL
  if (body.status && body.status !== existing.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(updated.mahasiswaId);
      if (!userId) return;
      const judul = body.status === 'ditugaskan' ? 'KKN Anda telah ditugaskan'
        : body.status === 'berjalan' ? 'KKN Anda dimulai'
        : body.status === 'selesai' ? 'KKN Anda telah selesai'
        : 'Status KKN Anda diperbarui';
      await createNotifikasi({
        userId,
        title: judul,
        body: `Periode ${updated.periode} · ${updated.lokasi}`,
        type: 'kkn',
        link: '/mahasiswa/kkn',
        entity: 'kkn',
        entityId: updated.id,
      });
    })();
  }

  // Auto-issue sertifikat saat transisi ke 'selesai'
  if (body.status === 'selesai' && existing.status !== 'selesai') {
    void (async () => {
      await issueSertifikat({
        mahasiswaId: updated.mahasiswaId,
        jenis: 'kkn',
        judul: `Sertifikat KKN ${updated.periode}`,
        deskripsi: `Telah menyelesaikan Kuliah Kerja Nyata di ${updated.lokasi}${updated.nilai ? ` dengan nilai ${updated.nilai}` : ''}.`,
        periode: updated.periode,
        sumberEntity: 'kkn',
        sumberId: updated.id,
      }).catch((e) => console.error('[sertifikat] gagal auto-issue KKN:', e));
    })();
  }

  res.json(updated);
});

kknRouter.delete('/kkn/:id', async (req, res) => {
  const existing = await prisma.kkn.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('KKN tidak ditemukan');
  await prisma.kkn.delete({ where: { id: existing.id } });
  void writeAudit(req, {
    action: 'kkn.delete',
    entity: 'kkn',
    entityId: existing.id,
    metadata: { periode: existing.periode },
  });
  res.status(204).end();
});
