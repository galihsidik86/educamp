import { Router } from 'express';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';

export const keuanganRouter = Router();

keuanganRouter.get('/keuangan', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const tagihan = await prisma.tagihan.findMany({
    where: { mahasiswaId: m.id },
    include: {
      semester: { include: { tahunAjaran: true } },
      pembayaran: { orderBy: { tanggalBayar: 'desc' } },
    },
    orderBy: [{ jatuhTempo: 'desc' }],
  });

  const items = tagihan.map((t) => {
    const dibayar = t.pembayaran.reduce((s, p) => s + Number(p.jumlah), 0);
    return {
      id: t.id,
      jenis: t.jenis,
      deskripsi: t.deskripsi,
      jumlah: Number(t.jumlah),
      dibayar,
      sisa: Math.max(Number(t.jumlah) - dibayar, 0),
      jatuhTempo: t.jatuhTempo,
      status: t.status,
      semester: `${t.semester.jenis} ${t.semester.tahunAjaran.kode}`,
      pembayaran: t.pembayaran.map((p) => ({
        id: p.id,
        tanggalBayar: p.tanggalBayar,
        jumlah: Number(p.jumlah),
        metode: p.metode,
        buktiUrl: p.buktiUrl,
        catatan: p.catatan,
      })),
    };
  });

  const totalTagihan = items.reduce((s, i) => s + i.jumlah, 0);
  const totalDibayar = items.reduce((s, i) => s + i.dibayar, 0);
  const totalSisa = items.reduce((s, i) => s + i.sisa, 0);

  res.json({
    ringkasan: { totalTagihan, totalDibayar, totalSisa, jumlahTagihan: items.length },
    items,
  });
});
