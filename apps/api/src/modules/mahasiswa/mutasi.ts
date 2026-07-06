import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi } from '../../lib/notifikasi.js';

export const mutasiRouter = Router();

const JENIS = ['cuti', 'aktif_kembali', 'pindah_prodi', 'mengundurkan_diri'] as const;

const createSchema = z.object({
  jenis: z.enum(JENIS),
  alasan: z.string().min(20).max(2000),
  prodiTujuanId: z.string().uuid().optional().nullable(),
  semesterId: z.string().uuid().optional().nullable(),
  fileUrl: optionalHttpUrl, // http/https saja — anti stored-XSS pada link bukti
});

/** Daftar prodi untuk dropdown pindah prodi. */
mutasiRouter.get('/mutasi/prodi', async (_req, res) => {
  const items = await prisma.prodi.findMany({
    select: { id: true, kode: true, nama: true, jenjang: true, fakultas: { select: { kode: true, nama: true } } },
    orderBy: { kode: 'asc' },
  });
  res.json({ items });
});

/** Mahasiswa: list mutasi miliknya sendiri. */
mutasiRouter.get('/mutasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const items = await prisma.mutasiMahasiswa.findMany({
    where: { mahasiswaId: m.id },
    include: {
      prodiAsal: { select: { kode: true, nama: true } },
      prodiTujuan: { select: { kode: true, nama: true } },
      semester: { include: { tahunAjaran: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

/** Map jenis → status target. */
function targetStatus(jenis: (typeof JENIS)[number]): 'aktif' | 'cuti' | 'mengundurkan_diri' {
  switch (jenis) {
    case 'cuti': return 'cuti';
    case 'aktif_kembali': return 'aktif';
    case 'pindah_prodi': return 'aktif';
    case 'mengundurkan_diri': return 'mengundurkan_diri';
  }
}

/** Pre-check: jenis valid untuk status saat ini. */
function preCheckJenis(jenis: (typeof JENIS)[number], statusSekarang: string) {
  if (statusSekarang === 'lulus' || statusSekarang === 'drop_out' || statusSekarang === 'mengundurkan_diri') {
    throw BadRequest(`Mahasiswa status ${statusSekarang} tidak dapat mengajukan mutasi`);
  }
  if (jenis === 'cuti' && statusSekarang !== 'aktif') {
    throw BadRequest('Cuti hanya dapat diajukan saat status aktif');
  }
  if (jenis === 'aktif_kembali' && statusSekarang !== 'cuti') {
    throw BadRequest('Aktif kembali hanya dari status cuti');
  }
  if (jenis === 'pindah_prodi' && statusSekarang !== 'aktif') {
    throw BadRequest('Pindah prodi hanya dapat diajukan saat status aktif');
  }
}

/** Mahasiswa: ajukan mutasi baru. */
mutasiRouter.post('/mutasi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = createSchema.parse(req.body);

  preCheckJenis(body.jenis, m.status);

  // Cek prodi tujuan untuk pindah
  if (body.jenis === 'pindah_prodi') {
    if (!body.prodiTujuanId) throw BadRequest('Prodi tujuan wajib diisi untuk pindah prodi');
    if (body.prodiTujuanId === m.prodiId) throw BadRequest('Prodi tujuan tidak boleh sama dengan prodi asal');
    const exists = await prisma.prodi.findUnique({ where: { id: body.prodiTujuanId } });
    if (!exists) throw BadRequest('Prodi tujuan tidak ditemukan');
  }

  // Cek satu pending per mahasiswa
  const pending = await prisma.mutasiMahasiswa.findFirst({
    where: { mahasiswaId: m.id, status: 'diajukan' },
  });
  if (pending) throw BadRequest('Anda masih punya pengajuan mutasi yang belum diproses');

  const created = await prisma.mutasiMahasiswa.create({
    data: {
      mahasiswaId: m.id,
      jenis: body.jenis,
      statusSebelum: m.status,
      statusSesudah: targetStatus(body.jenis),
      prodiAsalId: m.prodiId,
      prodiTujuanId: body.jenis === 'pindah_prodi' ? body.prodiTujuanId! : null,
      semesterId: body.semesterId ?? null,
      alasan: body.alasan,
      fileUrl: body.fileUrl ?? null,
    },
  });
  void writeAudit(req, { action: 'mutasi.request', entity: 'mutasi', entityId: created.id, metadata: { jenis: body.jenis } });

  // Notif ke semua akademik
  void (async () => {
    const akademikUsers = await prisma.user.findMany({ where: { role: 'akademik' }, select: { id: true } });
    for (const u of akademikUsers) {
      await createNotifikasi({
        userId: u.id,
        title: `Pengajuan mutasi: ${body.jenis.replace('_', ' ')}`,
        body: `Oleh ${m.nama} (${m.nim})`,
        type: 'mutasi',
        link: '/akademik/mutasi',
        entity: 'mutasi',
        entityId: created.id,
      });
    }
  })();

  res.status(201).json(created);
});

/** Mahasiswa: batalkan pengajuan (hanya jika masih diajukan). */
mutasiRouter.delete('/mutasi/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const x = await prisma.mutasiMahasiswa.findUnique({ where: { id: req.params.id } });
  if (!x) throw NotFound('Mutasi tidak ditemukan');
  if (x.mahasiswaId !== m.id) throw Forbidden('Bukan milik Anda');
  if (x.status !== 'diajukan') throw BadRequest(`Tidak dapat dibatalkan dari status ${x.status}`);
  await prisma.mutasiMahasiswa.update({ where: { id: x.id }, data: { status: 'batal' } });
  res.status(204).end();
});
