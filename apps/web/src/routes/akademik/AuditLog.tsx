import { useState } from 'react';
import { Alert, Card, Input, Select, Button } from '@/ds';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useAuditLog, type AuditEntry, type AuditFilters } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { TableSkeletonRows } from '@/components/Skeleton';
import { formatTanggalWaktu, formatStatus } from '@/lib/format';

const ACTIONS = [
  '', 'auth.login', 'auth.password', 'krs', 'nilai', 'tagihan', 'pembayaran',
  'periode', 'mahasiswa', 'dosen',
];

const ROLES = ['', 'mahasiswa', 'dosen', 'akademik'];

const PAGE = 50;

export function AdminAuditLog() {
  const [filters, setFilters] = useState<AuditFilters>({ take: PAGE, skip: 0 });
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const { data, isLoading, error } = useAuditLog(filters);

  const page = Math.floor((filters.skip ?? 0) / PAGE) + 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Riwayat Audit"
        subtitle="Catatan aksi sensitif: login, validasi KRS, input nilai, transaksi keuangan, reset password, perubahan periode."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            label="Cari"
            placeholder="action / entity / nama aktor…"
            value={filters.q ?? ''}
            onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value, skip: 0 })}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Action prefix" value={filters.action ?? ''} onChange={(e) => setFilters({ ...filters, action: (e.target as HTMLSelectElement).value, skip: 0 })}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a || 'Semua'}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 160 }}>
          <Select label="Peran aktor" value={filters.actorRole ?? ''} onChange={(e) => setFilters({ ...filters, actorRole: (e.target as HTMLSelectElement).value, skip: 0 })}>
            {ROLES.map((r) => <option key={r} value={r}>{r || 'Semua'}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 180 }}>
          <Input label="Sejak" type="datetime-local" value={filters.since ?? ''} onChange={(e) => setFilters({ ...filters, since: (e.target as HTMLInputElement).value, skip: 0 })} />
        </div>
        <div style={{ minWidth: 180 }}>
          <Input label="Hingga" type="datetime-local" value={filters.until ?? ''} onChange={(e) => setFilters({ ...filters, until: (e.target as HTMLInputElement).value, skip: 0 })} />
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aksi</th>
              <th>Entitas</th>
              <th>Aktor</th>
              <th>Peran</th>
              <th>IP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows cols={7} rows={5} />}
            {data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Tidak ada catatan.</td></tr>}
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggalWaktu(r.createdAt)}</td>
                <td className="mono"><strong>{r.action}</strong></td>
                <td>{r.entity ? formatStatus(r.entity) : '—'}{r.entityId && <div className="muted" style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)' }}>{r.entityId.slice(0, 8)}…</div>}</td>
                <td>{r.actorName ?? <span className="muted">—</span>}</td>
                <td className="muted">{r.actorRole ?? '—'}</td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{r.ip ?? '—'}</td>
                <td>
                  <Button size="sm" variant="ghost" leftIcon={<Eye size={12} />} onClick={() => setDetail(r)}>Detail</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {data ? `${(data.skip + 1).toLocaleString('id-ID')}–${Math.min(data.skip + data.take, data.total).toLocaleString('id-ID')} dari ${data.total.toLocaleString('id-ID')}` : '—'}
        </span>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Button
            size="sm" variant="ghost" leftIcon={<ChevronLeft size={14} />}
            disabled={page === 1 || isLoading}
            onClick={() => setFilters({ ...filters, skip: Math.max(0, (filters.skip ?? 0) - PAGE) })}
          >Sebelumnya</Button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{page} / {totalPages}</span>
          <Button
            size="sm" variant="ghost" rightIcon={<ChevronRight size={14} />}
            disabled={page >= totalPages || isLoading}
            onClick={() => setFilters({ ...filters, skip: (filters.skip ?? 0) + PAGE })}
          >Berikutnya</Button>
        </div>
      </div>

      {detail && <DetailModal entry={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Detail Audit" width={680}>
      <div className="stack">
        <Row label="Aksi" mono><strong>{entry.action}</strong></Row>
        <Row label="Waktu">{formatTanggalWaktu(entry.createdAt)}</Row>
        <Row label="Entitas">{entry.entity ?? '—'}</Row>
        <Row label="Entity ID" mono>{entry.entityId ?? '—'}</Row>
        <Row label="Aktor">{entry.actorName ?? '—'}</Row>
        <Row label="Peran">{entry.actorRole ?? '—'}</Row>
        <Row label="Actor ID" mono>{entry.actorId ?? '—'}</Row>
        <Row label="IP" mono>{entry.ip ?? '—'}</Row>
        <Row label="User-Agent">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>{entry.userAgent ?? '—'}</span>
        </Row>
        <div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>Metadata</div>
          <Card>
            <pre style={{ margin: 0, fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflow: 'auto' }}>
              {entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '—'}
            </pre>
          </Card>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="row" style={{ padding: 'var(--space-1) 0', borderBottom: '1px dashed var(--border-subtle)', alignItems: 'flex-start' }}>
      <div className="muted" style={{ minWidth: 140, fontSize: 'var(--text-sm)' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', flex: 1, wordBreak: 'break-all' }}>
        {children}
      </div>
    </div>
  );
}
