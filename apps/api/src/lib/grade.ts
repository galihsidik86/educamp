// ============================================================
// Konversi nilai akademik — default skala 4 Kemendikbud,
// bisa di-override lewat KonfigurasiSkalaNilai (admin akademik).
// ============================================================

import { prisma } from '../db.js';

export const NILAI_HURUF = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'] as const;
export type NilaiHuruf = (typeof NILAI_HURUF)[number];

export type SkalaRow = { huruf: NilaiHuruf; minNilai: number; bobot: number };

/** Default Kemendikbud — dipakai kalau row config belum ada di DB. */
export const SKALA_DEFAULT: SkalaRow[] = [
  { huruf: 'A',  minNilai: 85, bobot: 4.0 },
  { huruf: 'AB', minNilai: 75, bobot: 3.5 },
  { huruf: 'B',  minNilai: 70, bobot: 3.0 },
  { huruf: 'BC', minNilai: 65, bobot: 2.5 },
  { huruf: 'C',  minNilai: 56, bobot: 2.0 },
  { huruf: 'D',  minNilai: 40, bobot: 1.0 },
  { huruf: 'E',  minNilai: 0,  bobot: 0.0 },
];

/** Cache module-level. Sync API tetap, refresh dari DB via refreshSkalaNilai(). */
let currentSkala: SkalaRow[] = SKALA_DEFAULT;

/** Ambil snapshot skala saat ini (untuk endpoint GET). */
export function getCurrentSkala(): SkalaRow[] {
  return currentSkala;
}

/** Reload dari DB. Dipanggil saat boot + tiap kali admin PUT skala. */
export async function refreshSkalaNilai(): Promise<void> {
  try {
    const row = await prisma.konfigurasiSkalaNilai.findFirst();
    if (!row) {
      currentSkala = SKALA_DEFAULT;
      return;
    }
    currentSkala = [
      { huruf: 'A',  minNilai: row.minA,  bobot: row.bobotA  },
      { huruf: 'AB', minNilai: row.minAB, bobot: row.bobotAB },
      { huruf: 'B',  minNilai: row.minB,  bobot: row.bobotB  },
      { huruf: 'BC', minNilai: row.minBC, bobot: row.bobotBC },
      { huruf: 'C',  minNilai: row.minC,  bobot: row.bobotC  },
      { huruf: 'D',  minNilai: row.minD,  bobot: row.bobotD  },
      { huruf: 'E',  minNilai: 0,         bobot: row.bobotE  },
    ];
  } catch (e) {
    console.error('[grade] gagal load skala dari DB, pakai default:', e);
    currentSkala = SKALA_DEFAULT;
  }
}

/** Konversi nilai angka (0-100) → huruf, pakai skala terkini. */
export function angkaToHuruf(n: number): NilaiHuruf {
  for (const r of currentSkala) {
    if (n >= r.minNilai) return r.huruf;
  }
  return 'E';
}

/** Konversi huruf → bobot skala 4 (atau skema custom). */
export function hurufToBobot(h: string): number {
  return currentSkala.find((r) => r.huruf === h)?.bobot ?? 0;
}

/** Hitung IP/IPK dari array {sks, bobot}. Returns 0 kalau total SKS 0. */
export function calculateIp(items: Array<{ sks: number; bobot: number | null }>): { ip: number; totalSks: number } {
  let totalMutu = 0;
  let totalSks = 0;
  for (const it of items) {
    if (it.bobot == null) continue;
    totalMutu += it.sks * it.bobot;
    totalSks += it.sks;
  }
  if (totalSks === 0) return { ip: 0, totalSks: 0 };
  return { ip: round2(totalMutu / totalSks), totalSks };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Batas SKS yang boleh diambil berdasarkan IP semester sebelumnya
 * (acuan umum Kemendikbud — kebijakan PT dapat berbeda).
 * Mahasiswa baru / belum ada IP → 20 SKS.
 */
export function dynamicMaxSks(prevIp: number | null): number {
  if (prevIp == null) return 20;
  if (prevIp >= 3.0) return 24;
  if (prevIp >= 2.5) return 21;
  if (prevIp >= 2.0) return 18;
  if (prevIp >= 1.5) return 15;
  return 12;
}
