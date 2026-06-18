import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card, Input, Select } from '@/ds';
import { AlertTriangle, TrendingDown, ChevronRight } from 'lucide-react';
import { useEws, useProdi, type EwsMahasiswa } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';

export function AdminEws() {
  const [filters, setFilters] = useState({ prodiId: '', angkatan: '', tingkat: '' });
  const { data, isLoading, error } = useEws({
    prodiId: filters.prodiId || undefined,
    angkatan: filters.angkatan ? Number(filters.angkatan) : undefined,
    tingkat: filters.tingkat || undefined,
  });
  const prodi = useProdi();

  return (
    <div className="stack">
      <PageHead
        eyebrow="EARLY WARNING SYSTEM"
        title="Peringatan Dini Mahasiswa"
        subtitle="Identifikasi mahasiswa beresiko DO berdasarkan IPK, progres SKS, kehadiran, tunggakan keuangan, dan heregistrasi."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Total beresiko</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-strong)' }}>{data.ringkasan.total}</div>
          </Card>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Tingkat tinggi</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--danger-fg)' }}>{data.ringkasan.tinggi}</div>
          </Card>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Tingkat sedang</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--warning-fg)' }}>{data.ringkasan.sedang}</div>
          </Card>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Tingkat rendah</div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.ringkasan.rendah}</div>
          </Card>
        </div>
      )}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
        <div style={{ width: 130 }}>
          <Input label="Angkatan" type="number" value={filters.angkatan} onChange={(e) => setFilters({ ...filters, angkatan: (e.target as HTMLInputElement).value })} />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Tingkat minimal" value={filters.tingkat} onChange={(e) => setFilters({ ...filters, tingkat: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua tingkat</option>
            <option value="tinggi">Hanya Tinggi</option>
            <option value="sedang">Sedang & Tinggi</option>
            <option value="rendah">Semua beresiko</option>
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Menghitung skor risiko…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="success" title="Tidak ada mahasiswa beresiko">
          Semua mahasiswa pada filter ini dalam status aman.
        </Alert>
      )}

      <div className="stack">
        {data?.items.map((m) => <EwsItem key={m.mahasiswaId} m={m} />)}
      </div>
    </div>
  );
}

function EwsItem({ m }: { m: EwsMahasiswa }) {
  const tingkatColor =
    m.tingkat === 'tinggi' ? 'var(--danger-fg)' :
    m.tingkat === 'sedang' ? 'var(--warning-fg)' :
    'var(--text-muted)';
  const tingkatBadge =
    m.tingkat === 'tinggi' ? 'danger' :
    m.tingkat === 'sedang' ? 'warning' :
    'neutral';
  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertTriangle size={16} style={{ color: tingkatColor }} />
            <strong style={{ color: 'var(--text-strong)' }}>{m.nim} · {m.nama}</strong>
            <Badge variant={tingkatBadge as any}>Risiko {m.tingkat}</Badge>
            <span className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>Skor: {m.skorRisiko}/100</span>
          </div>
          <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            {m.prodi.nama} · Angkatan {m.angkatan} · Sem {m.semesterBerjalan} · IPK {m.ipk.toFixed(2)} · {m.totalSks} SKS
            {m.dpa && <> · DPA: {m.dpa.nama}</>}
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
        </div>
        <Link to={`/akademik/mahasiswa?q=${m.nim}`} style={{ color: 'var(--text-link)', fontSize: 'var(--text-sm)' }}>
          Detail <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
        </Link>
      </div>
    </Card>
  );
}
