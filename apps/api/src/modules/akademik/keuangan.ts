import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getAkademikForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, createNotifikasiForMany, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const keuanganRouter = Router();

const JENIS = ['spp', 'pembangunan', 'praktikum', 'wisuda', 'ujian', 'lainnya'] as const;
const STATUS_TAGIHAN = ['belum_bayar', 'cicil', 'lunas', 'jatuh_tempo'] as const;
const METODE = ['transfer_bank', 'va', 'tunai', 'qris', 'ewallet'] as const;

// ============================================================
// Tagihan
// ============================================================

const tagihanSchema = z.object({
  mahasiswaId: z.string().uuid(),
  semesterId: z.string().uuid(),
  jenis: z.enum(JENIS),
  deskripsi: z.string().min(3).max(200),
  jumlah: z.number().positive(),
  jatuhTempo: z.string(),
  status: z.enum(STATUS_TAGIHAN).default('belum_bayar'),
});

const bulkSchema = z.object({
  semesterId: z.string().uuid(),
  jenis: z.enum(JENIS),
  deskripsi: z.string().min(3).max(200),
  jumlah: z.number().positive(),
  jatuhTempo: z.string(),
  prodiId: z.string().uuid().optional(),
  angkatan: z.number().int().optional(),
  statusMahasiswa: z.enum(['aktif', 'cuti', 'lulus']).default('aktif'),
});

keuanganRouter.get('/keuangan/tagihan', async (req, res) => {
  const status = req.query.status as string | undefined;
  const semesterId = req.query.semesterId as string | undefined;
  const search = (req.query.q as string | undefined)?.trim();

  const items = await prisma.tagihan.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(semesterId && { semesterId }),
      ...(search && { mahasiswa: { OR: [{ nim: { contains: search } }, { nama: { contains: search } }] } }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      semester: { include: { tahunAjaran: true } },
      pembayaran: { orderBy: { tanggalBayar: 'desc' } },
    },
    orderBy: [{ jatuhTempo: 'desc' }],
    take: 500,
  });
  res.json({
    items: items.map((t) => {
      const dibayar = t.pembayaran.reduce((s, p) => s + Number(p.jumlah), 0);
      return {
        id: t.id,
        mahasiswa: t.mahasiswa,
        semester: `${t.semester.jenis} ${t.semester.tahunAjaran.kode}`,
        jenis: t.jenis,
        deskripsi: t.deskripsi,
        jumlah: Number(t.jumlah),
        dibayar,
        sisa: Math.max(Number(t.jumlah) - dibayar, 0),
        jatuhTempo: t.jatuhTempo,
        status: t.status,
        jumlahPembayaran: t.pembayaran.length,
      };
    }),
  });
});

keuanganRouter.post('/keuangan/tagihan', async (req, res) => {
  const body = tagihanSchema.parse(req.body);
  const created = await prisma.tagihan.create({
    data: { ...body, jatuhTempo: new Date(body.jatuhTempo) },
  });
  void writeAudit(req, {
    action: 'tagihan.create',
    entity: 'tagihan',
    entityId: created.id,
    metadata: { mahasiswaId: body.mahasiswaId, jenis: body.jenis, jumlah: body.jumlah },
  });

  void (async () => {
    const userId = await userIdFromMahasiswa(body.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Tagihan baru: ${body.deskripsi}`,
      body: `Rp ${body.jumlah.toLocaleString('id-ID')} jatuh tempo ${new Date(body.jatuhTempo).toLocaleDateString('id-ID')}.`,
      type: 'tagihan',
      link: '/mahasiswa/keuangan',
      entity: 'tagihan',
      entityId: created.id,
    });
  })();

  res.status(201).json(created);
});

/** Bulk: buat satu tagihan dengan nominal sama untuk semua mahasiswa yang cocok filter. */
keuanganRouter.post('/keuangan/tagihan/bulk', async (req, res) => {
  const body = bulkSchema.parse(req.body);
  const mhs = await prisma.mahasiswa.findMany({
    where: {
      status: body.statusMahasiswa,
      ...(body.prodiId && { prodiId: body.prodiId }),
      ...(body.angkatan && { angkatan: body.angkatan }),
    },
    select: { id: true },
  });
  if (mhs.length === 0) throw BadRequest('Tidak ada mahasiswa yang cocok dengan filter');

  await prisma.tagihan.createMany({
    data: mhs.map((m) => ({
      mahasiswaId: m.id,
      semesterId: body.semesterId,
      jenis: body.jenis,
      deskripsi: body.deskripsi,
      jumlah: body.jumlah,
      jatuhTempo: new Date(body.jatuhTempo),
      status: 'belum_bayar' as const,
    })),
  });
  void writeAudit(req, {
    action: 'tagihan.bulk_create',
    entity: 'tagihan',
    metadata: { count: mhs.length, jenis: body.jenis, jumlah: body.jumlah, prodiId: body.prodiId, angkatan: body.angkatan },
  });

  // notif bulk ke semua mahasiswa target
  void (async () => {
    const users = await prisma.mahasiswa.findMany({
      where: { id: { in: mhs.map((m) => m.id) } },
      select: { userId: true },
    });
    await createNotifikasiForMany(users.map((u) => u.userId), {
      title: `Tagihan baru: ${body.deskripsi}`,
      body: `Rp ${body.jumlah.toLocaleString('id-ID')} jatuh tempo ${new Date(body.jatuhTempo).toLocaleDateString('id-ID')}.`,
      type: 'tagihan',
      link: '/mahasiswa/keuangan',
      entity: 'tagihan',
    });
  })();

  res.status(201).json({ ok: true, created: mhs.length });
});

keuanganRouter.patch('/keuangan/tagihan/:id', async (req, res) => {
  const body = tagihanSchema.partial().parse(req.body);
  const data: any = { ...body };
  if (body.jatuhTempo) data.jatuhTempo = new Date(body.jatuhTempo);
  res.json(await prisma.tagihan.update({ where: { id: req.params.id }, data }));
});

keuanganRouter.delete('/keuangan/tagihan/:id', async (req, res) => {
  const used = await prisma.pembayaran.count({ where: { tagihanId: req.params.id } });
  if (used > 0) throw BadRequest('Hapus pembayaran terkait terlebih dahulu');
  await prisma.tagihan.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ============================================================
// Pembayaran (verifikasi)
// ============================================================

const pembayaranSchema = z.object({
  tagihanId: z.string().uuid(),
  jumlah: z.number().positive(),
  tanggalBayar: z.string(),
  metode: z.enum(METODE),
  buktiUrl: z.string().url().optional(),
  catatan: z.string().max(500).optional(),
});

keuanganRouter.get('/keuangan/pembayaran', async (req, res) => {
  const search = (req.query.q as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const items = await prisma.pembayaran.findMany({
    where: {
      ...(search && {
        mahasiswa: { OR: [{ nim: { contains: search } }, { nama: { contains: search } }] },
      }),
      ...(status && { status: status as any }),
    },
    include: {
      mahasiswa: { select: { nim: true, nama: true } },
      tagihan: { select: { jenis: true, deskripsi: true } },
    },
    orderBy: [{ status: 'asc' }, { tanggalBayar: 'desc' }],
    take: 200,
  });
  res.json({
    items: items.map((p) => ({
      id: p.id,
      tanggalBayar: p.tanggalBayar,
      mahasiswa: p.mahasiswa,
      tagihan: p.tagihan,
      jumlah: Number(p.jumlah),
      metode: p.metode,
      buktiUrl: p.buktiUrl,
      catatan: p.catatan,
      status: p.status,
      bankPengirim: p.bankPengirim,
      bankPenerima: p.bankPenerima,
      noReferensi: p.noReferensi,
      divalidasiOleh: p.divalidasiOleh,
      validasiPada: p.validasiPada,
      catatanValidasi: p.catatanValidasi,
    })),
  });
});

const verifikasiSchema = z.object({
  action: z.enum(['setujui', 'tolak']),
  catatan: z.string().max(500).optional().nullable(),
});

/**
 * Akademik verifikasi bukti pembayaran. Jika setujui:
 * - status pembayaran → disetujui
 * - tagihan dihitung ulang (lunas/cicil/belum_bayar)
 * - notifikasi mahasiswa
 * Jika tolak: status → ditolak (tagihan tidak terpengaruh).
 */
keuanganRouter.post('/keuangan/pembayaran/:id/verifikasi', async (req, res) => {
  const a = await getAkademikForUser(req.user!.sub);
  const body = verifikasiSchema.parse(req.body);
  const p = await prisma.pembayaran.findUnique({
    where: { id: req.params.id },
    include: { tagihan: { include: { pembayaran: true } } },
  });
  if (!p) throw NotFound('Pembayaran tidak ditemukan');
  if (p.status !== 'menunggu') throw BadRequest(`Pembayaran sudah ${p.status}`);

  const updated = await prisma.pembayaran.update({
    where: { id: p.id },
    data: {
      status: body.action === 'setujui' ? 'disetujui' : 'ditolak',
      divalidasiOleh: a.nama,
      validasiPada: new Date(),
      catatanValidasi: body.catatan ?? null,
    },
  });

  // Hitung ulang status tagihan kalau setujui
  let statusTagihanBaru: 'lunas' | 'cicil' | 'belum_bayar' = p.tagihan.status as any;
  if (body.action === 'setujui') {
    const totalDisetujui = p.tagihan.pembayaran
      .filter((x) => x.status === 'disetujui' || x.id === p.id)
      .reduce((s, x) => s + Number(x.jumlah), 0);
    statusTagihanBaru =
      totalDisetujui >= Number(p.tagihan.jumlah) ? 'lunas'
      : totalDisetujui > 0 ? 'cicil'
      : 'belum_bayar';
    await prisma.tagihan.update({ where: { id: p.tagihanId }, data: { status: statusTagihanBaru } });
  }

  void writeAudit(req, {
    action: `pembayaran.${body.action}.akademik`,
    entity: 'pembayaran',
    entityId: p.id,
    metadata: { mahasiswaId: p.mahasiswaId, jumlah: Number(p.jumlah), statusTagihanBaru },
  });

  void (async () => {
    const userId = await userIdFromMahasiswa(p.mahasiswaId);
    if (!userId) return;
    const isApprove = body.action === 'setujui';
    await createNotifikasi({
      userId,
      title: isApprove
        ? (statusTagihanBaru === 'lunas' ? `Tagihan ${p.tagihan.deskripsi} LUNAS` : 'Pembayaran Anda diverifikasi')
        : 'Bukti pembayaran ditolak',
      body: isApprove
        ? `Rp ${Number(p.jumlah).toLocaleString('id-ID')} via ${p.metode.replace(/_/g, ' ')}. ${body.catatan ? 'Catatan: ' + body.catatan : ''}`
        : `Bukti ditolak${body.catatan ? '. Alasan: ' + body.catatan : ''}. Silakan upload ulang dengan bukti yang valid.`,
      type: 'keuangan',
      link: '/mahasiswa/keuangan',
      entity: 'pembayaran',
      entityId: p.id,
    });
  })();

  res.json(updated);
});

/**
 * Rekonsiliasi bank — list pembayaran disetujui dalam periode tanggal
 * untuk dicocokkan dengan mutasi bank. Tersedia dalam format JSON
 * (default) atau CSV (?format=csv).
 */
keuanganRouter.get('/keuangan/rekonsiliasi', async (req, res) => {
  const dari = (req.query.dari as string | undefined)?.trim();
  const sampai = (req.query.sampai as string | undefined)?.trim();
  const bankPenerima = (req.query.bankPenerima as string | undefined)?.trim();
  const metode = (req.query.metode as string | undefined)?.trim();
  if (!dari || !sampai) throw BadRequest('Parameter dari & sampai wajib (YYYY-MM-DD)');
  const tanggalAwal = new Date(dari);
  const tanggalAkhir = new Date(sampai);
  tanggalAkhir.setHours(23, 59, 59, 999);
  if (isNaN(tanggalAwal.getTime()) || isNaN(tanggalAkhir.getTime())) throw BadRequest('Format tanggal tidak valid');

  const items = await prisma.pembayaran.findMany({
    where: {
      status: 'disetujui',
      tanggalBayar: { gte: tanggalAwal, lte: tanggalAkhir },
      ...(bankPenerima && { bankPenerima: { contains: bankPenerima } }),
      ...(metode && { metode: metode as any }),
    },
    include: {
      mahasiswa: { select: { nim: true, nama: true, prodi: { select: { kode: true, nama: true } } } },
      tagihan: { select: { jenis: true, deskripsi: true, semester: { select: { kode: true } } } },
    },
    orderBy: { tanggalBayar: 'asc' },
  });

  const total = items.reduce((s, p) => s + Number(p.jumlah), 0);
  const perMetode = items.reduce<Record<string, { count: number; total: number }>>((acc, p) => {
    const k = p.metode;
    (acc[k] = acc[k] || { count: 0, total: 0 }).count++;
    acc[k]!.total += Number(p.jumlah);
    return acc;
  }, {});

  if (req.query.format === 'csv') {
    const lines: string[] = [];
    lines.push(['Tanggal Bayar', 'No Referensi', 'NIM', 'Nama Mahasiswa', 'Prodi', 'Jenis Tagihan', 'Semester', 'Metode', 'Bank Pengirim', 'Bank Penerima', 'Jumlah', 'Divalidasi Oleh'].join(','));
    for (const p of items) {
      lines.push([
        p.tanggalBayar.toISOString().slice(0, 10),
        p.noReferensi ?? '',
        p.mahasiswa.nim,
        `"${p.mahasiswa.nama.replace(/"/g, '""')}"`,
        p.mahasiswa.prodi.kode,
        p.tagihan.jenis,
        p.tagihan.semester?.kode ?? '',
        p.metode,
        p.bankPengirim ?? '',
        p.bankPenerima ?? '',
        Number(p.jumlah),
        `"${(p.divalidasiOleh ?? '').replace(/"/g, '""')}"`,
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rekonsiliasi-${dari}-sd-${sampai}.csv"`);
    return res.send(lines.join('\n'));
  }

  res.json({
    periode: { dari, sampai },
    ringkasan: {
      total,
      jumlahTransaksi: items.length,
      perMetode: Object.entries(perMetode).map(([m, v]) => ({ metode: m, count: v.count, total: v.total })),
    },
    items: items.map((p) => ({
      id: p.id,
      tanggalBayar: p.tanggalBayar,
      mahasiswa: p.mahasiswa,
      tagihan: p.tagihan,
      jumlah: Number(p.jumlah),
      metode: p.metode,
      bankPengirim: p.bankPengirim,
      bankPenerima: p.bankPenerima,
      noReferensi: p.noReferensi,
      buktiUrl: p.buktiUrl,
      divalidasiOleh: p.divalidasiOleh,
      validasiPada: p.validasiPada,
    })),
  });
});

/** Catat pembayaran manual. Setelah masuk, auto-update status tagihan berdasarkan total dibayar. */
keuanganRouter.post('/keuangan/pembayaran', async (req, res) => {
  const a = await getAkademikForUser(req.user!.sub);
  const body = pembayaranSchema.parse(req.body);
  const tagihan = await prisma.tagihan.findUnique({
    where: { id: body.tagihanId },
    include: { pembayaran: true },
  });
  if (!tagihan) throw NotFound('Tagihan tidak ditemukan');

  const sudah = tagihan.pembayaran.reduce((s, p) => s + Number(p.jumlah), 0);
  const sisa = Number(tagihan.jumlah) - sudah;
  if (body.jumlah > sisa) throw BadRequest(`Pembayaran melebihi sisa tagihan (${sisa.toLocaleString('id-ID')})`);

  const created = await prisma.pembayaran.create({
    data: {
      tagihanId: tagihan.id,
      mahasiswaId: tagihan.mahasiswaId,
      jumlah: body.jumlah,
      tanggalBayar: new Date(body.tanggalBayar),
      metode: body.metode,
      buktiUrl: body.buktiUrl,
      catatan: body.catatan,
      divalidasiOleh: a.nama,
    },
  });

  // update status tagihan
  const totalBaru = sudah + body.jumlah;
  const status =
    totalBaru >= Number(tagihan.jumlah) ? 'lunas'
    : totalBaru > 0 ? 'cicil'
    : 'belum_bayar';
  await prisma.tagihan.update({ where: { id: tagihan.id }, data: { status } });

  void writeAudit(req, {
    action: 'pembayaran.create',
    entity: 'pembayaran',
    entityId: created.id,
    metadata: {
      tagihanId: tagihan.id, mahasiswaId: tagihan.mahasiswaId,
      jumlah: body.jumlah, metode: body.metode, statusTagihanBaru: status,
    },
  });

  void (async () => {
    const userId = await userIdFromMahasiswa(tagihan.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: status === 'lunas' ? `Tagihan ${tagihan.deskripsi} LUNAS` : `Pembayaran tercatat: ${tagihan.deskripsi}`,
      body: `Rp ${body.jumlah.toLocaleString('id-ID')} via ${body.metode.replace(/_/g, ' ')}. ${status === 'lunas' ? 'Terima kasih.' : `Sisa: Rp ${(Number(tagihan.jumlah) - sudah - body.jumlah).toLocaleString('id-ID')}.`}`,
      type: 'pembayaran',
      link: '/mahasiswa/keuangan',
      entity: 'pembayaran',
      entityId: created.id,
      sendEmail: status === 'lunas',
    });
  })();

  res.status(201).json(created);
});

keuanganRouter.delete('/keuangan/pembayaran/:id', async (req, res) => {
  const p = await prisma.pembayaran.findUnique({ where: { id: req.params.id } });
  if (!p) throw NotFound();
  await prisma.pembayaran.delete({ where: { id: p.id } });

  // recompute tagihan status
  const sisaPembayaran = await prisma.pembayaran.findMany({ where: { tagihanId: p.tagihanId } });
  const tagihan = await prisma.tagihan.findUnique({ where: { id: p.tagihanId } });
  if (tagihan) {
    const total = sisaPembayaran.reduce((s, pm) => s + Number(pm.jumlah), 0);
    const status =
      total >= Number(tagihan.jumlah) ? 'lunas'
      : total > 0 ? 'cicil'
      : 'belum_bayar';
    await prisma.tagihan.update({ where: { id: tagihan.id }, data: { status } });
  }
  res.status(204).end();
});
