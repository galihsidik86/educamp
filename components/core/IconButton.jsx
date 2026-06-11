import React from 'react';

export function IconButton({ size = 'md', solid = false, label, children, className = '', ...props }) {
  const cls = ['tz-iconbtn', size === 'sm' && 'tz-iconbtn--sm', solid && 'tz-iconbtn--solid', className].filter(Boolean).join(' ');
  return <button className={cls} aria-label={label} title={label} {...props}>{children}</button>;
}
