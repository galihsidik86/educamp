import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Check, X, UserCog } from 'lucide-react';
import {
  useMutasiAkademik, useMutasiAkademikActions,
  type JenisMutasi, type StatusMutasi, type MutasiAdmin,
} from '@/lib/queries-mutasi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_OPTS: Array<{ v: StatusMutasi | ''; label: string }> = [
  { v: 'diajukan', label: 'Menunggu verifikasi' },
  { v: 'disetujui', label: 'Disetujui' },
  { v: 'ditolak', label: 'Ditolak' },
  { v: 'batal', label: 'Dibatalkan mahasiswa' },
  { v: '', label: 'Semua' },
];

const JENIS_LABEL: Record<JenisMutasi, string> = {
  cuti: 'Cuti akademik',
  aktif_kembali: 'Aktif kembali',
  pindah_prodi: 'Pindah prodi',
  mengundurkan_diri: 'Mengundurkan diri',
};

export function AkademikMutasi() {
  const [status, setStatus] = useState<StatusMutasi | ''>('diajukan');
  const [jenis, setJenis] = useState<JenisMutasi | ''>('');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useMutasiAkademik({
    status: status || undefined,
    jenis: jenis || undefined,
    q: q || undefined,
  });
  const actions = useMutasiAkademikActions();
  const [confirm, setConfirm] = useState<{ item: MutasiAdmin; aksi: 'disetujui' | 'ditolak' } | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Mutasi Mahasiswa"
        subtitle="Verifikasi pengajuan cuti, aktif kembali, pindah prodi, dan pengunduran diri mahasiswa."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusMutasi | '')}>
            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Jenis" value={jenis} onChange={(e) => setJenis((e.target as HTMLSelectElement).value as JenisMutasi | '')}>
            <option value="">Semua</option>
            {(Object.keys(JENIS_LABEL) as JenisMutasi[]).map((j) => (
              <option key={j} value={j}>{JENIS_LABEL[j]}</option>
            ))}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="NIM atau nama mahasiswa" />
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada pengajuan">Tidak ada mutasi pada filter ini.</Alert>
      )}

      <div className="stack">
        {data?.items.map((m) => (
          <Card key={m.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <UserCog size={16} className="muted" />
                  <strong style={{ color: 'var(--text-strong)' }}>{JENIS_LABEL[m.jenis]}</strong>
                  <StatusPill status={m.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {m.mahasiswa.nim} — {m.mahasiswa.nama} · {m.mahasiswa.prodi.kode} · Angkatan {m.mahasiswa.angkatan}
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                  Diajukan {formatTanggalWaktu(m.createdAt)} · {labelStatus(m.statusSebelum)} → {labelStatus(m.statusSesudah)}
                  {m.jenis === 'pindah_prodi' && m.prodiTujuan && ` · ke ${m.prodiTujuan.nama} (${m.prodiTujuan.kode})`}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Alasan mahasiswa:</div>
                  <p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{m.alasan}</p>
                </div>
                {m.fileUrl && (
                  <a href={safeHref(m.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>
                    Lihat dokumen pendukung
                  </a>
                )}
                {m.catatanAkademik && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan akademik:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{m.catatanAkademik}</p>
                  </div>
                )}
              </div>
              {m.status === 'diajukan' && (
                <div className="row" style={{ gap: 4 }}>
                  <Button size="sm" variant="primary" leftIcon={<Check size={14} />} onClick={() => setConfirm({ item: m, aksi: 'disetujui' })}>
                    Setujui
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => setConfirm({ item: m, aksi: 'ditolak' })}>
                    Tolak
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {confirm && (
        <ResponseModal
          item={confirm.item}
          aksi={confirm.aksi}
          onClose={() => setConfirm(null)}
          onSubmit={async (catatan) => {
            setActErr(null);
            try {
              await actions.respond.mutateAsync({ id: confirm.item.id, status: confirm.aksi, catatan: catatan || null });
              setConfirm(null);
            } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
          }}
          pending={actions.respond.isPending}
        />
      )}
    </div>
  );
}

function ResponseModal({ item, aksi, onClose, onSubmit, pending }: {
  item: MutasiAdmin;
  aksi: 'disetujui' | 'ditolak';
  onClose: () => void;
  onSubmit: (catatan: string) => Promise<void>;
  pending: boolean;
}) {
  const [catatan, setCatatan] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const isApprove = aksi === 'disetujui';

  const submit = async () => {
    setErr(null);
    if (!isApprove && catatan.trim().length < 5) {
      setErr('Catatan penolakan wajib diisi (minimal 5 karakter)'); return;
    }
    try { await onSubmit(catatan); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`${isApprove ? 'Setujui' : 'Tolak'} mutasi — ${item.mahasiswa.nim}`} width={620}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{item.mahasiswa.nim} — {item.mahasiswa.nama}</div>
          <div style={{ marginTop: 4 }}>
            <strong>{labelStatus(item.statusSebelum)} → {labelStatus(item.statusSesudah)}</strong>
            {item.jenis === 'pindah_prodi' && item.prodiTujuan && (
              <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                Pindah ke {item.prodiTujuan.nama} ({item.prodiTujuan.kode})
              </div>
            )}
          </div>
          {isApprove && (
            <Alert variant="warning" title="Perhatian" style={{ marginTop: 8 }}>
              Status mahasiswa akan otomatis berubah saat disetujui
              {item.jenis === 'pindah_prodi' && ', termasuk update prodi mahasiswa'}.
            </Alert>
          )}
        </Card>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>
            {isApprove ? 'Catatan (opsional)' : 'Alasan penolakan'}
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={4}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={pending} onClick={submit}>
            {pending ? 'Memproses…' : isApprove ? 'Setujui' : 'Tolak'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function labelStatus(s: string): string {
  switch (s) {
    case 'aktif': return 'Aktif';
    case 'cuti': return 'Cuti';
    case 'lulus': return 'Lulus';
    case 'drop_out': return 'Drop out';
    case 'mengundurkan_diri': return 'Mengundurkan diri';
    default: return s;
  }
}
