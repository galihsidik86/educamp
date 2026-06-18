// ============================================================
// Helper hitung & generate Tagihan UKT.
// Memperhitungkan kategori UKT mahasiswa + beasiswa aktif (full / parsial),
// dan dapat menghasilkan tagihan sekaligus atau cicilan bulanan.
// ============================================================

import { prisma } from '../db.js';
import type { Mahasiswa, Semester } from '@prisma/client';

export type HitungUktInput = {
  mahasiswa: Pick<Mahasiswa, 'id' | 'prodiId' | 'kategoriUktId'>;
  semester: Pick<Semester, 'id' | 'kode'>;
};

export type HitungUktResult = {
  nominalUkt: number;        // tarif penuh UKT sebelum potongan
  totalPotongan: number;     // total beasiswa yang memotong UKT
  beasiswa: Array<{ kode: string; nama: string; potongan: number; jenis: 'persentase' | 'nominal' }>;
  sisaTagihan: number;       // nominalUkt - totalPotongan (≥ 0)
  fullCoverage: boolean;     // true bila beasiswa menutupi 100% UKT
  sumberTarif: 'kategori_ukt' | 'prodi_default' | 'none';
};

/**
 * Hitung nominal UKT yang harus ditagihkan ke mahasiswa untuk satu semester,
 * setelah dipotong beasiswa aktif yang berlaku untuk semester tersebut.
 */
export async function hitungUkt(input: HitungUktInput): Promise<HitungUktResult> {
  // 1. Ambil tarif UKT dari kategori (kalau ada) atau fallback ke Prodi.tarifSppDefault
  let nominalUkt = 0;
  let sumberTarif: HitungUktResult['sumberTarif'] = 'none';

  if (input.mahasiswa.kategoriUktId) {
    const kat = await prisma.kategoriUkt.findUnique({ where: { id: input.mahasiswa.kategoriUktId } });
    if (kat?.isAktif) {
      nominalUkt = Number(kat.nominalSemester);
      sumberTarif = 'kategori_ukt';
    }
  }
  if (nominalUkt === 0) {
    const prodi = await prisma.prodi.findUnique({ where: { id: input.mahasiswa.prodiId } });
    if (prodi?.tarifSppDefault) {
      nominalUkt = Number(prodi.tarifSppDefault);
      sumberTarif = 'prodi_default';
    }
  }

  // 2. Ambil beasiswa aktif untuk semester ini
  const beasiswaAktif = await prisma.pendaftaranBeasiswa.findMany({
    where: {
      mahasiswaId: input.mahasiswa.id,
      status: 'diterima',
      semesterSaatDaftar: input.semester.kode,
    },
    include: { beasiswa: true },
  });

  const beasiswa: HitungUktResult['beasiswa'] = [];
  let totalPotongan = 0;
  for (const pb of beasiswaAktif) {
    if (!pb.beasiswa.potongUkt) continue;
    let potongan = 0;
    let jenis: 'persentase' | 'nominal' = 'nominal';
    if (pb.beasiswa.persentase != null && pb.beasiswa.persentase > 0) {
      potongan = Math.round((nominalUkt * pb.beasiswa.persentase) / 100);
      jenis = 'persentase';
    } else {
      potongan = Number(pb.beasiswa.nominal);
      jenis = 'nominal';
    }
    beasiswa.push({ kode: pb.beasiswa.kode, nama: pb.beasiswa.nama, potongan, jenis });
    totalPotongan += potongan;
  }
  // Potongan tidak boleh melebihi nominal UKT
  if (totalPotongan > nominalUkt) totalPotongan = nominalUkt;
  const sisaTagihan = Math.max(0, nominalUkt - totalPotongan);

  return {
    nominalUkt,
    totalPotongan,
    beasiswa,
    sisaTagihan,
    fullCoverage: nominalUkt > 0 && totalPotongan >= nominalUkt,
    sumberTarif,
  };
}

export type CreateTagihanUktInput = HitungUktInput & {
  /** Tanggal jatuh tempo (untuk pembayaran sekaligus). Default: +30 hari dari sekarang. */
  jatuhTempo?: Date;
  /** Mode cicilan: kalau diisi >1, generate N tagihan bulanan. Default 1 (sekaligus). */
  cicilan?: number;
  /** Tanggal mulai cicilan. Default: hari ini. */
  cicilanMulai?: Date;
};

export type CreateTagihanUktResult = {
  hitung: HitungUktResult;
  tagihanIds: string[];
  skipped: 'sudah_ada' | 'full_coverage' | 'no_tarif' | null;
  cicilan: number;
};

/**
 * Buat tagihan UKT untuk mahasiswa+semester.
 * - Skip jika sudah ada tagihan UKT untuk semester ini (idempotent).
 * - Skip jika full coverage beasiswa.
 * - Skip jika tidak ada tarif tersetting.
 * - Kalau cicilan=1: buat 1 tagihan UKT sisa nominal.
 * - Kalau cicilan>1: buat N tagihan cicilan_ukt bulanan, masing-masing sisaTagihan/N.
 */
export async function createTagihanUkt(input: CreateTagihanUktInput): Promise<CreateTagihanUktResult> {
  const hitung = await hitungUkt(input);
  const cicilan = Math.max(1, Math.min(12, input.cicilan ?? 1));
  const tagihanIds: string[] = [];

  // Cek apakah sudah ada tagihan UKT/cicilan_ukt utk semester ini
  const sudahAda = await prisma.tagihan.findFirst({
    where: {
      mahasiswaId: input.mahasiswa.id,
      semesterId: input.semester.id,
      jenis: { in: ['ukt', 'cicilan_ukt', 'spp'] },
    },
  });
  if (sudahAda) {
    return { hitung, tagihanIds: [sudahAda.id], skipped: 'sudah_ada', cicilan };
  }
  if (hitung.nominalUkt === 0) {
    return { hitung, tagihanIds: [], skipped: 'no_tarif', cicilan };
  }
  if (hitung.fullCoverage) {
    return { hitung, tagihanIds: [], skipped: 'full_coverage', cicilan };
  }

  const today = input.cicilanMulai ?? new Date();
  if (cicilan === 1) {
    const jatuhTempo = input.jatuhTempo ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const beasiswaTxt = hitung.beasiswa.length > 0
      ? ` (setelah potongan beasiswa Rp ${hitung.totalPotongan.toLocaleString('id-ID')})`
      : '';
    const t = await prisma.tagihan.create({
      data: {
        mahasiswaId: input.mahasiswa.id,
        semesterId: input.semester.id,
        jenis: 'ukt',
        deskripsi: `UKT Semester ${input.semester.kode}${beasiswaTxt}`,
        jumlah: hitung.sisaTagihan,
        jatuhTempo,
        status: 'belum_bayar',
      },
    });
    tagihanIds.push(t.id);
  } else {
    // Cicilan bulanan — bagi rata, sisa pembulatan ke cicilan terakhir
    const nominalPerCicilan = Math.floor(hitung.sisaTagihan / cicilan);
    const sisa = hitung.sisaTagihan - nominalPerCicilan * cicilan;
    for (let i = 1; i <= cicilan; i++) {
      const jatuhTempo = new Date(today);
      jatuhTempo.setMonth(jatuhTempo.getMonth() + (i - 1));
      // Jatuh tempo tanggal 10 tiap bulan (kebijakan umum)
      jatuhTempo.setDate(10);
      const jumlah = i === cicilan ? nominalPerCicilan + sisa : nominalPerCicilan;
      const t = await prisma.tagihan.create({
        data: {
          mahasiswaId: input.mahasiswa.id,
          semesterId: input.semester.id,
          jenis: 'cicilan_ukt',
          deskripsi: `Cicilan UKT ${i}/${cicilan} · Semester ${input.semester.kode}`,
          jumlah,
          jatuhTempo,
          status: 'belum_bayar',
        },
      });
      tagihanIds.push(t.id);
    }
  }

  return { hitung, tagihanIds, skipped: null, cicilan };
}

/** Cek & buat tagihan uang pangkal kalau belum ada. Sekali per mahasiswa seumur studi. */
export async function ensureUangPangkal(mahasiswaId: string): Promise<{ created: boolean; tagihanId?: string; nominal?: number }> {
  const sudahAda = await prisma.tagihan.findFirst({
    where: { mahasiswaId, jenis: 'uang_pangkal' },
  });
  if (sudahAda) return { created: false, tagihanId: sudahAda.id };

  const mahasiswa = await prisma.mahasiswa.findUnique({
    where: { id: mahasiswaId },
    include: { prodi: true },
  });
  if (!mahasiswa) return { created: false };
  const tarif = mahasiswa.prodi.tarifUangPangkal ? Number(mahasiswa.prodi.tarifUangPangkal) : 0;
  if (tarif <= 0) return { created: false };

  // Cari semester aktif untuk reference (uang pangkal tidak terkait semester spesifik,
  // tapi DB butuh semesterId — pakai semester aktif sebagai default).
  const sem = await prisma.semester.findFirst({ where: { isAktif: true } });
  if (!sem) return { created: false };

  const jatuhTempo = new Date();
  jatuhTempo.setDate(jatuhTempo.getDate() + 14); // 2 minggu utk uang pangkal

  const t = await prisma.tagihan.create({
    data: {
      mahasiswaId,
      semesterId: sem.id,
      jenis: 'uang_pangkal',
      deskripsi: 'Uang Pangkal (Registrasi)',
      jumlah: tarif,
      jatuhTempo,
      status: 'belum_bayar',
    },
  });
  return { created: true, tagihanId: t.id, nominal: tarif };
}
