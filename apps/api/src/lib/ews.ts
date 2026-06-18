// ============================================================
// EWS (Early Warning System) — hitung risiko DO per mahasiswa.
// Indikator: IPK, progres SKS, absensi, tunggakan, heregistrasi.
// Skor 0-100; semakin tinggi = semakin beresiko.
// ============================================================

import { prisma } from '../db.js';
import { calculateIp } from './grade.js';

export type EwsIndikator = {
  jenis: 'ipk' | 'sks_progres' | 'absensi' | 'tunggakan' | 'heregistrasi' | 'nilai_buruk';
  severity: 'tinggi' | 'sedang' | 'rendah';
  judul: string;
  detail: string;
  nilai: number | string;
  threshold: number | string;
  poin: number; // kontribusi ke skor risiko
};

export type EwsMahasiswaResult = {
  mahasiswaId: string;
  nim: string;
  nama: string;
  angkatan: number;
  status: string;
  prodi: { kode: string; nama: string };
  dpa: { id: string; nama: string } | null;
  semesterBerjalan: number;
  ipk: number;
  totalSks: number;
  skorRisiko: number;
  tingkat: 'tinggi' | 'sedang' | 'rendah' | 'aman';
  indikator: EwsIndikator[];
};

const SKS_EXPECTED_PER_SEM = 18; // ekspektasi standar
const ABSENSI_MIN = 0.75; // 75% wajib hadir

/** Klasifikasi tingkat dari skor. */
function tingkatFromSkor(s: number): EwsMahasiswaResult['tingkat'] {
  if (s >= 60) return 'tinggi';
  if (s >= 30) return 'sedang';
  if (s >= 10) return 'rendah';
  return 'aman';
}

/** Hitung EWS untuk satu mahasiswa. */
export async function hitungEwsMahasiswa(mahasiswaId: string): Promise<EwsMahasiswaResult | null> {
  const m = await prisma.mahasiswa.findUnique({
    where: { id: mahasiswaId },
    include: {
      prodi: { select: { kode: true, nama: true } },
      dpa: { select: { id: true, nama: true } },
    },
  });
  if (!m) return null;

  // Filter mahasiswa lulus / DO / undur diri — tidak relevan
  if (m.status === 'lulus' || m.status === 'drop_out' || m.status === 'mengundurkan_diri') return null;

  const semAktif = await prisma.semester.findFirst({ where: { isAktif: true } });
  if (!semAktif) return null;

  // Semester berjalan = (tahun_aktif - angkatan) * 2 + (1 atau 2)
  const tahunSekarang = new Date().getFullYear();
  const semesterBerjalan = Math.max(1, (tahunSekarang - m.angkatan) * 2 + (semAktif.jenis === 'ganjil' ? 1 : 2));

  // Ambil semua nilai final mahasiswa
  const nilaiAll = await prisma.nilai.findMany({
    where: { mahasiswaId: m.id, status: 'finalized' },
    include: { krs: { include: { kelas: { include: { mataKuliah: { select: { sks: true } } } } } } },
  });
  const items = nilaiAll.map((n) => ({ sks: n.krs.kelas.mataKuliah.sks, bobot: n.bobot ?? null }));
  const { ip: ipk, totalSks } = calculateIp(items);
  const expectedSks = SKS_EXPECTED_PER_SEM * (semesterBerjalan - 1); // periode lalu (tidak hitung semester berjalan)

  const indikator: EwsIndikator[] = [];
  let skor = 0;

  // 1. IPK
  if (totalSks > 0) {
    if (ipk < 2.0) {
      indikator.push({ jenis: 'ipk', severity: 'tinggi', judul: 'IPK kritikal', detail: `IPK ${ipk.toFixed(2)} di bawah 2.00`, nilai: ipk, threshold: 2.0, poin: 35 });
      skor += 35;
    } else if (ipk < 2.5) {
      indikator.push({ jenis: 'ipk', severity: 'sedang', judul: 'IPK rendah', detail: `IPK ${ipk.toFixed(2)} di bawah 2.50`, nilai: ipk, threshold: 2.5, poin: 15 });
      skor += 15;
    }
  }

  // 2. Nilai buruk (D/E di nilai final)
  const buruk = nilaiAll.filter((n) => n.nilaiHuruf === 'D' || n.nilaiHuruf === 'E').length;
  if (buruk > 0) {
    const sev = buruk >= 3 ? 'tinggi' : buruk >= 1 ? 'sedang' : 'rendah';
    const poin = buruk >= 3 ? 20 : buruk >= 1 ? 10 : 0;
    indikator.push({ jenis: 'nilai_buruk', severity: sev, judul: 'Nilai D/E', detail: `${buruk} MK dengan nilai D/E (perlu mengulang)`, nilai: buruk, threshold: 0, poin });
    skor += poin;
  }

  // 3. Progres SKS — defisit terhadap ekspektasi
  if (semesterBerjalan >= 2 && expectedSks > 0) {
    const ratio = totalSks / expectedSks;
    if (ratio < 0.6) {
      indikator.push({ jenis: 'sks_progres', severity: 'tinggi', judul: 'Progres SKS sangat lambat', detail: `Baru ${totalSks} SKS dari ekspektasi ${expectedSks}`, nilai: totalSks, threshold: expectedSks, poin: 25 });
      skor += 25;
    } else if (ratio < 0.8) {
      indikator.push({ jenis: 'sks_progres', severity: 'sedang', judul: 'Progres SKS lambat', detail: `Baru ${totalSks} SKS dari ekspektasi ${expectedSks}`, nilai: totalSks, threshold: expectedSks, poin: 10 });
      skor += 10;
    }
  }

  // 4. Absensi semester aktif
  const krsAktif = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semAktif.id, status: 'disetujui' },
    select: { id: true, kelas: { select: { id: true, mataKuliah: { select: { kode: true } } } } },
  });
  if (krsAktif.length > 0) {
    // hitung absensi: total pertemuan dihadiri / total pertemuan yang sudah lewat
    const kelasIds = krsAktif.map((k) => k.kelas.id);
    const pertemuanLewat = await prisma.pertemuan.count({
      where: { kelasId: { in: kelasIds }, tanggal: { lt: new Date() } },
    });
    if (pertemuanLewat > 0) {
      const hadir = await prisma.absensi.count({
        where: { mahasiswaId: m.id, pertemuan: { kelasId: { in: kelasIds }, tanggal: { lt: new Date() } }, status: { in: ['hadir', 'izin', 'sakit'] } },
      });
      const ratio = hadir / pertemuanLewat;
      if (ratio < 0.5) {
        indikator.push({ jenis: 'absensi', severity: 'tinggi', judul: 'Kehadiran sangat rendah', detail: `Kehadiran ${Math.round(ratio * 100)}% (${hadir}/${pertemuanLewat})`, nilai: Math.round(ratio * 100), threshold: 75, poin: 20 });
        skor += 20;
      } else if (ratio < ABSENSI_MIN) {
        indikator.push({ jenis: 'absensi', severity: 'sedang', judul: 'Kehadiran di bawah ambang', detail: `Kehadiran ${Math.round(ratio * 100)}% (${hadir}/${pertemuanLewat})`, nilai: Math.round(ratio * 100), threshold: 75, poin: 8 });
        skor += 8;
      }
    }
  }

  // 5. Tunggakan tagihan jatuh tempo
  const tagihan = await prisma.tagihan.findMany({
    where: { mahasiswaId: m.id, status: { in: ['belum_bayar', 'cicil', 'jatuh_tempo'] } },
    select: { id: true, jumlah: true, jatuhTempo: true, pembayaran: { select: { jumlah: true } } },
  });
  const sekarang = new Date();
  const menunggak = tagihan.filter((t) => t.jatuhTempo && t.jatuhTempo < sekarang);
  if (menunggak.length > 0) {
    const totalNunggak = menunggak.reduce((s, t) => {
      const dibayar = t.pembayaran.reduce((p, x) => p + Number(x.jumlah), 0);
      return s + (Number(t.jumlah) - dibayar);
    }, 0);
    indikator.push({
      jenis: 'tunggakan', severity: 'sedang',
      judul: 'Tunggakan keuangan',
      detail: `${menunggak.length} tagihan lewat jatuh tempo · sisa Rp ${totalNunggak.toLocaleString('id-ID')}`,
      nilai: menunggak.length, threshold: 0, poin: 10,
    });
    skor += 10;
  }

  // 6. Belum heregistrasi semester aktif
  const heregistrasi = await prisma.heregistrasi.findUnique({
    where: { mahasiswaId_semesterId: { mahasiswaId: m.id, semesterId: semAktif.id } },
  });
  if (!heregistrasi || heregistrasi.status !== 'disetujui') {
    indikator.push({
      jenis: 'heregistrasi', severity: heregistrasi ? 'rendah' : 'sedang',
      judul: heregistrasi ? `Heregistrasi ${heregistrasi.status}` : 'Belum heregistrasi',
      detail: heregistrasi ? `Status heregistrasi: ${heregistrasi.status}` : 'Belum mengajukan heregistrasi semester aktif',
      nilai: heregistrasi?.status ?? 'belum',
      threshold: 'disetujui',
      poin: heregistrasi ? 5 : 10,
    });
    skor += heregistrasi ? 5 : 10;
  }

  return {
    mahasiswaId: m.id,
    nim: m.nim,
    nama: m.nama,
    angkatan: m.angkatan,
    status: m.status,
    prodi: m.prodi,
    dpa: m.dpa,
    semesterBerjalan,
    ipk,
    totalSks,
    skorRisiko: Math.min(100, skor),
    tingkat: tingkatFromSkor(skor),
    indikator,
  };
}

/** Hitung EWS untuk banyak mahasiswa sekaligus dengan filter. */
export async function listEws(filter: {
  prodiId?: string;
  angkatan?: number;
  dpaId?: string;
  tingkatMin?: 'tinggi' | 'sedang' | 'rendah';
} = {}): Promise<EwsMahasiswaResult[]> {
  const mhsList = await prisma.mahasiswa.findMany({
    where: {
      status: { notIn: ['lulus', 'drop_out', 'mengundurkan_diri'] },
      ...(filter.prodiId && { prodiId: filter.prodiId }),
      ...(filter.angkatan && { angkatan: filter.angkatan }),
      ...(filter.dpaId && { dpaId: filter.dpaId }),
    },
    select: { id: true },
    take: 500,
  });

  const results: EwsMahasiswaResult[] = [];
  for (const m of mhsList) {
    const r = await hitungEwsMahasiswa(m.id);
    if (r) results.push(r);
  }
  // Filter tingkat minimum
  const threshold = filter.tingkatMin === 'tinggi' ? 60 : filter.tingkatMin === 'sedang' ? 30 : filter.tingkatMin === 'rendah' ? 10 : 0;
  return results.filter((r) => r.skorRisiko >= threshold).sort((a, b) => b.skorRisiko - a.skorRisiko);
}
