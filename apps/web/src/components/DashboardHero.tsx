import type { ReactNode } from 'react';

type Props = {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /**
   * Label peran/status singkat — dirender sebagai pill beraksen dengan titik.
   * Pilih ini untuk teks pendek seperti jabatan; hasilnya konsisten di semua
   * portal tanpa tiap halaman menata sendiri.
   */
  tag?: ReactNode;
  /**
   * Slot kanan bebas — untuk isi yang BUKAN label, mis. data mono (NIM/NIDN)
   * atau kontrol seperti <Select> pemilih anak di portal wali.
   */
  right?: ReactNode;
};

/**
 * Brand-aligned hero untuk dashboard. Navy gradient + Islamic geometric
 * pattern overlay + radial glow oranye (sesuai CLAUDE.md brand chrome).
 * Pakai hanya di halaman dashboard utama, bukan halaman daftar/edit —
 * kalau butuh hero serupa di sub-portal (mis. SPMI), pakai komponen ini,
 * jangan reimplementasi ulang dengan inline style (lihat UI-AUDIT.md #10).
 *
 * Judul hero pakai SANS (Plus Jakarta Sans 800), bukan serif: sapaan
 * dashboard adalah chrome aplikasi, bukan dokumen formal. Serif (Spectral)
 * disisakan untuk sertifikat, ijazah, dan halaman verifikasi publik —
 * lihat CLAUDE.md "Only three font families".
 */
export function DashboardHero({ eyebrow, title, subtitle, tag, right }: Props) {
  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero__content">
        {eyebrow && <span className="dashboard-hero__eyebrow">{eyebrow}</span>}
        <h1 className="dashboard-hero__title">{title}</h1>
        {subtitle && <p className="dashboard-hero__subtitle">{subtitle}</p>}
      </div>
      {tag && <span className="dashboard-hero__tag">{tag}</span>}
      {right && <div className="dashboard-hero__right">{right}</div>}
    </header>
  );
}
