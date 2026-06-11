import React from 'react';

export const Select = React.forwardRef(function Select(
  { label, hint, error, required, id, children, className = '', ...props },
  ref,
) {
  const auto = React.useId();
  const fid = id || auto;
  const invalid = !!error;
  return (
    <div className={['tz-field', invalid && 'tz-field--invalid', className].filter(Boolean).join(' ')}>
      {label && <label className="tz-field__label" htmlFor={fid}>{label}{required && <span className="tz-req">*</span>}</label>}
      <select ref={ref} id={fid} className="tz-select" {...props}>{children}</select>
      {error ? <span className="tz-field__error">{error}</span> : hint && <span className="tz-field__hint">{hint}</span>}
    </div>
  );
});
