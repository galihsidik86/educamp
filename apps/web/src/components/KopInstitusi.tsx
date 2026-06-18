import { useInstitusiPublic } from '@/lib/queries-institusi';

/**
 * Header institusi untuk dokumen cetak/publik.
 * Otomatis menampilkan nama institusi (default fallback "Institut Agama Islam Tazkia")
 * + tagline optional (default: subtitle parameter).
 */
export function KopInstitusi({ subtitle }: { subtitle?: string }) {
  const inst = useInstitusiPublic();
  const nama = inst.data?.nama || 'Institut Agama Islam Tazkia';
  const logo = inst.data?.logoUrl;
  return (
    <div className="krs-cetak__brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {logo && (
        <img
          src={logo}
          alt=""
          style={{ height: 56, width: 'auto', objectFit: 'contain' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div>
        <strong>{nama.toUpperCase()}</strong>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
    </div>
  );
}

/** Versi inline besar untuk landing/login page. */
export function NamaInstitusi({ as = 'span' }: { as?: 'span' | 'h1' | 'h2' }) {
  const inst = useInstitusiPublic();
  const nama = inst.data?.nama || 'Institut Agama Islam Tazkia';
  const Tag = as as any;
  return <Tag>{nama.toUpperCase()}</Tag>;
}

/** Hanya teks (tanpa wrapper) — bisa di-embed di dalam <strong>, <h1>, dll. */
export function NamaInstitusiText() {
  const inst = useInstitusiPublic();
  return <>{(inst.data?.nama || 'Institut Agama Islam Tazkia').toUpperCase()}</>;
}
