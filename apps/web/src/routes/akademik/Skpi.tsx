import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Check, X, FileBadge, Award } from 'lucide-react';
import {
  useAkademikSertifikasi, useAkademikPrestasi, useAkademikSkpiActions,
  type StatusVerifikasi, type SertifikasiAdmin, type PrestasiAdmin,
} from '@/lib/queries-skpi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggal, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_OPTS: Array<{ v: StatusVerifikasi | ''; label: string }> = [
  { v: 'diajukan', label: 'Menunggu verifikasi' },
  { v: 'diverifikasi', label: 'Sudah diverifikasi' },
  { v: 'ditolak', label: 'Ditolak' },
  { v: 'draft', label: 'Draft mahasiswa' },
  { v: '', label: 'Semua' },
];

export function AkademikSkpi() {
  const [tab, setTab] = useState<'sertifikat' | 'prestasi'>('sertifikat');

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Verifikasi SKPI"
        subtitle="Tinjau sertifikat & prestasi mahasiswa yang diajukan untuk Surat Keterangan Pendamping Ijazah."
      />

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Button size="sm" variant={tab === 'sertifikat' ? 'primary' : 'ghost'} leftIcon={<FileBadge size={14} />} onClick={() => setTab('sertifikat')}>
          Sertifikat
        </Button>
        <Button size="sm" variant={tab === 'prestasi' ? 'primary' : 'ghost'} leftIcon={<Award size={14} />} onClick={() => setTab('prestasi')}>
          Prestasi
        </Button>
      </div>

      {tab === 'sertifikat' ? <SertifikatVerif /> : <PrestasiVerif />}
    </div>
  );
}

function SertifikatVerif() {
  const [status, setStatus] = useState<StatusVerifikasi | ''>('diajukan');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useAkademikSertifikasi({ status: status || undefined, q: q || undefined });
  const actions = useAkademikSkpiActions();
  const [reject, setReject] = useState<SertifikasiAdmin | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const approve = async (s: SertifikasiAdmin) => {
    setActErr(null);
    try { await actions.verifSertifikat.mutateAsync({ id: s.id, status: 'diverifikasi' }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusVerifikasi | '')}>
            {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="nama sertifikat / NIM / nama mahasiswa" />
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada item">Tidak ada sertifikat pada filter ini.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <FileBadge size={16} className="muted" />
                  <strong>{s.nama}</strong>
                  <StatusPill status={s.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {s.mahasiswa.nim} — {s.mahasiswa.nama} · {s.mahasiswa.prodi.kode}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>
                  {s.penerbit} · {formatTanggal(s.tanggalTerbit)}
                  {s.skor && ` · Skor: ${s.skor}`}
                  {s.nomorSertifikat && ` · No. ${s.nomorSertifikat}`}
                </div>
                {s.fileUrl && (
                  <a href={safeHref(s.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>
                    Lihat bukti
                  </a>
                )}
                {s.catatanVerifikator && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan sebelumnya:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{s.catatanVerifikator}</p>
                  </div>
                )}
              </div>
              {s.status === 'diajukan' && (
                <div className="row" style={{ gap: 4 }}>
                  <Button size="sm" variant="primary" leftIcon={<Check size={14} />} onClick={() => approve(s)}>Verifikasi</Button>
                  <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => setReject(s)}>Tolak</Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {reject && (
        <RejectModal
          item={{ id: reject.id, label: reject.nama, mahasiswa: `${reject.mahasiswa.nim} — ${reject.mahasiswa.nama}` }}
          onClose={() => setReject(null)}
          onSubmit={async (catatan) => {
            await actions.verifSertifikat.mutateAsync({ id: reject.id, status: 'ditolak', catatan });
          }}
          pending={actions.verifSertifikat.isPending}
        />
      )}
    </>
  );
}

function PrestasiVerif() {
  const [status, setStatus] = useState<StatusVerifikasi | ''>('diajukan');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useAkademikPrestasi({ status: status || undefined, q: q || undefined });
  const actions = useAkademikSkpiActions();
  const [reject, setReject] = useState<PrestasiAdmin | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const approve = async (p: PrestasiAdmin) => {
    setActErr(null);
    try { await actions.verifPrestasi.mutateAsync({ id: p.id, status: 'diverifikasi' }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusVerifikasi | '')}>
            {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="nama / NIM / nama mahasiswa" />
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada item">Tidak ada prestasi pada filter ini.</Alert>
      )}

      <div className="stack">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={16} className="muted" />
                  <strong>{p.nama}</strong>
                  <StatusPill status={p.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {p.mahasiswa.nim} — {p.mahasiswa.nama} · {p.mahasiswa.prodi.kode}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>
                  {p.penyelenggara ?? '—'} · {formatTanggal(p.tanggal)}
                  {p.peran && ` · Peran: ${p.peran}`}
                </div>
                {p.deskripsi && <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{p.deskripsi}</p>}
                {p.fileUrl && <a href={safeHref(p.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>Lihat bukti</a>}
                {p.catatanVerifikator && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan sebelumnya:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{p.catatanVerifikator}</p>
                  </div>
                )}
              </div>
              {p.status === 'diajukan' && (
                <div className="row" style={{ gap: 4 }}>
                  <Button size="sm" variant="primary" leftIcon={<Check size={14} />} onClick={() => approve(p)}>Verifikasi</Button>
                  <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => setReject(p)}>Tolak</Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {reject && (
        <RejectModal
          item={{ id: reject.id, label: reject.nama, mahasiswa: `${reject.mahasiswa.nim} — ${reject.mahasiswa.nama}` }}
          onClose={() => setReject(null)}
          onSubmit={async (catatan) => {
            await actions.verifPrestasi.mutateAsync({ id: reject.id, status: 'ditolak', catatan });
          }}
          pending={actions.verifPrestasi.isPending}
        />
      )}
    </>
  );
}

function RejectModal({ item, onClose, onSubmit, pending }: {
  item: { id: string; label: string; mahasiswa: string };
  onClose: () => void;
  onSubmit: (catatan: string) => Promise<void>;
  pending: boolean;
}) {
  const [catatan, setCatatan] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (catatan.trim().length < 5) { setErr('Catatan penolakan wajib diisi (minimal 5 karakter)'); return; }
    try { await onSubmit(catatan); onClose(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Tolak — ${item.label}`} width={560}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{item.mahasiswa}</div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Alasan penolakan</label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={4}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            placeholder="mis. Skor tidak sesuai bukti, dokumen kabur, dst."
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={pending} onClick={submit}>Tolak</Button>
        </div>
      </div>
    </Modal>
  );
}
