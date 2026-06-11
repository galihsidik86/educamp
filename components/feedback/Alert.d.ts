import * as React from 'react';
/** Inline contextual message — deadlines, validation results, system notices. */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: React.ReactNode;
  /** Override the default per-variant icon. */
  icon?: React.ReactNode;
}
export function Alert(props: AlertProps): JSX.Element;
