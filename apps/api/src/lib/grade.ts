// ============================================================
// Konversi nilai akademik — default skala 4 Kemendikbud,
// bisa di-override lewat KonfigurasiSkalaNilai (admin akademik).
// Admin bisa custom: threshold, bobot, dan LABEL huruf per slot.
// ============================================================

import { prisma } from '../db.js';

/** Slot internal stabil — jangan diubah karena dipakai di logic. */
export const SLOT_KEYS = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

/** SkalaRow: kunci internal + label tampilan + threshold + bobot. */
export type SkalaRow = {
  slot: SlotKey;
  huruf: string;     // label tampilan (default = slot key, bisa di-custom)
  minNilai: number;
  bobot: number;
};

/** Default Kemendikbud. Dipakai kalau row config belum ada di DB. */
export const SKALA_DEFAULT: SkalaRow[] = [
  { slot: 'A',  huruf: 'A',  minNilai: 85, bobot: 4.0 },
  { slot: 'AB', huruf: 'AB', minNilai: 75, bobot: 3.5 },
  { slot: 'B',  huruf: 'B',  minNilai: 70, bobot: 3.0 },
  { slot: 'BC', huruf: 'BC', minNilai: 65, bobot: 2.5 },
  { slot: 'C',  huruf: 'C',  minNilai: 56, bobot: 2.0 },
  { slot: 'D',  huruf: 'D',  minNilai: 40, bobot: 1.0 },
  { slot: 'E',  huruf: 'E',  minNilai: 0,  bobot: 0.0 },
];

/** Cache module-level. Sync API tetap, refresh dari DB via refreshSkalaNilai(). */
let currentSkala: SkalaRow[] = SKALA_DEFAULT;

/** Snapshot skala saat ini. */
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
      { slot: 'A',  huruf: row.hurufA,  minNilai: row.minA,  bobot: row.bobotA  },
      { slot: 'AB', huruf: row.hurufAB, minNilai: row.minAB, bobot: row.bobotAB },
      { slot: 'B',  huruf: row.hurufB,  minNilai: row.minB,  bobot: row.bobotB  },
      { slot: 'BC', huruf: row.hurufBC, minNilai: row.minBC, bobot: row.bobotBC },
      { slot: 'C',  huruf: row.hurufC,  minNilai: row.minC,  bobot: row.bobotC  },
      { slot: 'D',  huruf: row.hurufD,  minNilai: row.minD,  bobot: row.bobotD  },
      { slot: 'E',  huruf: row.hurufE,  minNilai: 0,         bobot: row.bobotE  },
    ];
  } catch (e) {
    console.error('[grade] gagal load skala dari DB, pakai default:', e);
    currentSkala = SKALA_DEFAULT;
  }
}

/** Konversi nilai angka (0-100) → label huruf (custom-aware). */
export function angkaToHuruf(n: number): string {
  for (const r of currentSkala) {
    if (n >= r.minNilai) return r.huruf;
  }
  return currentSkala[currentSkala.length - 1]?.huruf ?? 'E';
}

/** Konversi label huruf → bobot. Cocokkan terhadap label saat ini. */
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
