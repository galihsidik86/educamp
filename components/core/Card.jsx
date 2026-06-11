import React from 'react';

export function Card({ pad = false, hover = false, title, action, children, className = '', ...props }) {
  const cls = ['tz-card', pad && !title && 'tz-card--pad', hover && 'tz-card--hover', className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...props}>
      {title != null && (
        <div className="tz-card__header">
          <div className="tz-card__title">{title}</div>
          {action}
        </div>
      )}
      {title != null ? <div className="tz-card__body">{children}</div> : children}
    </div>
  );
}
