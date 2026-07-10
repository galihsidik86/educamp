import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { Check, X, CheckCircle2, MessageSquare } from 'lucide-react';
import {
  useKonsultasiDosen, useKonsultasiDosenActions,
  type KonsultasiDosen, type StatusKonsultasi,
} from '@/lib/queries-konsultasi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_TABS: Array<{ v: StatusKonsultasi | ''; label: string }> = [
  { v: '', label: 'Semua' },
  { v: 'diajukan', label: 'Permintaan baru' },
  { v: 'diterima', label: 'Diterima' },
  { v: 'selesai', label: 'Selesai' },
];

export function DosenKonsultasi() {
  const [tab, setTab] = useState<StatusKonsultasi | ''>('diajukan');
  const { data, isLoading, error } = useKonsultasiDosen(tab || undefined);
  const actions = useKonsultasiDosenActions();
  const [actErr, setActErr] = useState<string | null>(null);
  const [responding, setResponding] = useState<KonsultasiDosen | null>(null);
  const [completing, setCompleting] = useState<KonsultasiDosen | null>(null);

  const onTerima = async (k: KonsultasiDosen) => {
    setActErr(null);
    try { await actions.respond.mutateAsync({ id: k.id, body: { status: 'diterima' } }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="BIMBINGAN"
        title="Konsultasi DPA"
        subtitle="Tangani permintaan konsultasi dari mahasiswa bimbingan Anda."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        {STATUS_TABS.map((t) => (
          <Button key={t.v} size="sm" variant={tab === t.v ? 'primary' : 'ghost'} onClick={() => setTab(t.v)}>
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada konsultasi">Tidak ada konsultasi pada filter ini.</Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => (
          <Card key={k.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <MessageSquare size={16} className="muted" />
                  <strong style={{ color: 'var(--text-strong)' }}>{k.topik}</strong>
                  <StatusPill status={k.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {formatTanggalWaktu(k.waktuMulai)} · {k.durasiMenit} menit
                  {' · '}<span>{k.mahasiswa.nim} — {k.mahasiswa.nama} (Angkatan {k.mahasiswa.angkatan})</span>
                </div>
                {k.agenda && (
                  <div style={{ marginTop: 8 }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Agenda mahasiswa:</div>
                    <p className="muted" style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{k.agenda}</p>
                  </div>
                )}
                {k.catatanDpa && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan Anda:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{k.catatanDpa}</p>
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {k.status === 'diajukan' && (
                  <>
                    <Button size="sm" variant="primary" leftIcon={<Check size={14} />} onClick={() => onTerima(k)}>Terima</Button>
                    <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => setResponding(k)}>Tolak</Button>
                  </>
                )}
                {k.status === 'diterima' && (
                  <Button size="sm" variant="primary" leftIcon={<CheckCircle2 size={14} />} onClick={() => setCompleting(k)}>Tutup sesi</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {responding && (
        <RejectModal item={responding} onClose={() => setResponding(null)} actions={actions} />
      )}
      {completing && (
        <CompleteModal item={completing} onClose={() => setCompleting(null)} actions={actions} />
      )}
    </div>
  );
}

function RejectModal({ item, onClose, actions }: {
  item: KonsultasiDosen;
  onClose: () => void;
  actions: ReturnType<typeof useKonsultasiDosenActions>;
}) {
  const [catatan, setCatatan] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    try {
      await actions.respond.mutateAsync({ id: item.id, body: { status: 'ditolak', catatanDpa: catatan || null } });
      onClose();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Tolak konsultasi — ${item.mahasiswa.nim}`} width={560}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Alasan (opsional)</label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={4}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            placeholder="mis. Sedang ada jadwal mengajar di waktu tersebut, ajukan ulang di waktu lain."
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={actions.respond.isPending} onClick={submit}>Tolak</Button>
        </div>
      </div>
    </Modal>
  );
}

function CompleteModal({ item, onClose, actions }: {
  item: KonsultasiDosen;
  onClose: () => void;
  actions: ReturnType<typeof useKonsultasiDosenActions>;
}) {
  const [catatan, setCatatan] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (catatan.trim().length < 1) { setErr('Catatan hasil konsultasi wajib diisi'); return; }
    try {
      await actions.selesai.mutateAsync({ id: item.id, catatanDpa: catatan });
      onClose();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Tutup sesi — ${item.mahasiswa.nim}`} width={620}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Catatan hasil konsultasi</label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={6}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            placeholder="Mahasiswa setuju ambil 21 SKS. Disarankan ulang MK Algoritma di semester pendek."
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={actions.selesai.isPending} onClick={submit}>Tutup sesi</Button>
        </div>
      </div>
    </Modal>
  );
}
