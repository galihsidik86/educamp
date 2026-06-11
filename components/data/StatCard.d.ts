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
}
export function StatCard(props: StatCardProps): JSX.Element;
