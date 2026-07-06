import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Check, X, Trash2, FileText } from 'lucide-react';
import { useAdminHeregistrasi, useAdminHeregistrasiActions } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AdminHeregistrasi() {
  const [filters, setFilters] = useState({ status: 'diajukan', q: '' });
  const { data, isLoading, error } = useAdminHeregistrasi(filters);
  const actions = useAdminHeregistrasiActions();
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const setujui = async (id: string) => {
    if (!confirm('Setujui heregistrasi ini? Status mahasiswa akan diperbarui.')) return;
    setActErr(null);
    try { await actions.verifikasi.mutateAsync({ id, status: 'disetujui' }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Hapus pengajuan heregistrasi ini?')) return;
    try { await actions.remove.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="VERIFIKASI"
        title="Heregistrasi & Cuti Akademik"
        subtitle="Tinjau pengajuan heregistrasi & cuti akademik mahasiswa. Persetujuan otomatis menyesuaikan status mahasiswa."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            <option value="diajukan">Diajukan</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari NIM/Nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} placeholder="cari…" />
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && <p className="muted center">Tidak ada pengajuan pada filter ini.</p>}

      <div className="stack">
        {data?.items.map((h) => (
          <Card key={h.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{h.mahasiswa.nim} · {h.mahasiswa.nama}</strong>
                  <Badge variant={h.jenis === 'cuti' ? 'warning' : 'success'}>
                    {h.jenis === 'cuti' ? 'Pengajuan Cuti' : 'Aktif Kuliah'}
                  </Badge>
                  <StatusPill status={h.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {h.mahasiswa.prodi.nama} · {h.semester.jenis} {h.semester.tahunAjaran.kode} · Diajukan {formatTanggalWaktu(h.createdAt)}
                </div>
                {h.alasan && <p style={{ marginTop: 'var(--space-2)' }}><strong>Alasan:</strong> {h.alasan}</p>}
                {safeHref(h.dokumenUrl) && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <a href={safeHref(h.dokumenUrl)!} target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', fontSize: 'var(--text-sm)' }}>
                      <FileText size={12} style={{ verticalAlign: 'middle' }} /> Dokumen pendukung
                    </a>
                  </div>
                )}
                {h.catatanAkademik && <p className="muted" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}><strong>Catatan akademik:</strong> {h.catatanAkademik}</p>}
              </div>
              {h.status === 'diajukan' && (
                <div className="row" style={{ gap: 6 }}>
                  <Button size="sm" variant="primary" leftIcon={<Check size={12} />} onClick={() => setujui(h.id)} disabled={actions.verifikasi.isPending}>Setujui</Button>
                  <Button size="sm" variant="ghost" leftIcon={<X size={12} />} onClick={() => setRejectFor(h.id)}>Tolak</Button>
                </div>
              )}
              {h.status !== 'disetujui' && (
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(h.id)}>Hapus</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {rejectFor && (
        <RejectModal
          onClose={() => setRejectFor(null)}
          onSubmit={async (catatan) => {
            try {
              await actions.verifikasi.mutateAsync({ id: rejectFor, status: 'ditolak', catatan });
              setRejectFor(null);
            } catch (e) {
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

function RejectModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (catatan: string) => Promise<void> }) {
  const [catatan, setCatatan] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catatan.trim().length < 5) { setErr('Catatan minimal 5 karakter'); return; }
    setErr(null); setBusy(true);
    try { await onSubmit(catatan); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Tolak Heregistrasi" width={520}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div>
          <label className="tz-field__label">Catatan penolakan (wajib)</label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            required
            placeholder="Mis. dokumen tidak lengkap, alasan kurang jelas, dll."
            className="tz-input"
            style={{ width: '100%', minHeight: 100, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Tolak'}</Button>
        </div>
      </form>
    </Modal>
  );
}
