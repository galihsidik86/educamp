import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { dateString, httpUrl } from '../../lib/validators.js';

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
    // Hanya pembayaran disetujui yang dihitung untuk progress lunas
    const dibayar = t.pembayaran
      .filter((p) => p.status === 'disetujui')
      .reduce((s, p) => s + Number(p.jumlah), 0);
    const menunggu = t.pembayaran
      .filter((p) => p.status === 'menunggu')
      .reduce((s, p) => s + Number(p.jumlah), 0);
    return {
      id: t.id,
      jenis: t.jenis,
      deskripsi: t.deskripsi,
      jumlah: Number(t.jumlah),
      dibayar,
      menunggu,
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
        status: p.status,
        bankPengirim: p.bankPengirim,
        bankPenerima: p.bankPenerima,
        noReferensi: p.noReferensi,
        catatanValidasi: p.catatanValidasi,
        validasiPada: p.validasiPada,
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

const METODE = ['transfer_bank', 'va', 'tunai', 'qris', 'ewallet'] as const;

const uploadBuktiSchema = z.object({
  tagihanId: z.string().uuid(),
  jumlah: z.number().positive(),
  tanggalBayar: dateString,
  metode: z.enum(METODE),
  buktiUrl: httpUrl,
  bankPengirim: z.string().max(80).optional().nullable(),
  bankPenerima: z.string().max(80).optional().nullable(),
  noReferensi: z.string().max(80).optional().nullable(),
  catatan: z.string().max(500).optional().nullable(),
});

/**
 * Mahasiswa upload bukti pembayaran. Status awal = `menunggu` (perlu verifikasi akademik).
 * Tagihan status TIDAK auto-update; akademik yang akan recalc setelah verifikasi.
 */
keuanganRouter.post('/keuangan/upload-bukti', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = uploadBuktiSchema.parse(req.body);
  const tagihan = await prisma.tagihan.findUnique({
    where: { id: body.tagihanId },
    include: { pembayaran: true },
  });
  if (!tagihan) throw NotFound('Tagihan tidak ditemukan');
  if (tagihan.mahasiswaId !== m.id) throw BadRequest('Bukan tagihan Anda');
  if (tagihan.status === 'lunas') throw BadRequest('Tagihan sudah lunas');

  // Cegah upload melebihi (disetujui + menunggu) > total tagihan
  const sudah = tagihan.pembayaran
    .filter((p) => p.status !== 'ditolak')
    .reduce((s, p) => s + Number(p.jumlah), 0);
  const sisa = Number(tagihan.jumlah) - sudah;
  if (body.jumlah > sisa) {
    throw BadRequest(`Jumlah pembayaran melebihi sisa tagihan (Rp ${sisa.toLocaleString('id-ID')}). Cek pembayaran sebelumnya yang masih menunggu verifikasi.`);
  }

  const created = await prisma.pembayaran.create({
    data: {
      tagihanId: tagihan.id,
      mahasiswaId: m.id,
      jumlah: body.jumlah,
      tanggalBayar: new Date(body.tanggalBayar),
      metode: body.metode,
      buktiUrl: body.buktiUrl,
      bankPengirim: body.bankPengirim ?? null,
      bankPenerima: body.bankPenerima ?? null,
      noReferensi: body.noReferensi ?? null,
      catatan: body.catatan ?? null,
      status: 'menunggu',
    },
  });

  void writeAudit(req, {
    action: 'pembayaran.upload.mahasiswa',
    entity: 'pembayaran',
    entityId: created.id,
    metadata: { tagihanId: tagihan.id, jumlah: body.jumlah, metode: body.metode },
  });

  res.status(201).json(created);
});

/** Mahasiswa boleh batalkan/hapus pembayaran yang masih menunggu (salah upload). */
keuanganRouter.delete('/keuangan/pembayaran/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const p = await prisma.pembayaran.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound('Pembayaran tidak ditemukan');
  if (p.mahasiswaId !== m.id) throw BadRequest('Bukan pembayaran Anda');
  if (p.status !== 'menunggu') throw BadRequest('Hanya pembayaran yang masih menunggu yang bisa dihapus');
  await prisma.pembayaran.delete({ where: { id: p.id } });
  res.status(204).end();
});
