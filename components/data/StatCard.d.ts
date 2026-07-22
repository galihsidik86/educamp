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
   * - `danger`   — angkanya sendiri kabar buruk, mis. sinkron gagal (merah)
   * - `feature`  — satu angka utama per grid (kartu navy terisi)
   *
   * `attention` & `danger` boleh ditentukan dari data
   * (`tone={gagal > 0 ? 'danger' : 'default'}`); `feature` adalah pilihan
   * editorial dan harus statis.
   */
  tone?: 'default' | 'attention' | 'danger' | 'feature';
}
export function StatCard(props: StatCardProps): JSX.Element;
