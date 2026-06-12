import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const suratRouter = Router();

const STATUS = ['diajukan', 'disetujui', 'ditolak', 'selesai', 'batal'] as const;
const JENIS = ['aktif_kuliah', 'keterangan_mahasiswa', 'pengantar_beasiswa', 'pengantar_penelitian', 'pengantar_magang', 'pengganti_ktm', 'lainnya'] as const;

const patchSchema = z.object({
  status: z.enum(STATUS).optional(),
  catatan: z.string().max(1000).optional().nullable(),
  nomorSurat: z.string().max(50).optional().nullable(),
});

suratRouter.get('/surat', async (req, res) => {
  const status = req.query.status as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const q = (req.query.q as string | undefined)?.trim();

  const items = await prisma.surat.findMany({
    where: {
      ...(status && STATUS.includes(status as any) && { status: status as any }),
      ...(jenis && JENIS.includes(jenis as any) && { jenis: jenis as any }),
      ...(q && {
        OR: [
          { judul: { contains: q } },
          { keperluan: { contains: q } },
          { mahasiswa: { nim: { contains: q } } },
          { mahasiswa: { nama: { contains: q } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, angkatan: true, prodi: { select: { kode: true, nama: true } } } },
    },
    orderBy: { tanggalDiajukan: 'desc' },
    take: 500,
  });
  res.json({ items });
});

suratRouter.patch('/surat/:id', async (req, res) => {
  const body = patchSchema.parse(req.body);
  const existing = await prisma.surat.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Surat tidak ditemukan');

  if (body.status === 'selesai' && !body.nomorSurat && !existing.nomorSurat) {
    throw BadRequest('Nomor surat wajib diisi sebelum status "selesai"');
  }

  const data: any = { ...body };
  if (body.status === 'disetujui' && existing.status !== 'disetujui' && !existing.tanggalDisetujui) {
    data.tanggalDisetujui = new Date();
  }
  if (body.status === 'selesai' && existing.status !== 'selesai' && !existing.tanggalSelesai) {
    data.tanggalSelesai = new Date();
  }

  const updated = await prisma.surat.update({ where: { id: existing.id }, data });
  void writeAudit(req, {
    action: 'surat.update.akademik',
    entity: 'surat',
    entityId: updated.id,
    metadata: { fields: Object.keys(body) },
  });

  if (body.status && body.status !== existing.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(updated.mahasiswaId);
      if (!userId) return;
      const judul = body.status === 'disetujui' ? 'Permohonan surat Anda disetujui'
        : body.status === 'ditolak' ? 'Permohonan surat Anda ditolak'
        : body.status === 'selesai' ? 'Surat Anda sudah dapat dicetak'
        : 'Status permohonan surat Anda diperbarui';
      await createNotifikasi({
        userId,
        title: judul,
        body: `${updated.judul}${body.catatan ? `. Catatan: ${body.catatan}` : ''}`,
        type: 'surat',
        link: '/mahasiswa/surat',
        entity: 'surat',
        entityId: updated.id,
      });
    })();
  }

  res.json(updated);
});
