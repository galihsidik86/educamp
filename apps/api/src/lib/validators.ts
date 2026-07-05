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

/** Varian tanggal string yang wajib bisa di-parse menjadi Date valid. */
export const dateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Tanggal tidak valid');
