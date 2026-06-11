import { Link } from 'react-router-dom';
import { Card } from '@/ds';
import { Megaphone, AlertCircle, ChevronRight } from 'lucide-react';
import { formatTanggal } from '@/lib/format';

type Item = { id: string; judul: string; isi: string; tanggal: string; isPenting: boolean };

type Props = {
  items: Item[];
  /** Path tujuan saat klik "Lihat semua". Bisa berbeda per peran (mis. /mahasiswa/pengumuman, /akademik/pengumuman). */
  seeAllPath: string;
  /** Label tombol bawah. Default "Lihat semua". Akademik biasanya "Kelola". */
  seeAllLabel?: string;
};

export function PengumumanWidget({ items, seeAllPath, seeAllLabel = 'Lihat semua' }: Props) {
  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>
          <Megaphone size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Pengumuman
        </h3>
        <Link
          to={seeAllPath}
          style={{ color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: 2 }}
        >
          {seeAllLabel} <ChevronRight size={12} />
        </Link>
      </div>
      <div style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Belum ada pengumuman.</p>
        ) : (
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((p) => (
              <li key={p.id}>
                <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                  {p.isPenting && <AlertCircle size={12} style={{ color: 'var(--danger-fg)' }} />}
                  <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>{p.judul}</strong>
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-2xs)', margin: '2px 0 4px' }}>{formatTanggal(p.tanggal)}</div>
                <p className="muted" style={{ margin: 0, fontSize: 'var(--text-xs)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.isi}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
