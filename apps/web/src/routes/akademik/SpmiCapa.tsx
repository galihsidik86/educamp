import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card, Select } from '@/ds';
import { AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';
import { useCapaList, type StatusCapa } from '@/lib/queries-spmi';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';

const CAPA_LABEL: Record<StatusCapa, string> = {
  rencana: 'Rencana', pelaksanaan: 'Pelaksanaan', verifikasi: 'Verifikasi', closed: 'Closed', ditolak: 'Ditolak',
};

const CAPA_VARIANT: Record<StatusCapa, 'neutral' | 'warning' | 'accent' | 'success' | 'danger'> = {
  rencana: 'neutral', pelaksanaan: 'warning', verifikasi: 'accent', closed: 'success', ditolak: 'danger',
};

export function AkademikSpmiCapa() {
  const [status, setStatus] = useState<StatusCapa | ''>('');
  const [overdue, setOverdue] = useState(false);
  const { data, isLoading, error } = useCapaList({
    status: status || undefined,
    overdue: overdue || undefined,
  });

  return (
    <div className="stack">
      <PageHead
        eyebrow="PENGENDALIAN"
        title="Tindak Lanjut (CAPA)"
        subtitle="Pantau pelaksanaan corrective & preventive action atas seluruh temuan AMI. Kelola detail CAPA dari halaman detail AMI."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusCapa | '')}>
            <option value="">Semua status</option>
            <option value="rencana">Rencana</option>
            <option value="pelaksanaan">Pelaksanaan</option>
            <option value="verifikasi">Verifikasi</option>
            <option value="closed">Closed</option>
            <option value="ditolak">Ditolak</option>
          </Select>
        </div>
        <label className="row" style={{ gap: 'var(--space-1)', alignItems: 'center', paddingBottom: 'var(--space-2)' }}>
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
          <AlertTriangle size={14} style={{ color: 'var(--danger-fg)' }} />
          <span>Hanya yang overdue</span>
        </label>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,0.10)', color: 'var(--success-fg)',
              display: 'grid', placeItems: 'center',
            }}>
              <CheckCircle2 size={28} />
            </div>
            <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>Tidak ada CAPA pada filter ini</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center', maxWidth: 380 }}>
              {overdue ? 'Tidak ada tindak lanjut yang terlambat — kerja bagus!' : 'Semua tindak lanjut yang Anda cari belum ada.'}
            </p>
          </div>
        </Card>
      )}
      {data && data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Temuan</th>
                <th>AMI</th>
                <th>PIC</th>
                <th>Target Selesai</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => {
                const isOverdue = new Date(c.targetSelesai) < new Date() && c.status !== 'closed' && c.status !== 'ditolak';
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{c.temuan?.kode}</div>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>{c.temuan?.deskripsi?.slice(0, 80)}{c.temuan?.deskripsi && c.temuan.deskripsi.length > 80 ? '…' : ''}</div>
                      {c.temuan?.standar && (
                        <Badge variant="neutral" style={{ marginTop: 4 }}>Standar: {c.temuan.standar.kode}</Badge>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{c.temuan?.ami?.kode}</td>
                    <td style={{ fontSize: 'var(--text-sm)' }}>
                      {c.picDosen ? `${c.picDosen.nidn} — ${c.picDosen.nama}`
                        : c.picUser ? (c.picUser.akademik?.nama ?? c.picUser.email)
                        : <span className="muted">—</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>
                      {formatTanggal(c.targetSelesai)}
                      {isOverdue && (
                        <div style={{ marginTop: 2 }}>
                          <Badge variant="danger" dot>Overdue</Badge>
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge variant={CAPA_VARIANT[c.status]} dot>
                        <Wrench size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                        {CAPA_LABEL[c.status]}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {c.temuan?.ami && (
                        <Link to={`/akademik/spmi/ami/${c.temuan.ami.id}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                          Buka AMI →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
