import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { angkaToHuruf, hurufToBobot } from '../../lib/grade.js';
import { writeAudit } from '../../lib/audit.js';
import { createNotifikasi, userIdFromMahasiswa } from '../../lib/notifikasi.js';

export const kelasRouter = Router();

/**
 * List kelas dosen — default semester aktif, bisa override via ?semesterId.
 */
kelasRouter.get('/kelas', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;

  const kelas = await prisma.kelas.findMany({
    where: { dosenId: d.id, semesterId },
    include: {
      mataKuliah: true,
      ruangan: true,
      semester: { include: { tahunAjaran: true } },
      _count: { select: { krs: { where: { status: { in: ['diajukan', 'disetujui'] } } } } },
    },
    orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
  });

  res.json({
    kelas: kelas.map((k) => ({
      id: k.id,
      kodeMK: k.mataKuliah.kode,
      namaMK: k.mataKuliah.nama,
      sks: k.mataKuliah.sks,
      kodeKelas: k.kodeKelas,
      hari: k.hari,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai,
      ruangan: k.ruangan?.kode ?? null,
      pesertaCount: k._count.krs,
      semester: `${k.semester.jenis} ${k.semester.tahunAjaran.kode}`,
    })),
  });
});

/**
 * Detail kelas + peserta + nilai (untuk input nilai).
 * Hanya boleh diakses oleh dosen pengampu.
 */
kelasRouter.get('/kelas/:id', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const k = await prisma.kelas.findUnique({
    where: { id: req.params.id },
    include: {
      mataKuliah: true,
      ruangan: true,
      semester: { include: { tahunAjaran: true } },
      krs: {
        where: { status: { in: ['diajukan', 'disetujui'] } },
        include: {
          mahasiswa: { select: { id: true, nim: true, nama: true, angkatan: true } },
          nilai: true,
        },
        orderBy: { mahasiswa: { nim: 'asc' } },
      },
    },
  });
  if (!k) throw NotFound('Kelas tidak ditemukan');
  if (k.dosenId !== d.id) throw Forbidden('Anda bukan pengampu kelas ini');

  res.json({
    kelas: {
      id: k.id,
      kodeMK: k.mataKuliah.kode,
      namaMK: k.mataKuliah.nama,
      sks: k.mataKuliah.sks,
      kodeKelas: k.kodeKelas,
      hari: k.hari,
      jamMulai: k.jamMulai,
      jamSelesai: k.jamSelesai,
      ruangan: k.ruangan?.kode ?? null,
      semester: { kode: k.semester.kode, nama: `${k.semester.jenis} ${k.semester.tahunAjaran.kode}` },
      periodeNilai: {
        mulai: k.semester.nilaiMulai,
        selesai: k.semester.nilaiSelesai,
      },
    },
    peserta: k.krs.map((r) => ({
      krsId: r.id,
      statusKrs: r.status,
      mahasiswa: r.mahasiswa,
      nilai: r.nilai
        ? {
            tugas: r.nilai.tugas,
            uts: r.nilai.uts,
            uas: r.nilai.uas,
            praktikum: r.nilai.praktikum,
            kehadiran: r.nilai.kehadiran,
            nilaiAngka: r.nilai.nilaiAngka,
            nilaiHuruf: r.nilai.nilaiHuruf,
            bobot: r.nilai.bobot,
            status: r.nilai.status,
          }
        : null,
    })),
  });
});

const nilaiUpsertSchema = z.object({
  tugas: z.number().min(0).max(100).nullable().optional(),
  uts: z.number().min(0).max(100).nullable().optional(),
  uas: z.number().min(0).max(100).nullable().optional(),
  praktikum: z.number().min(0).max(100).nullable().optional(),
  kehadiran: z.number().min(0).max(100).nullable().optional(),
  nilaiAngka: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(['belum', 'draft', 'finalized']).optional(),
});

/**
 * Upsert nilai untuk krsId tertentu.
 * Otorisasi: dosen pengampu kelas dari KRS tsb.
 * Side-effect: hitung huruf+bobot dari nilaiAngka jika diisi.
 */
kelasRouter.patch('/nilai/:krsId', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const body = nilaiUpsertSchema.parse(req.body);

  const krs = await prisma.krs.findUnique({
    where: { id: req.params.krsId },
    include: { kelas: true },
  });
  if (!krs) throw NotFound('KRS tidak ditemukan');
  if (krs.kelas.dosenId !== d.id) throw Forbidden('Anda bukan pengampu kelas ini');

  // Hitung huruf+bobot kalau angka diset
  let nilaiHuruf: string | null | undefined;
  let bobot: number | null | undefined;
  if (body.nilaiAngka !== undefined) {
    if (body.nilaiAngka === null) {
      nilaiHuruf = null;
      bobot = null;
    } else {
      const h = angkaToHuruf(body.nilaiAngka);
      nilaiHuruf = h;
      bobot = hurufToBobot(h);
    }
  }

  if (body.status === 'finalized' && body.nilaiAngka == null) {
    // cek apakah sudah ada angka di DB
    const existing = await prisma.nilai.findUnique({ where: { krsId: krs.id } });
    if (!existing?.nilaiAngka) {
      throw BadRequest('Nilai angka wajib diisi sebelum finalisasi');
    }
  }

  const before = await prisma.nilai.findUnique({ where: { krsId: krs.id } });
  const nilai = await prisma.nilai.upsert({
    where: { krsId: krs.id },
    create: {
      krsId: krs.id,
      mahasiswaId: krs.mahasiswaId,
      tugas: body.tugas ?? null,
      uts: body.uts ?? null,
      uas: body.uas ?? null,
      praktikum: body.praktikum ?? null,
      kehadiran: body.kehadiran ?? null,
      nilaiAngka: body.nilaiAngka ?? null,
      nilaiHuruf: nilaiHuruf ?? null,
      bobot: bobot ?? null,
      status: body.status ?? 'draft',
    },
    update: {
      ...(body.tugas !== undefined && { tugas: body.tugas }),
      ...(body.uts !== undefined && { uts: body.uts }),
      ...(body.uas !== undefined && { uas: body.uas }),
      ...(body.praktikum !== undefined && { praktikum: body.praktikum }),
      ...(body.kehadiran !== undefined && { kehadiran: body.kehadiran }),
      ...(body.nilaiAngka !== undefined && { nilaiAngka: body.nilaiAngka }),
      ...(nilaiHuruf !== undefined && { nilaiHuruf }),
      ...(bobot !== undefined && { bobot }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  const isFinalize = body.status === 'finalized' && before?.status !== 'finalized';
  void writeAudit(req, {
    action: isFinalize ? 'nilai.finalize' : 'nilai.update',
    entity: 'krs',
    entityId: krs.id,
    metadata: {
      kelasId: krs.kelasId,
      mahasiswaId: krs.mahasiswaId,
      before: before ? { nilaiAngka: before.nilaiAngka, nilaiHuruf: before.nilaiHuruf, status: before.status } : null,
      after: { nilaiAngka: nilai.nilaiAngka, nilaiHuruf: nilai.nilaiHuruf, status: nilai.status },
    },
  });

  // notif hanya saat finalize (transisi)
  if (isFinalize) {
    void (async () => {
      const userId = await userIdFromMahasiswa(krs.mahasiswaId);
      if (!userId) return;
      const kelasInfo = await prisma.kelas.findUnique({
        where: { id: krs.kelasId },
        include: { mataKuliah: true },
      });
      await createNotifikasi({
        userId,
        title: `Nilai ${kelasInfo?.mataKuliah.kode ?? 'MK'} telah dirilis`,
        body: `Nilai akhir ${kelasInfo?.mataKuliah.nama ?? ''}: ${nilai.nilaiHuruf ?? '-'} (${nilai.nilaiAngka ?? '-'}). Lihat detail di Nilai & Transkrip.`,
        type: 'nilai',
        link: '/mahasiswa/nilai',
        entity: 'nilai',
        entityId: nilai.id,
      });
    })();
  }

  res.json(nilai);
});
