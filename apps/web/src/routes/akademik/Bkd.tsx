import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, Input, Select } from '@/ds';
import { ChevronRight, BookCheck } from 'lucide-react';
import { useAdminBkdList, type StatusBkd } from '@/lib/queries-bkd';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';

const STATUS_OPTS: Array<{ v: StatusBkd | ''; label: string }> = [
  { v: 'diajukan', label: 'Menunggu verifikasi' },
  { v: 'disetujui', label: 'Disetujui' },
  { v: 'ditolak', label: 'Ditolak' },
  { v: 'draft', label: 'Draft dosen' },
  { v: '', label: 'Semua' },
];

export function AkademikBkd() {
  const [status, setStatus] = useState<StatusBkd | ''>('diajukan');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useAdminBkdList({ status: status || undefined, q: q || undefined });

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAPORAN"
        title="Verifikasi BKD"
        subtitle="Tinjau laporan Beban Kerja Dosen yang diajukan untuk verifikasi."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusBkd | '')}>
            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="NIDN atau nama dosen" />
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada laporan">Tidak ada laporan BKD pada filter ini.</Alert>
      )}

      <div className="stack">
        {data?.items.map((lap) => (
          <Link key={lap.id} to={`/akademik/bkd/${lap.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card hover>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <BookCheck size={16} className="muted" />
                    <strong style={{ color: 'var(--text-strong)' }}>
                      {[lap.dosen?.gelarDepan, lap.dosen?.nama, lap.dosen?.gelarBelakang].filter(Boolean).join(' ')}
                    </strong>
                    <StatusPill status={lap.status} />
                  </div>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {lap.dosen?.nidn} · {lap.dosen?.prodi.kode}
                    {' · '}{lap.semester ? `${lap.semester.jenis} ${lap.semester.tahunAjaran.kode}` : ''}
                  </div>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                    Total ekuivalen: <strong>{lap.totalSks.toFixed(1)} SKS</strong>
                    {' · '}{lap._count?.items ?? 0} item
                    {lap.diverifikasiPada && ` · Diverifikasi ${formatTanggalWaktu(lap.diverifikasiPada)}`}
                  </div>
                </div>
                <ChevronRight size={18} className="muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
