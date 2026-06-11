import * as React from 'react';
/** Small status label — academic statuses (Lulus, Aktif, Mengulang), counts, tags. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'accent' | 'solid';
  /** Show a leading status dot. */
  dot?: boolean;
}
export function Badge(props: BadgeProps): JSX.Element;
