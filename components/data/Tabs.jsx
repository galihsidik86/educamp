import React from 'react';

export function Tabs({ tabs = [], value, onChange, className = '' }) {
  return (
    <div className={['tz-tabs', className].filter(Boolean).join(' ')} role="tablist">
      {tabs.map((t) => {
        const val = t.value ?? t;
        const label = t.label ?? t;
        const active = value === val;
        return (
          <button key={val} role="tab" aria-selected={active}
            className={['tz-tab', active && 'tz-tab--active'].filter(Boolean).join(' ')}
            onClick={() => onChange && onChange(val)}>{label}</button>
        );
      })}
    </div>
  );
}
