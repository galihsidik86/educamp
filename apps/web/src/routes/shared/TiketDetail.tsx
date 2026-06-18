// Shared tiket detail page — auto-detects role from URL path.
// /mahasiswa/tiket/:id → mahasiswa view (close button, reply)
// /akademik/tiket/:id  → akademik view (status/prioritas controls, reply)

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Alert, Button, Card, Select } from '@/ds';
import { ChevronLeft, Send, X } from 'lucide-react';
import {
  useMahasiswaTiketDetail, useMahasiswaTiketActions,
  useAkademikTiketDetail, useAkademikTiketActions,
  type StatusTiket, type PrioritasTiket, type TiketReply,
} from '@/lib/queries-tiket';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_OPTS: Array<{ v: StatusTiket; label: string }> = [
  { v: 'terbuka', label: 'Terbuka' },
  { v: 'proses', label: 'Proses' },
  { v: 'menunggu_user', label: 'Menunggu mahasiswa' },
  { v: 'selesai', label: 'Selesai' },
  { v: 'ditutup', label: 'Ditutup' },
];

const PRIO_OPTS: Array<{ v: PrioritasTiket; label: string }> = [
  { v: 'rendah', label: 'Rendah' },
  { v: 'normal', label: 'Normal' },
  { v: 'tinggi', label: 'Tinggi' },
];

export function TiketDetailShared() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const isAkademik = pathname.startsWith('/akademik');

  if (isAkademik) return <AkademikView id={id!} />;
  return <MahasiswaView id={id!} />;
}

function MahasiswaView({ id }: { id: string }) {
  const { data, isLoading, error } = useMahasiswaTiketDetail(id);
  const actions = useMahasiswaTiketActions(id);
  const [reply, setReply] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Tiket tidak ditemukan.</Alert>;

  const canReply = data.status !== 'selesai' && data.status !== 'ditutup';
  const canClose = data.status === 'selesai';

  const send = async () => {
    setErr(null);
    if (!reply.trim()) return;
    try {
      await actions.reply.mutateAsync(reply);
      setReply('');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const close = async () => {
    if (!confirm('Tutup tiket ini? Anda tidak dapat balas setelahnya.')) return;
    setErr(null);
    try { await actions.close.mutateAsync(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <Link to="/mahasiswa/tiket" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar tiket
      </Link>

      <PageHead
        eyebrow={data.kategori.toUpperCase()}
        title={data.judul}
        subtitle={`Dibuat ${formatTanggalWaktu(data.createdAt)}`}
        right={<StatusPill status={data.status} />}
      />

      {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

      <Card>
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Deskripsi awal</div>
        <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{data.deskripsi}</p>
      </Card>

      <ReplyThread replies={data.replies} />

      {canClose && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={close}>Tutup tiket</Button>
        </div>
      )}

      {canReply && <ReplyComposer value={reply} onChange={setReply} onSend={send} sending={actions.reply.isPending} />}
    </div>
  );
}

function AkademikView({ id }: { id: string }) {
  const { data, isLoading, error } = useAkademikTiketDetail(id);
  const actions = useAkademikTiketActions(id);
  const [reply, setReply] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Tiket tidak ditemukan.</Alert>;

  const canReply = data.status !== 'ditutup';

  const send = async () => {
    setErr(null);
    if (!reply.trim()) return;
    try {
      await actions.reply.mutateAsync({ tiketId: id, isi: reply });
      setReply('');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const setStatus = async (status: StatusTiket) => {
    setErr(null);
    try { await actions.update.mutateAsync({ tiketId: id, patch: { status } }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const setPrio = async (prioritas: PrioritasTiket) => {
    setErr(null);
    try { await actions.update.mutateAsync({ tiketId: id, patch: { prioritas } }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <Link to="/akademik/tiket" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar tiket
      </Link>

      <PageHead
        eyebrow={data.kategori.toUpperCase()}
        title={data.judul}
        subtitle={data.mahasiswa ? `${data.mahasiswa.nim} — ${data.mahasiswa.nama} · ${data.mahasiswa.prodi.nama}` : ''}
      />

      {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

      <Card>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Select label="Status" value={data.status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusTiket)}>
              {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Prioritas" value={data.prioritas} onChange={(e) => setPrio((e.target as HTMLSelectElement).value as PrioritasTiket)}>
              {PRIO_OPTS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Deskripsi awal</div>
        <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{data.deskripsi}</p>
      </Card>

      <ReplyThread replies={data.replies} />

      {canReply && <ReplyComposer value={reply} onChange={setReply} onSend={send} sending={actions.reply.isPending} />}
    </div>
  );
}

function ReplyThread({ replies }: { replies: TiketReply[] }) {
  if (replies.length === 0) {
    return <p className="muted">Belum ada balasan.</p>;
  }
  return (
    <div className="stack">
      {replies.map((r) => {
        const isAkademik = r.authorRole === 'akademik';
        const name = isAkademik
          ? (r.author?.akademik?.nama ?? 'BAAK')
          : (r.author?.mahasiswa?.nama ?? 'Mahasiswa');
        return (
          <Card key={r.id} style={isAkademik ? { borderLeft: '3px solid var(--accent-fg)' } : undefined}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              <strong>{name}</strong> · {isAkademik ? 'Akademik' : 'Mahasiswa'} · {formatTanggalWaktu(r.createdAt)}
            </div>
            <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{r.isi}</p>
          </Card>
        );
      })}
    </div>
  );
}

function ReplyComposer({ value, onChange, onSend, sending }: {
  value: string; onChange: (s: string) => void; onSend: () => void; sending: boolean;
}) {
  return (
    <Card>
      <div className="stack">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="Tulis balasan…"
          className="tz-input"
          style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
        />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" leftIcon={<Send size={14} />} disabled={sending || !value.trim()} onClick={onSend}>
            {sending ? 'Mengirim…' : 'Kirim balasan'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
