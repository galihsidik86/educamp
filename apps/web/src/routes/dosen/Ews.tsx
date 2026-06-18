import { Alert, Badge, Card } from '@/ds';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { useDosenEws, type DosenEwsMahasiswa } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';

export function DosenEws() {
  const { data, isLoading, error } = useDosenEws();

  return (
    <div className="stack">
      <PageHead
        eyebrow="DPA · EARLY WARNING"
        title="Peringatan Dini Mahasiswa Bimbingan"
        subtitle="Mahasiswa bimbingan Anda yang teridentifikasi beresiko DO. Lakukan konsultasi & dokumentasikan tindak lanjut."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Total beresiko</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-strong)' }}>{data.ringkasan.total}</div>
          </Card>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Tinggi</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--danger-fg)' }}>{data.ringkasan.tinggi}</div>
          </Card>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Sedang</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--warning-fg)' }}>{data.ringkasan.sedang}</div>
          </Card>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Rendah</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.ringkasan.rendah}</div>
          </Card>
        </div>
      )}

      {isLoading && <p className="muted">Menghitung skor risiko…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="success" title="Tidak ada mahasiswa bimbingan beresiko">
          Semua mahasiswa bimbingan Anda dalam status aman.
        </Alert>
      )}

      <div className="stack">
        {data?.items.map((m) => <EwsCard key={m.mahasiswaId} m={m} />)}
      </div>
    </div>
  );
}

function EwsCard({ m }: { m: DosenEwsMahasiswa }) {
  const tingkatColor =
    m.tingkat === 'tinggi' ? 'var(--danger-fg)' :
    m.tingkat === 'sedang' ? 'var(--warning-fg)' :
    'var(--text-muted)';
  const tingkatBadge = m.tingkat === 'tinggi' ? 'danger' : m.tingkat === 'sedang' ? 'warning' : 'neutral';
  return (
    <Card>
      <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
        <AlertTriangle size={16} style={{ color: tingkatColor }} />
        <strong style={{ color: 'var(--text-strong)' }}>{m.nim} · {m.nama}</strong>
        <Badge variant={tingkatBadge as any}>Risiko {m.tingkat}</Badge>
        <span className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>Skor: {m.skorRisiko}/100</span>
      </div>
      <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
        {m.prodi.nama} · Angkatan {m.angkatan} · Sem {m.semesterBerjalan} · IPK {m.ipk.toFixed(2)} · {m.totalSks} SKS
      </div>
      <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {m.indikator.map((i, idx) => (
          <span key={idx} title={i.detail} style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: i.severity === 'tinggi' ? 'var(--danger-bg)' : i.severity === 'sedang' ? 'var(--warning-bg)' : 'var(--surface-sunken)',
            color: i.severity === 'tinggi' ? 'var(--danger-fg)' : i.severity === 'sedang' ? 'var(--warning-fg)' : 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
          }}>
            <TrendingDown size={10} style={{ verticalAlign: 'middle' }} /> {i.judul}: {i.detail}
          </span>
        ))}
      </div>
    </Card>
  );
}
