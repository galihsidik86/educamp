import React from 'react';

export const Input = React.forwardRef(function Input(
  { label, hint, error, required, icon, id, className = '', ...props },
  ref,
) {
  const auto = React.useId();
  const fid = id || auto;
  const invalid = !!error;
  return (
    <div className={['tz-field', invalid && 'tz-field--invalid', className].filter(Boolean).join(' ')}>
      {label && <label className="tz-field__label" htmlFor={fid}>{label}{required && <span className="tz-req">*</span>}</label>}
      <div className={['tz-inputwrap', icon && 'tz-inputwrap--icon'].filter(Boolean).join(' ')}>
        {icon && <span className="tz-inputwrap__icon">{icon}</span>}
        <input ref={ref} id={fid} className="tz-input" aria-invalid={invalid || undefined} {...props} />
      </div>
      {error ? <span className="tz-field__error">{error}</span> : hint && <span className="tz-field__hint">{hint}</span>}
    </div>
  );
});
