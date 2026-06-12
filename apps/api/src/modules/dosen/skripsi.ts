import { Router } from 'express';
import { prisma } from '../../db.js';
import { getDosenForUser } from '../../lib/context.js';

export const skripsiRouter = Router();

function dosenLabel(d: { gelarDepan: string | null; nama: string; gelarBelakang: string | null } | null): string | null {
  if (!d) return null;
  return [d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ');
}

/**
 * Daftar mahasiswa yang dibimbing dosen ini (pembimbing 1 atau pembimbing 2),
 * status aktif (bukan ditolak/batal/lulus).
 */
skripsiRouter.get('/skripsi', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const items = await prisma.skripsi.findMany({
    where: {
      OR: [{ pembimbing1Id: d.id }, { pembimbing2Id: d.id }],
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      pembimbing1: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
      pembimbing2: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
    },
    orderBy: [{ status: 'asc' }, { tanggalAjuan: 'desc' }],
  });

  res.json({
    items: items.map((s) => ({
      id: s.id,
      judul: s.judul,
      topik: s.topik,
      status: s.status,
      catatan: s.catatan,
      tanggalAjuan: s.tanggalAjuan,
      tanggalDisetujui: s.tanggalDisetujui,
      tanggalSidang: s.tanggalSidang,
      nilaiHuruf: s.nilaiHuruf,
      linkDokumen: s.linkDokumen,
      peran: s.pembimbing1Id === d.id ? 'pembimbing1' : 'pembimbing2',
      pembimbing1: dosenLabel(s.pembimbing1),
      pembimbing2: dosenLabel(s.pembimbing2),
      mahasiswa: s.mahasiswa,
    })),
  });
});
