import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Slot kanan — biasanya identitas (NIM/NIDN) atau action button. */
  right?: ReactNode;
};

/**
 * Brand-aligned hero untuk dashboard. Navy gradient + Islamic geometric
 * pattern overlay + gold radial glow (sesuai CLAUDE.md brand chrome).
 * Pakai hanya di halaman dashboard utama, bukan halaman daftar/edit.
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
