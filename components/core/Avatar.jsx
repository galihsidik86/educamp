import React from 'react';

export function Avatar({ src, name = '', size = 'md', className = '', ...props }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const cls = ['tz-avatar', `tz-avatar--${size}`, className].filter(Boolean).join(' ');
  return <span className={cls} {...props}>{src ? <img src={src} alt={name} /> : (initials || '?')}</span>;
}
