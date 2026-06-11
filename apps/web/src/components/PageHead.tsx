type Props = { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode };

export function PageHead({ eyebrow, title, subtitle, right }: Props) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
      <div className="page-head">
        {eyebrow && <span className="page-head__eyebrow">{eyebrow}</span>}
        <h1 className="page-head__title">{title}</h1>
        {subtitle && <p className="muted" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
