import { Alert, Card } from '@/ds';
import { Megaphone, AlertCircle } from 'lucide-react';
import { useMahasiswaPengumuman } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';

export function MahasiswaPengumuman() {
  const { data, isLoading, error } = useMahasiswaPengumuman();

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Pengumuman"
        subtitle="Informasi terbaru dari bagian akademik."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pengumuman">Saat ini tidak ada pengumuman yang ditujukan untuk Anda.</Alert>
      )}

      <div className="stack">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
              {p.isPenting
                ? <AlertCircle size={16} style={{ color: 'var(--danger-fg)' }} />
                : <Megaphone size={16} className="muted" />}
              <strong style={{ color: 'var(--text-strong)' }}>{p.judul}</strong>
              {p.isPenting && <span className="pill pill--danger">Penting</span>}
            </div>
            <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap', color: 'var(--text-default)' }}>{p.isi}</p>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              {formatTanggalWaktu(p.tanggal)}
              {p.pengirim && ` · ${p.pengirim}`}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
