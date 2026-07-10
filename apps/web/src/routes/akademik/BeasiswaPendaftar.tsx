import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Select } from '@/ds';
import { ChevronLeft, Pencil, ExternalLink } from 'lucide-react';
import {
  useAdminPendaftarBeasiswa, useAdminPendaftarBeasiswaActions, useAdminBeasiswa,
  type AdminPendaftarBeasiswaItem,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS = ['diajukan', 'dalam_seleksi', 'diterima', 'ditolak', 'batal'] as const;

export function AdminBeasiswaPendaftar() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useAdminPendaftarBeasiswa(id, status);
  const masterList = useAdminBeasiswa();
  const beasiswa = masterList.data?.items.find((b) => b.id === id);
  const [editing, setEditing] = useState<AdminPendaftarBeasiswaItem | null>(null);

  return (
    <div className="stack">
      <Link
        to="/akademik/beasiswa"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar beasiswa
      </Link>

      <PageHead
        eyebrow="PENDAFTAR"
        title={beasiswa?.nama ?? 'Pendaftar Beasiswa'}
        subtitle={beasiswa ? `${beasiswa.penyelenggara} · ${data?.items.length ?? 0} pendaftar` : undefined}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Filter status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada pendaftar">Sesuaikan filter atau belum ada yang daftar.</Alert>
      )}

      <div className="stack">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{p.mahasiswa.nama}</strong>
                  <span className="muted mono">{p.mahasiswa.nim}</span>
                  <StatusPill status={p.status} />
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                  {p.mahasiswa.prodi.kode} · Angkatan {p.mahasiswa.angkatan} · IPK saat daftar <span className="mono">{p.ipkSaatDaftar.toFixed(2)}</span> · Daftar {formatTanggal(p.createdAt)}
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary className="muted" style={{ fontSize: 'var(--text-xs)', cursor: 'pointer' }}>Lihat motivasi</summary>
                  <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{p.motivasi}</p>
                </details>
                {p.linkDokumen && (
                  <a href={p.linkDokumen} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-link)', marginTop: 4 }}>
                    Dokumen pendukung <ExternalLink size={10} />
                  </a>
                )}
                {p.catatan && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Catatan:</strong> {p.catatan}
                  </div>
                )}
              </div>
              <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(p)}>Validasi</Button>
            </div>
          </Card>
        ))}
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditModal({ item, onClose }: { item: AdminPendaftarBeasiswaItem; onClose: () => void }) {
  const { update } = useAdminPendaftarBeasiswaActions();
  const [form, setForm] = useState({ status: item.status, catatan: item.catatan ?? '' });
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    try {
      await update.mutateAsync({ id: item.id, patch: { status: form.status, catatan: form.catatan || null } });
      onClose();
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Validasi — ${item.mahasiswa.nama}`} width={560}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AdminPendaftarBeasiswaItem['status'] })}>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>

        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Catatan untuk mahasiswa</label>
          <textarea
            value={form.catatan}
            onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            rows={4}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={update.isPending} onClick={save}>{update.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
