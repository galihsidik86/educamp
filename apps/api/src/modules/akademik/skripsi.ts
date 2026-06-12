import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const skripsiRouter = Router();

const STATUS = ['diajukan', 'disetujui', 'proposal', 'penelitian', 'sidang', 'lulus', 'ditolak', 'batal'] as const;

const patchSchema = z.object({
  pembimbing1Id: z.string().uuid().optional().nullable(),
  pembimbing2Id: z.string().uuid().optional().nullable(),
  status: z.enum(STATUS).optional(),
  catatan: z.string().max(1000).optional().nullable(),
  topik: z.string().max(150).optional().nullable(),
  tanggalSidang: z.string().optional().nullable(),
  nilaiHuruf: z.string().regex(/^(A|AB|B|BC|C|D|E)$/).optional().nullable(),
});

function dosenLabel(d: { gelarDepan: string | null; nama: string; gelarBelakang: string | null } | null): string | null {
  if (!d) return null;
  return [d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ');
}

skripsiRouter.get('/skripsi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const prodiId = req.query.prodiId as string | undefined;
  const q = (req.query.q as string | undefined)?.trim();

  const items = await prisma.skripsi.findMany({
    where: {
      ...(status && STATUS.includes(status as any) && { status: status as any }),
      ...(prodiId && { mahasiswa: { prodiId } }),
      ...(q && {
        OR: [
          { judul: { contains: q } },
          { mahasiswa: { nim: { contains: q } } },
          { mahasiswa: { nama: { contains: q } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      pembimbing1: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
      pembimbing2: { select: { id: true, nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
    },
    orderBy: { tanggalAjuan: 'desc' },
    take: 500,
  });

  res.json({
    items: items.map((s) => ({
      id: s.id,
      judul: s.judul,
      abstrak: s.abstrak,
      topik: s.topik,
      status: s.status,
      catatan: s.catatan,
      tanggalAjuan: s.tanggalAjuan,
      tanggalDisetujui: s.tanggalDisetujui,
      tanggalSidang: s.tanggalSidang,
      nilaiHuruf: s.nilaiHuruf,
      linkDokumen: s.linkDokumen,
      mahasiswa: s.mahasiswa,
      pembimbing1: s.pembimbing1
        ? { id: s.pembimbing1.id, nidn: s.pembimbing1.nidn, nama: dosenLabel(s.pembimbing1)! }
        : null,
      pembimbing2: s.pembimbing2
        ? { id: s.pembimbing2.id, nidn: s.pembimbing2.nidn, nama: dosenLabel(s.pembimbing2)! }
        : null,
    })),
  });
});

skripsiRouter.patch('/skripsi/:id', async (req, res) => {
  const body = patchSchema.parse(req.body);
  const existing = await prisma.skripsi.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Skripsi tidak ditemukan');

  for (const k of ['pembimbing1Id', 'pembimbing2Id'] as const) {
    if (body[k]) {
      const d = await prisma.dosen.findUnique({ where: { id: body[k]! } });
      if (!d) throw BadRequest(`Dosen ${k} tidak ditemukan`);
    }
  }
  if (body.pembimbing1Id && body.pembimbing2Id && body.pembimbing1Id === body.pembimbing2Id) {
    throw BadRequest('Pembimbing 1 dan 2 tidak boleh dosen yang sama');
  }

  const data: any = { ...body };
  if (body.tanggalSidang !== undefined) data.tanggalSidang = body.tanggalSidang ? new Date(body.tanggalSidang) : null;
  // Auto-set tanggalDisetujui ketika transisi pertama ke disetujui
  if (body.status === 'disetujui' && existing.status !== 'disetujui' && !existing.tanggalDisetujui) {
    data.tanggalDisetujui = new Date();
  }

  const updated = await prisma.skripsi.update({ where: { id: existing.id }, data });
  void writeAudit(req, {
    action: 'skripsi.update.akademik',
    entity: 'skripsi',
    entityId: updated.id,
    metadata: { fields: Object.keys(body) },
  });

  if (body.status && body.status !== existing.status) {
    void (async () => {
      const userId = await userIdFromMahasiswa(updated.mahasiswaId);
      if (!userId) return;
      const judul = body.status === 'disetujui' ? 'Pengajuan skripsi Anda disetujui'
        : body.status === 'ditolak' ? 'Pengajuan skripsi Anda ditolak'
        : body.status === 'lulus' ? 'Skripsi Anda dinyatakan LULUS'
        : `Status skripsi Anda: ${body.status}`;
      await createNotifikasi({
        userId,
        title: judul,
        body: `${updated.judul}${body.catatan ? `. Catatan: ${body.catatan}` : ''}`,
        type: 'skripsi',
        link: '/mahasiswa/skripsi',
        entity: 'skripsi',
        entityId: updated.id,
      });
    })();
  }

  res.json(updated);
});

skripsiRouter.delete('/skripsi/:id', async (req, res) => {
  const existing = await prisma.skripsi.findUnique({ where: { id: req.params.id } });
  if (!existing) throw NotFound('Skripsi tidak ditemukan');
  await prisma.skripsi.delete({ where: { id: existing.id } });
  void writeAudit(req, {
    action: 'skripsi.delete',
    entity: 'skripsi',
    entityId: existing.id,
  });
  res.status(204).end();
});
