import type { ReactNode } from 'react';

type Props = {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Slot kanan — biasanya identitas (NIM/NIDN) atau action button. */
  right?: ReactNode;
};

/**
 * Brand-aligned hero untuk dashboard. Navy gradient + Islamic geometric
 * pattern overlay + gold radial glow (sesuai CLAUDE.md brand chrome).
 * Pakai hanya di halaman dashboard utama, bukan halaman daftar/edit —
 * kalau butuh hero serupa di sub-portal (mis. SPMI), pakai komponen ini,
 * jangan reimplementasi ulang dengan inline style (lihat UI-AUDIT.md #10).
 *
 * Aturan pemakaian font-serif (Spectral) di seluruh aplikasi — SELALU via
 * token `var(--font-serif)`, tidak pernah hardcode 'Spectral, serif':
 *   1. Momen "welcome/brand" tingkat atas: hero ini, login hero, wordmark
 *      sidebar — h1 besar yang menyapa pengguna.
 *   2. Dokumen formal/cetak: sertifikat, ijazah, halaman verifikasi publik.
 * DI LUAR itu (PageHead, judul card, dsb) pakai sans (default) — jangan
 * tambah serif ad hoc di halaman baru.
 */
export function DashboardHero({ eyebrow, title, subtitle, right }: Props) {
  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero__content">
        {eyebrow && <span className="dashboard-hero__eyebrow">{eyebrow}</span>}
        <h1 className="dashboard-hero__title">{title}</h1>
        {subtitle && <p className="dashboard-hero__subtitle">{subtitle}</p>}
      </div>
      {right && <div className="dashboard-hero__right">{right}</div>}
    </header>
  );
}
