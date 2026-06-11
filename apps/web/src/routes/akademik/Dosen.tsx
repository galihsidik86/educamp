import { useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { useAdminDosen, useDosenActions, useProdi, type AdminDosen, type CreateDosenInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import { formatStatus } from '@/lib/format';

const JABATAN = ['', 'asisten_ahli', 'lektor', 'lektor_kepala', 'guru_besar', 'tenaga_pengajar'];

export function AdminDosenPage() {
  const [filters, setFilters] = useState({ q: '', prodiId: '' });
  const { data, isLoading, error } = useAdminDosen(filters);
  const prodi = useProdi();
  const actions = useDosenActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; dosen: AdminDosen } | null>(null);

  const onDelete = async (d: AdminDosen) => {
    if (!confirm(`Hapus dosen ${d.nidn} — ${d.nama}? Akun & semua data terkait akan dihapus.`)) return;
    try { await actions.remove.mutateAsync(d.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onResetPw = async (d: AdminDosen) => {
    if (!confirm(`Reset password dosen ${d.nidn}? Password baru akan diset = NIDN.`)) return;
    try {
      const r: any = await actions.resetPassword.mutateAsync({ id: d.id });
      alert(`Password direset. ${r.password ?? ''}`);
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA"
        title="Dosen"
        subtitle="Kelola data dosen & akun login."
        right={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>Tambah Dosen</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Cari NIDN/Nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIDN</th><th>Nama</th><th>Email</th><th>Prodi</th>
              <th>Jabatan Fungsional</th>
              <th className="center">Kelas</th><th className="center">Bimbingan</th>
              <th className="center">DPA</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.map((d) => (
              <tr key={d.id}>
                <td className="mono">{d.nidn}</td>
                <td>{[d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ')}</td>
                <td className="muted">{d.user.email}</td>
                <td>{d.prodi.nama}</td>
                <td>{d.jabatanFungsional ? formatStatus(d.jabatanFungsional) : '—'}</td>
                <td className="center mono">{d._count.kelas}</td>
                <td className="center mono">{d._count.mahasiswaBimbingan}</td>
                <td className="center">{d.isDpa ? '✓' : '—'}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', dosen: d })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<KeyRound size={12} />} onClick={() => onResetPw(d)}>Reset PW</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(d)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <DosenModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.dosen : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            if (id) await actions.update.mutateAsync({ id, patch: input });
            else await actions.create.mutateAsync(input as CreateDosenInput);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function DosenModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit'; initial?: AdminDosen;
  onClose: () => void;
  onSubmit: (input: Partial<CreateDosenInput>, id?: string) => Promise<void>;
}) {
  const prodi = useProdi();
  const [form, setForm] = useState<Partial<CreateDosenInput>>({
    nidn: initial?.nidn ?? '',
    nama: initial?.nama ?? '',
    email: initial?.user.email ?? '',
    gelarDepan: initial?.gelarDepan ?? '',
    gelarBelakang: initial?.gelarBelakang ?? '',
    prodiId: prodi.data?.items.find((p) => p.nama === initial?.prodi.nama)?.id ?? '',
    jabatanFungsional: initial?.jabatanFungsional ?? undefined,
    jabatanStruktural: initial?.jabatanStruktural ?? '',
    isDpa: initial?.isDpa ?? false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await onSubmit(form, mode === 'edit' ? initial!.id : undefined); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Dosen' : `Edit ${initial!.nidn}`} width={640}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="NIDN" required value={form.nidn ?? ''} onChange={(e) => setForm({ ...form, nidn: (e.target as HTMLInputElement).value })} disabled={mode === 'edit'} />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Gelar depan" value={form.gelarDepan ?? ''} onChange={(e) => setForm({ ...form, gelarDepan: (e.target as HTMLInputElement).value })} placeholder="Dr." />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Gelar belakang" value={form.gelarBelakang ?? ''} onChange={(e) => setForm({ ...form, gelarBelakang: (e.target as HTMLInputElement).value })} placeholder="M.Kom." />
          </div>
        </div>

        <Input label="Email" type="email" required value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })} />

        <Select label="Program Studi" required value={form.prodiId ?? ''} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value })}>
          <option value="">— pilih prodi —</option>
          {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Jabatan fungsional" value={form.jabatanFungsional ?? ''} onChange={(e) => setForm({ ...form, jabatanFungsional: (e.target as HTMLSelectElement).value || undefined })}>
              {JABATAN.map((j) => <option key={j} value={j}>{j ? formatStatus(j) : '— tidak ada —'}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jabatan struktural" value={form.jabatanStruktural ?? ''} onChange={(e) => setForm({ ...form, jabatanStruktural: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <label className="row" style={{ gap: 8, padding: 'var(--space-2) 0' }}>
          <input type="checkbox" checked={!!form.isDpa} onChange={(e) => setForm({ ...form, isDpa: e.target.checked })} />
          <span>Aktifkan sebagai DPA (Dosen Pembimbing Akademik)</span>
        </label>

        {mode === 'create' && (
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
            Password awal otomatis = NIDN.
          </p>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
