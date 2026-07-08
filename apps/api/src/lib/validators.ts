import { z } from 'zod';

// ============================================================
// Validasi URL yang aman untuk ditampilkan sebagai link.
//
// PENTING: `z.string().url()` TIDAK cukup — parser URL menerima skema
// apa pun, termasuk `javascript:alert(1)` dan `data:text/html,...`.
// Nilai ini dirender sebagai `<a href>` di dashboard (mis. bukti
// pembayaran yang diklik admin keuangan), sehingga skema selain
// http/https adalah vektor stored-XSS dari mahasiswa ke staf.
// ============================================================

export const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL harus diawali http:// atau https://');

/**
 * Varian httpUrl untuk field opsional yang sering dikirim form sebagai string
 * kosong. String kosong / null dipetakan ke **null** (bukan undefined) supaya
 * pada update (`data: { ...body }`) field bisa benar-benar DIKOSONGKAN — kalau
 * dipetakan ke undefined, Prisma menganggap "tidak berubah" sehingga URL lama
 * tetap tampil meski pengguna sudah menghapusnya. Selain itu wajib http/https
 * (cegah stored-XSS javascript:/data:). Key yang tidak dikirim tetap undefined
 * (lewat .partial()) = "tidak berubah".
 */
export const optionalHttpUrl = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  httpUrl.nullish(),
);

/** Varian tanggal string yang wajib bisa di-parse menjadi Date valid. */
export const dateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Tanggal tidak valid');

/**
 * Parse integer dari query/body param dengan fallback + clamp opsional.
 *
 * MASALAH yang dicegah: `Number('abc')` = NaN, dan `Math.min(NaN, max)` tetap
 * NaN. Kalau NaN diteruskan ke Prisma `take`/`skip`/filter Int, Prisma melempar
 * error → 500 INTERNAL_ERROR untuk input klien yang seharusnya cukup diabaikan.
 */
export function intParam(
  raw: unknown,
  fallback: number,
  opts?: { min?: number; max?: number },
): number {
  const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  let v = Number.isFinite(n) ? Math.trunc(n) : fallback;
  if (opts?.min != null) v = Math.max(v, opts.min);
  if (opts?.max != null) v = Math.min(v, opts.max);
  return v;
}

/**
 * Seperti intParam tetapi mengembalikan `undefined` bila param tidak ada / bukan
 * angka valid — untuk filter opsional (mis. `angkatan`) agar NaN tak masuk ke
 * klausa `where` Prisma.
 */
export function intParamOptional(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
