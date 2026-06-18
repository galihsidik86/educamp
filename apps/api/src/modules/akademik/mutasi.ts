import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getAkademikForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const mutasiRouter = Router();

const respondSchema = z.object({
  status: z.enum(['disetujui', 'ditolak']),
  catatanAkademik: z.string().max(2000).optional().nullable(),
});

/** Akademik: list mutasi dengan filter. */
mutasiRouter.get('/mutasi', async (req, res) => {
  const status = req.query.status as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const q = req.query.q as string | undefined;
  const items = await prisma.mutasiMahasiswa.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(jenis && { jenis: jenis as any }),
      ...(q && {
        OR: [
          { mahasiswa: { is: { nama: { contains: q } } } },
          { mahasiswa: { is: { nim: { contains: q } } } },
        ],
      }),
    },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, prodi: { select: { kode: true, nama: true } }, angkatan: true } },
      prodiAsal: { select: { kode: true, nama: true } },
      prodiTujuan: { select: { kode: true, nama: true } },
      semester: { include: { tahunAjaran: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ items });
});

/** Akademik buat mutasi atas nama mahasiswa (mis. DO administratif). */
const JENIS_M = ['cuti', 'aktif_kembali', 'pindah_prodi', 'drop_out', 'mengundurkan_diri'] as const;
const createSchema = z.object({
  mahasiswaId: z.string().uuid(),
  jenis: z.enum(JENIS_M),
  alasan: z.string().min(5).max(2000),
  prodiTujuanId: z.string().uuid().optional().nullable(),
  semesterId: z.string().uuid().optional().nullable(),
});

mutasiRouter.post('/mutasi', async (req, res) => {
  const body = createSchema.parse(req.body);
  const m = await prisma.mahasiswa.findUnique({ where: { id: body.mahasiswaId } });
  if (!m) throw BadRequest('Mahasiswa tidak ditemukan');
  // Mapping statusSesudah berdasarkan jenis
  const statusMap: Record<string, 'aktif' | 'cuti' | 'lulus' | 'drop_out' | 'mengundurkan_diri'> = {
    cuti: 'cuti',
    aktif_kembali: 'aktif',
    pindah_prodi: 'aktif',
    drop_out: 'drop_out',
    mengundurkan_diri: 'mengundurkan_diri',
  };
  const created = await prisma.mutasiMahasiswa.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      statusSebelum: m.status,
      statusSesudah: statusMap[body.jenis] ?? 'aktif',
      prodiAsalId: m.prodiId,
      prodiTujuanId: body.prodiTujuanId ?? null,
      semesterId: body.semesterId ?? null,
      alasan: body.alasan,
      status: 'diajukan',
    },
  });
  void writeAudit(req, { action: 'mutasi.create.akademik', entity: 'mutasi', entityId: created.id, metadata: { mahasiswaId: m.id, jenis: body.jenis } });
  res.status(201).json(created);
});

mutasiRouter.delete('/mutasi/:id', async (req, res) => {
  const exists = await prisma.mutasiMahasiswa.findUnique({ where: { id: req.params.id } });
  if (!exists) throw NotFound('Mutasi tidak ditemukan');
  if (exists.status === 'disetujui') throw BadRequest('Mutasi yang sudah disetujui tidak boleh dihapus (sudah mengubah status mahasiswa)');
  await prisma.mutasiMahasiswa.delete({ where: { id: exists.id } });
  void writeAudit(req, { action: 'mutasi.delete.akademik', entity: 'mutasi', entityId: exists.id });
  res.status(204).end();
});

/**
 * Akademik: approve/reject mutasi.
 * Saat approve, status mahasiswa di-update atomik (juga prodiId bila pindah).
 */
mutasiRouter.patch('/mutasi/:id/respond', async (req, res) => {
  const akd = await getAkademikForUser(req.user!.sub);
  const m = await prisma.mutasiMahasiswa.findUnique({
    where: { id: req.params.id },
    include: { mahasiswa: true },
  });
  if (!m) throw NotFound('Mutasi tidak ditemukan');
  if (m.status !== 'diajukan') throw BadRequest(`Status ${m.status} tidak dapat diproses`);

  const body = respondSchema.parse(req.body);
  const now = new Date();

  if (body.status === 'disetujui') {
    // Pastikan status mahasiswa masih sama dengan snapshot (cegah race condition)
    if (m.mahasiswa.status !== m.statusSebelum) {
      throw BadRequest(`Status mahasiswa berubah sejak diajukan (${m.statusSebelum} → ${m.mahasiswa.status}). Tolak dan minta ajukan ulang.`);
    }
    if (m.jenis === 'pindah_prodi' && (!m.prodiTujuanId || m.prodiTujuanId === m.mahasiswa.prodiId)) {
      throw BadRequest('Prodi tujuan tidak valid');
    }

    // Update atomik: mutasi + mahasiswa
    await prisma.$transaction([
      prisma.mahasiswa.update({
        where: { id: m.mahasiswaId },
        data: {
          status: m.statusSesudah,
          ...(m.jenis === 'pindah_prodi' && m.prodiTujuanId && { prodiId: m.prodiTujuanId }),
        },
      }),
      prisma.mutasiMahasiswa.update({
        where: { id: m.id },
        data: {
          status: 'disetujui',
          catatanAkademik: body.catatanAkademik ?? null,
          diprosesPada: now,
          diprosesOleh: akd.id,
        },
      }),
    ]);
  } else {
    await prisma.mutasiMahasiswa.update({
      where: { id: m.id },
      data: {
        status: 'ditolak',
        catatanAkademik: body.catatanAkademik ?? null,
        diprosesPada: now,
        diprosesOleh: akd.id,
      },
    });
  }

  void writeAudit(req, {
    action: `mutasi.${body.status}`,
    entity: 'mutasi',
    entityId: m.id,
    metadata: { jenis: m.jenis, statusSebelum: m.statusSebelum, statusSesudah: m.statusSesudah },
  });

  void (async () => {
    const userId = await userIdFromMahasiswa(m.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Pengajuan mutasi ${body.status === 'disetujui' ? 'disetujui' : 'ditolak'}`,
      body: body.catatanAkademik ?? undefined,
      type: 'mutasi',
      link: '/mahasiswa/mutasi',
      entity: 'mutasi',
      entityId: m.id,
    });
  })();

  const updated = await prisma.mutasiMahasiswa.findUnique({
    where: { id: m.id },
    include: {
      mahasiswa: { select: { id: true, nim: true, nama: true, status: true, prodi: { select: { kode: true, nama: true } } } },
      prodiAsal: { select: { kode: true, nama: true } },
      prodiTujuan: { select: { kode: true, nama: true } },
    },
  });
  res.json(updated);
});
