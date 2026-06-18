// ============================================================
// Helper SPMI — auto-measure pencapaian StandarMutu dari data
// internal SIAKAD (Yudisium, EDOM, Absensi, BKD, NilaiCpmk, dll).
// ============================================================

import crypto from 'node:crypto';
import { prisma } from '../db.js';
import type { SumberDataStandar, StatusPencapaian, StandarMutu } from '@prisma/client';

export type MeasureResult = {
  nilai: number | null;
  catatan?: string;
  sumberData?: Record<string, unknown>;
};

/** Hitung status pencapaian dari nilai vs target. */
export function evalStatus(
  nilai: number | null,
  targetMin: number | null,
  targetMax: number | null,
  ambangCukup: number | null,
): StatusPencapaian {
  if (nilai == null) return 'belum_diukur';
  // Kalau ada targetMax → semakin kecil semakin baik (mis. masa studi)
  if (targetMax != null) {
    if (nilai <= targetMax) return 'tercapai';
    if (ambangCukup != null && nilai <= ambangCukup) return 'cukup';
    return 'belum_tercapai';
  }
  if (targetMin != null) {
    if (nilai >= targetMin) return 'tercapai';
    if (ambangCukup != null && nilai >= ambangCukup) return 'cukup';
    return 'belum_tercapai';
  }
  return 'belum_diukur';
}

/**
 * Filter dataset by prodi (jika standar punya prodiId) atau institusi.
 * Mengembalikan where-clause yang bisa di-spread.
 */
function prodiWhere(prodiId: string | null | undefined) {
  return prodiId ? { prodiId } : {};
}

/** Hitung pengukuran berdasarkan sumberData. Return null kalau data kosong. */
export async function measureStandar(
  standar: Pick<StandarMutu, 'sumberData' | 'prodiId'>,
  periode: string,
): Promise<MeasureResult> {
  switch (standar.sumberData as SumberDataStandar) {
    case 'ipk_lulusan': {
      const lulus = await prisma.yudisium.findMany({
        where: {
          status: { in: ['layak', 'wisuda'] },
          ...(periode && { periodeWisuda: { kode: periode } }),
          mahasiswa: prodiWhere(standar.prodiId),
        },
        select: { ipk: true },
      });
      if (lulus.length === 0) return { nilai: null, catatan: 'Belum ada data lulusan pada periode ini' };
      const avg = lulus.reduce((s, y) => s + y.ipk, 0) / lulus.length;
      return {
        nilai: round2(avg),
        sumberData: { jumlahLulusan: lulus.length, periode },
      };
    }

    case 'masa_studi': {
      const lulus = await prisma.yudisium.findMany({
        where: {
          status: { in: ['layak', 'wisuda'] },
          tanggalLulus: { not: null },
          ...(periode && { periodeWisuda: { kode: periode } }),
          mahasiswa: prodiWhere(standar.prodiId),
        },
        include: { mahasiswa: { select: { angkatan: true } } },
      });
      if (lulus.length === 0) return { nilai: null, catatan: 'Belum ada data lulusan' };
      const masa = lulus
        .map((y) => {
          const tahunLulus = y.tanggalLulus!.getFullYear();
          return tahunLulus - y.mahasiswa.angkatan;
        })
        .filter((m) => m > 0);
      if (masa.length === 0) return { nilai: null, catatan: 'Data tahun masuk tidak valid' };
      const avg = masa.reduce((s, m) => s + m, 0) / masa.length;
      return { nilai: round2(avg), sumberData: { sampleSize: masa.length } };
    }

    case 'tingkat_kelulusan': {
      const totalMhs = await prisma.mahasiswa.count({
        where: { ...prodiWhere(standar.prodiId) },
      });
      const lulus = await prisma.mahasiswa.count({
        where: { ...prodiWhere(standar.prodiId), status: 'lulus' },
      });
      if (totalMhs === 0) return { nilai: null, catatan: 'Tidak ada data mahasiswa' };
      return {
        nilai: round2((lulus / totalMhs) * 100),
        sumberData: { totalMhs, lulus },
      };
    }

    case 'edom_dosen': {
      // Rata-rata nilai EDOM (likert 1-5) → konversi ke skala 100
      const where: any = {};
      if (standar.prodiId) where.response = { kelas: { mataKuliah: { prodiId: standar.prodiId } } };
      const jawaban = await prisma.edomJawaban.findMany({
        where,
        select: { nilai: true },
        take: 10000,
      });
      if (jawaban.length === 0) return { nilai: null, catatan: 'Belum ada response EDOM' };
      const avg = jawaban.reduce((s, j) => s + j.nilai, 0) / jawaban.length;
      return {
        nilai: round2((avg / 5) * 100),
        sumberData: { jumlahJawaban: jawaban.length, skalaRata: round2(avg) },
      };
    }

    case 'kehadiran_dosen': {
      // Persentase pertemuan terlaksana (memiliki absensi tercatat) atas total terjadwal sampai hari ini
      const now = new Date();
      const where: any = { tanggal: { lte: now } };
      if (standar.prodiId) where.kelas = { mataKuliah: { prodiId: standar.prodiId } };
      const total = await prisma.pertemuan.count({ where });
      if (total === 0) return { nilai: null, catatan: 'Tidak ada data pertemuan terjadwal' };
      const dilaksanakan = await prisma.pertemuan.count({
        where: { ...where, absensi: { some: {} } },
      });
      return {
        nilai: round2((dilaksanakan / total) * 100),
        sumberData: { totalPertemuan: total, dilaksanakan },
      };
    }

    case 'kehadiran_mahasiswa': {
      const where: any = {};
      if (standar.prodiId) where.mahasiswa = { prodiId: standar.prodiId };
      const total = await prisma.absensi.count({ where });
      if (total === 0) return { nilai: null, catatan: 'Tidak ada data absensi' };
      const hadir = await prisma.absensi.count({
        where: { ...where, status: { in: ['hadir', 'izin', 'sakit'] } },
      });
      return {
        nilai: round2((hadir / total) * 100),
        sumberData: { totalAbsensi: total, hadir },
      };
    }

    case 'rasio_dosen_mhs': {
      const totalDosen = await prisma.dosen.count({
        where: { ...prodiWhere(standar.prodiId) },
      });
      const totalMhs = await prisma.mahasiswa.count({
        where: { ...prodiWhere(standar.prodiId), status: 'aktif' },
      });
      if (totalDosen === 0) return { nilai: null, catatan: 'Tidak ada data dosen' };
      return {
        nilai: round2(totalMhs / totalDosen),
        sumberData: { totalDosen, totalMhs },
      };
    }

    case 'bkd_compliance': {
      const where: any = {};
      if (standar.prodiId) where.dosen = { prodiId: standar.prodiId };
      const totalDosen = await prisma.dosen.count({
        where: { ...(standar.prodiId ? prodiWhere(standar.prodiId) : {}) },
      });
      if (totalDosen === 0) return { nilai: null, catatan: 'Tidak ada data dosen' };
      const verified = await prisma.bkdLaporan.count({
        where: { ...where, status: 'disetujui' },
      });
      return {
        nilai: round2((verified / totalDosen) * 100),
        sumberData: { totalDosen, laporanVerified: verified },
      };
    }

    case 'capaian_cpl': {
      const where: any = {};
      if (standar.prodiId) where.cpmk = { mataKuliah: { prodiId: standar.prodiId } };
      const nilai = await prisma.nilaiCpmk.findMany({
        where,
        select: { nilai: true },
        take: 50000,
      });
      if (nilai.length === 0) return { nilai: null, catatan: 'Belum ada nilai CPMK tercatat' };
      const avg = nilai.reduce((s, n) => s + n.nilai, 0) / nilai.length;
      return { nilai: round2(avg), sumberData: { sampleSize: nilai.length } };
    }

    case 'manual':
    default:
      return { nilai: null, catatan: 'Standar bersifat manual — input nilai melalui form pengukuran' };
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Generate token publik 16 char base64url. */
export function generateSurveiToken(): string {
  return crypto.randomBytes(12).toString('base64url');
}
