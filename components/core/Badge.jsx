import React from 'react';

export function Badge({ variant = 'neutral', dot = false, children, className = '', ...props }) {
  const cls = ['tz-badge', `tz-badge--${variant}`, className].filter(Boolean).join(' ');
  return <span className={cls} {...props}>{dot && <span className="tz-badge__dot" />}{children}</span>;
}
