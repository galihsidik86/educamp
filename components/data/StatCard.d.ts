import * as React from 'react';
/**
 * KPI tile for dashboards — IPK, SKS, jumlah mahasiswa, dsb.
 * @startingPoint section="Data" subtitle="Dashboard KPI tile with icon + delta" viewport="700x150"
 */
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Small trend text under the value. */
  delta?: React.ReactNode;
  deltaDir?: 'up' | 'down';
  /**
   * Visual weight within a KPI grid — lets a dashboard separate "facts you
   * read" from "numbers you act on" without extra copy.
   * - `default`  — angka rujukan netral (aksen navy)
   * - `attention`— butuh tindakan / bisa memburuk (aksen oranye)
   * - `feature`  — satu angka utama per grid (kartu navy terisi)
   */
  tone?: 'default' | 'attention' | 'feature';
}
export function StatCard(props: StatCardProps): JSX.Element;
