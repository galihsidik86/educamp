import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Cable, RefreshCw, Play, AlertCircle, CheckCircle2, Clock, Activity, Search } from 'lucide-react';
import {
  useFeederConfig, useFeederStats, useFeederQueue, useFeederLog, useFeederActions,
  type FeederStatus, type FeederConfigInput,
} from '@/lib/queries-feeder';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_LABEL: Record<FeederStatus, string> = {
  pending: 'Pending', processing: 'Processing', success: 'Sukses', failed: 'Gagal', skipped: 'Skipped (dry-run)',
};

export function AkademikFeeder() {
  const [tab, setTab] = useState<'config' | 'queue' | 'log'>('config');

  return (
    <div className="stack">
      <PageHead
        eyebrow="INTEGRASI"
        title="Sinkronisasi Neo Feeder PDDikti"
        subtitle="Konfigurasi web service Neo Feeder Kemendikbud, monitor antrian sinkronisasi, dan lihat riwayat sync."
      />
      <Alert variant="info" title="Catatan">
        Pengembangan menggunakan <strong>stub client</strong> — push tidak benar-benar dikirim ke Feeder kampus.
        Set env <code className="mono">FEEDER_USE_REAL=true</code> dan implementasikan real client di production.
      </Alert>

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Button size="sm" variant={tab === 'config' ? 'primary' : 'ghost'} leftIcon={<Cable size={14} />} onClick={() => setTab('config')}>Konfigurasi</Button>
        <Button size="sm" variant={tab === 'queue' ? 'primary' : 'ghost'} leftIcon={<Activity size={14} />} onClick={() => setTab('queue')}>Antrian</Button>
        <Button size="sm" variant={tab === 'log' ? 'primary' : 'ghost'} leftIcon={<RefreshCw size={14} />} onClick={() => setTab('log')}>Riwayat Sync</Button>
      </div>

      {tab === 'config' && <ConfigTab />}
      {tab === 'queue' && <QueueTab />}
      {tab === 'log' && <LogTab />}
    </div>
  );
}

function ConfigTab() {
  const { data, isLoading, error } = useFeederConfig();
  const actions = useFeederActions();
  const [form, setForm] = useState<FeederConfigInput>({
    baseUrl: '', username: '', password: '', semesterAktif: '', dryRun: true, isEnabled: false,
  });
  const [actErr, setActErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setForm({
      baseUrl: data.baseUrl ?? '', username: data.username ?? '',
      password: '', semesterAktif: data.semesterAktif ?? '',
      dryRun: data.dryRun, isEnabled: data.isEnabled,
    });
    setInitialized(true);
  }

  const save = async () => {
    setActErr(null); setInfo(null);
    try {
      // Kirim password hanya bila tidak kosong
      const patch: FeederConfigInput = { ...form };
      if (!patch.password) delete patch.password;
      await actions.updateConfig.mutateAsync(patch);
      setInfo('Konfigurasi disimpan.');
      setForm((f) => ({ ...f, password: '' })); // clear pw field
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const test = async () => {
    setActErr(null); setInfo(null);
    try {
      const r = await actions.testConnection.mutateAsync();
      setInfo(`${r.ok ? '✓' : '✗'} ${r.message ?? ''}`);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {info && <Alert variant="info" title="Info">{info}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      {data && (
        <Card>
          <div className="stack">
            <Input label="Base URL Feeder" value={form.baseUrl ?? ''} onChange={(e) => setForm({ ...form, baseUrl: (e.target as HTMLInputElement).value })} placeholder="https://feeder.kampus.ac.id:1357" />
            <div className="row" style={{ gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}>
                <Input label="Akun WS PDDikti" value={form.username ?? ''} onChange={(e) => setForm({ ...form, username: (e.target as HTMLInputElement).value })} />
              </div>
              <div style={{ flex: 1 }}>
                <Input label={data.hasPassword ? 'Password (isi untuk ganti)' : 'Password'} type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: (e.target as HTMLInputElement).value })} />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Semester aktif PDDikti" value={form.semesterAktif ?? ''} onChange={(e) => setForm({ ...form, semesterAktif: (e.target as HTMLInputElement).value })} placeholder="20251" />
              </div>
            </div>
            <div className="row" style={{ gap: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={form.isEnabled ?? false} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
                Sinkronisasi aktif
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
                <input type="checkbox" checked={form.dryRun ?? true} onChange={(e) => setForm({ ...form, dryRun: e.target.checked })} />
                Dry-run (tidak benar-benar push ke Feeder)
              </label>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <Button variant="ghost" size="sm" leftIcon={<Cable size={14} />} onClick={test} disabled={actions.testConnection.isPending}>
                {actions.testConnection.isPending ? 'Menguji…' : 'Test Koneksi'}
              </Button>
              <Button variant="primary" size="sm" onClick={save} disabled={actions.updateConfig.isPending}>
                {actions.updateConfig.isPending ? 'Menyimpan…' : 'Simpan Konfigurasi'}
              </Button>
            </div>

            {data.lastTestAt && (
              <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                Test koneksi terakhir: {formatTanggalWaktu(data.lastTestAt)} — <strong>{data.lastTestStatus}</strong>
                {data.lastTestMessage && ` · ${data.lastTestMessage}`}
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

function QueueTab() {
  const stats = useFeederStats();
  const [filter, setFilter] = useState<FeederStatus | ''>('pending');
  const { data, isLoading, error } = useFeederQueue(filter || undefined);
  const actions = useFeederActions();
  const [actErr, setActErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((it) =>
      it.entity.toLowerCase().includes(query) ||
      it.operation.toLowerCase().includes(query) ||
      (it.lastError ?? '').toLowerCase().includes(query),
    );
  }, [data, search]);

  const runWorker = async () => {
    setActErr(null); setInfo(null);
    try {
      const r = await actions.processQueue.mutateAsync(50);
      setInfo(`Diproses ${r.processed}: ${r.success} sukses, ${r.failed} gagal, ${r.skipped} skipped`);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const retry = async (id: string) => {
    setActErr(null);
    try { await actions.retryItem.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {info && <Alert variant="info" title="Hasil">{info}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        <Kpi icon={<Clock size={18} />} label="Pending" value={stats.data?.pending ?? 0} tone={(stats.data?.pending ?? 0) > 0 ? 'warn' : undefined} />
        <Kpi icon={<RefreshCw size={18} />} label="Processing" value={stats.data?.processing ?? 0} />
        <Kpi icon={<CheckCircle2 size={18} />} label="Sukses" value={stats.data?.success ?? 0} />
        <Kpi icon={<AlertCircle size={18} />} label="Gagal" value={stats.data?.failed ?? 0} tone={(stats.data?.failed ?? 0) > 0 ? 'danger' : undefined} />
        <Kpi icon={<Activity size={18} />} label="Skipped (dry-run)" value={stats.data?.skipped ?? 0} />
      </div>

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={filter} onChange={(e) => setFilter((e.target as HTMLSelectElement).value as FeederStatus | '')}>
            <option value="">Semua</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="success">Success</option>
            <option value="skipped">Skipped</option>
          </Select>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Play size={14} />} onClick={runWorker} disabled={actions.processQueue.isPending}>
          {actions.processQueue.isPending ? 'Memproses…' : 'Proses antrian'}
        </Button>
        {data && data.items.length > 0 && (
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari entity, op, atau error…"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada item yang cocok dengan &ldquo;{search.trim()}&rdquo;.</p>
      )}

      <Card>
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr><th>Waktu</th><th>Entity</th><th>Op</th><th>Status</th><th className="num">Attempts</th><th>Pesan / Error</th><th></th></tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Tidak ada item.</td></tr>}
              {items.map((q) => (
                <tr key={q.id}>
                  <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggalWaktu(q.createdAt)}</td>
                  <td className="mono">{q.entity}</td>
                  <td>{q.operation}</td>
                  <td>
                    <span className={`pill ${pillFor(q.status)}`}>{STATUS_LABEL[q.status]}</span>
                  </td>
                  <td className="num mono">{q.attempts}/{q.maxAttempts}</td>
                  <td className="muted" style={{ fontSize: 'var(--text-xs)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.lastError ?? <span className="muted">—</span>}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      {q.status === 'failed' && (
                        <Button size="sm" variant="ghost" onClick={() => retry(q.id)}>Retry</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function LogTab() {
  const { data, isLoading, error } = useFeederLog();
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((l) =>
      l.entity.toLowerCase().includes(query) ||
      l.operation.toLowerCase().includes(query) ||
      (l.feederId ?? '').toLowerCase().includes(query) ||
      (l.message ?? '').toLowerCase().includes(query),
    );
  }, [data, search]);

  if (error) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;
  if (isLoading) return <p className="muted">Memuat…</p>;

  return (
    <div className="stack">
      {data && data.items.length > 0 && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari entity, op, feederId, atau pesan…"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      )}
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada riwayat yang cocok dengan &ldquo;{search.trim()}&rdquo;.</p>
      )}
      <Card>
      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr><th>Waktu</th><th>Entity</th><th>Op</th><th>Status</th><th className="num">Durasi</th><th>FeederID</th><th>Pesan</th></tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Belum ada riwayat sync.</td></tr>}
            {items.map((l) => (
              <tr key={l.id}>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggalWaktu(l.createdAt)}</td>
                <td className="mono">{l.entity}</td>
                <td>{l.operation}</td>
                <td><span className={`pill ${pillFor(l.status)}`}>{STATUS_LABEL[l.status]}</span></td>
                <td className="num mono">{l.durationMs != null ? `${l.durationMs}ms` : '—'}</td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{l.feederId ?? '—'}</td>
                <td className="muted" style={{ fontSize: 'var(--text-xs)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: 'warn' | 'danger' }) {
  const color = tone === 'danger' ? 'var(--danger-fg)' : tone === 'warn' ? 'var(--warning-fg)' : undefined;
  return (
    <Card>
      <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ color: color ?? 'var(--text-muted)' }}>{icon}</div>
        <div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 2, color }}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

function pillFor(s: FeederStatus): string {
  switch (s) {
    case 'success': return 'pill--success';
    case 'failed': return 'pill--danger';
    case 'pending':
    case 'processing': return 'pill--warning';
    default: return 'pill--neutral';
  }
}
