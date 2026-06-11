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
  const items = await prisma.pembayaran.findMany({
    where: {
      ...(search && {
        mahasiswa: { OR: [{ nim: { contains: search } }, { nama: { contains: search } }] },
      }),
    },
    include: {
      mahasiswa: { select: { nim: true, nama: true } },
      tagihan: { select: { jenis: true, deskripsi: true } },
    },
    orderBy: { tanggalBayar: 'desc' },
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
      divalidasiOleh: p.divalidasiOleh,
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
