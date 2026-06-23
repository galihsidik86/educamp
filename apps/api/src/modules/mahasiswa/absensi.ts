import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { notifyWaliPresensi } from '../../lib/notif-presensi.js';

export const absensiRouter = Router();

/**
 * Rekap absensi mahasiswa per kelas pada semester aktif (atau ?semesterId).
 * Per kelas: jumlah pertemuan, jumlah hadir/izin/sakit/alpa, persentase kehadiran,
 * dan detail per-pertemuan.
 */
absensiRouter.get('/absensi', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semesterId = (req.query.semesterId as string | undefined) ?? (await getActiveSemester()).id;

  // Kelas yang mahasiswa ambil di semester ini (status disetujui)
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId, status: 'disetujui' },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          pertemuan: {
            orderBy: { pertemuanKe: 'asc' },
            include: {
              absensi: { where: { mahasiswaId: m.id }, select: { status: true, catatan: true } },
            },
          },
        },
      },
    },
  });

  const items = krs.map((k) => {
    const totalPertemuan = k.kelas.pertemuan.length;
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    let totalDinilai = 0;
    const detail: Array<{
      pertemuanKe: number;
      tanggal: string;
      topik: string | null;
      status: string | null;
      catatan: string | null;
      tanggalAsli: string | null;
      alasanReschedule: string | null;
    }> = [];
    for (const p of k.kelas.pertemuan) {
      const a = p.absensi[0];
      const status = a?.status ?? null;
      if (status) {
        c[status]++;
        totalDinilai++;
      }
      detail.push({
        pertemuanKe: p.pertemuanKe,
        tanggal: p.tanggal.toISOString(),
        topik: p.topik,
        status,
        catatan: a?.catatan ?? null,
        tanggalAsli: p.tanggalAsli ? p.tanggalAsli.toISOString() : null,
        alasanReschedule: p.alasanReschedule,
      });
    }
    const persentaseHadir = totalDinilai > 0 ? Math.round((c.hadir / totalDinilai) * 100) : null;
    return {
      kelasId: k.kelas.id,
      kodeMK: k.kelas.mataKuliah.kode,
      namaMK: k.kelas.mataKuliah.nama,
      sks: k.kelas.mataKuliah.sks,
      kodeKelas: k.kelas.kodeKelas,
      dosen: [k.kelas.dosen.gelarDepan, k.kelas.dosen.nama, k.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      totalPertemuan,
      totalDinilai,
      ringkasan: c,
      persentaseHadir,
      detail,
    };
  });

  res.json({ items });
});

const submitPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN harus 6 digit angka'),
});

/**
 * Mahasiswa submit PIN untuk self check-in.
 * - Cari pertemuan dengan PIN aktif (belum expired)
 * - Validasi mahasiswa adalah peserta KRS disetujui di kelas-nya
 * - Cegah double submit (sudah hadir/izin/sakit/alpa di pertemuan tsb)
 * - Catat IP + UA untuk audit anti-titip absen
 */
absensiRouter.post('/absensi/pin', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const { pin } = submitPinSchema.parse(req.body);
  const now = new Date();

  const pertemuan = await prisma.pertemuan.findFirst({
    where: { pinKehadiran: pin, pinExpiresAt: { gt: now } },
    include: { kelas: { include: { mataKuliah: { select: { kode: true, nama: true } } } } },
  });
  if (!pertemuan) throw BadRequest('PIN tidak valid atau sudah kedaluwarsa');

  // Validasi peserta
  const krs = await prisma.krs.findFirst({
    where: { mahasiswaId: m.id, kelasId: pertemuan.kelasId, status: 'disetujui' },
  });
  if (!krs) throw BadRequest('Anda bukan peserta kelas pertemuan ini');

  // Cek apakah sudah ada absensi
  const existing = await prisma.absensi.findUnique({
    where: { pertemuanId_mahasiswaId: { pertemuanId: pertemuan.id, mahasiswaId: m.id } },
  });
  if (existing && existing.status === 'hadir') {
    throw BadRequest('Anda sudah tercatat hadir untuk pertemuan ini');
  }

  const data = {
    status: 'hadir' as const,
    inputViaPin: true,
    inputPada: now,
    inputIp: req.ip?.slice(0, 64),
    inputUserAgent: req.headers['user-agent']?.slice(0, 255),
  };

  const absensi = await prisma.absensi.upsert({
    where: { pertemuanId_mahasiswaId: { pertemuanId: pertemuan.id, mahasiswaId: m.id } },
    create: { pertemuanId: pertemuan.id, mahasiswaId: m.id, ...data },
    update: data,
  });

  void writeAudit(req, {
    action: 'absensi.pin.submit',
    entity: 'absensi',
    entityId: absensi.id,
    metadata: { pertemuanId: pertemuan.id, kelasId: pertemuan.kelasId, ip: data.inputIp },
  });
  void notifyWaliPresensi(pertemuan.id, [{ mahasiswaId: m.id, status: 'hadir' }]);

  res.json({
    ok: true,
    pertemuan: {
      pertemuanKe: pertemuan.pertemuanKe,
      tanggal: pertemuan.tanggal,
      topik: pertemuan.topik,
    },
    kelas: {
      kodeMK: pertemuan.kelas.mataKuliah.kode,
      namaMK: pertemuan.kelas.mataKuliah.nama,
      kodeKelas: pertemuan.kelas.kodeKelas,
    },
    inputPada: data.inputPada,
  });
});

// Use NotFound import (avoid unused) — helper might extend later
void NotFound;
