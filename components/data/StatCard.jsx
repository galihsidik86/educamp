import React from 'react';

export function StatCard({ label, value, icon, delta, deltaDir = 'up', className = '', ...props }) {
  return (
    <div className={['tz-stat', className].filter(Boolean).join(' ')} {...props}>
      <div className="tz-stat__top">
        <span className="tz-stat__label">{label}</span>
        {icon && <span className="tz-stat__icon">{icon}</span>}
      </div>
      <div className="tz-stat__value">{value}</div>
      {delta && <span className={`tz-stat__delta tz-stat__delta--${deltaDir}`}>{delta}</span>}
    </div>
  );
}
