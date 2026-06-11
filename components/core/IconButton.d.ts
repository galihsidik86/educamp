import * as React from 'react';
/** Compact square button holding a single icon — toolbar, table row, topbar actions. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
  /** Filled brand background instead of ghost. */
  solid?: boolean;
  /** Accessible label (also used as tooltip). Required. */
  label: string;
}
export function IconButton(props: IconButtonProps): JSX.Element;
