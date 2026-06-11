// ============================================================
// Konversi nilai akademik — sesuai skala 4 standar Kemendikbud.
// ============================================================

export const NILAI_HURUF = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'] as const;
export type NilaiHuruf = (typeof NILAI_HURUF)[number];

const BOBOT: Record<NilaiHuruf, number> = {
  A: 4.0,
  AB: 3.5,
  B: 3.0,
  BC: 2.5,
  C: 2.0,
  D: 1.0,
  E: 0.0,
};

/** Konversi nilai angka (0-100) → huruf. */
export function angkaToHuruf(n: number): NilaiHuruf {
  if (n >= 85) return 'A';
  if (n >= 75) return 'AB';
  if (n >= 70) return 'B';
  if (n >= 65) return 'BC';
  if (n >= 56) return 'C';
  if (n >= 40) return 'D';
  return 'E';
}

export const hurufToBobot = (h: string): number => BOBOT[h as NilaiHuruf] ?? 0;

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
