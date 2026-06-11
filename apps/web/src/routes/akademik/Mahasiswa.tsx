import { useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { useAdminMahasiswa, useMahasiswaActions, useProdi, useAdminDosen, type AdminMahasiswa, type CreateMahasiswaInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';

const STATUS = ['aktif', 'cuti', 'lulus', 'drop_out', 'mengundurkan_diri'];

export function AdminMahasiswaPage() {
  const [filters, setFilters] = useState({ q: '', prodiId: '', angkatan: '', status: '' });
  const { data, isLoading, error } = useAdminMahasiswa({
    q: filters.q, prodiId: filters.prodiId, status: filters.status,
    angkatan: filters.angkatan ? Number(filters.angkatan) : undefined,
  });
  const prodi = useProdi();
  const actions = useMahasiswaActions();

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; mhs: AdminMahasiswa } | null>(null);

  const onDelete = async (m: AdminMahasiswa) => {
    if (!confirm(`Hapus mahasiswa ${m.nim} — ${m.nama}? Akun & semua data terkait akan dihapus.`)) return;
    try { await actions.remove.mutateAsync(m.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal menghapus'); }
  };

  const onResetPw = async (m: AdminMahasiswa) => {
    if (!confirm(`Reset password mahasiswa ${m.nim}? Password baru akan diset = NIM.`)) return;
    try {
      const r: any = await actions.resetPassword.mutateAsync({ id: m.id });
      alert(`Password direset. ${r.password ?? ''}`);
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA"
        title="Mahasiswa"
        subtitle="Kelola data mahasiswa & akun login."
        right={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>Tambah Mahasiswa</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Cari NIM/Nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} placeholder="cari…" />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
        <div style={{ width: 130 }}>
          <Input label="Angkatan" type="number" value={filters.angkatan} onChange={(e) => setFilters({ ...filters, angkatan: (e.target as HTMLInputElement).value })} />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th><th>Nama</th><th>Email</th><th>Prodi</th>
              <th className="center">Angkatan</th><th>Status</th><th>DPA</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Tidak ada data.</td></tr>}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.nim}</td>
                <td>{m.nama}</td>
                <td className="muted">{m.user.email}</td>
                <td>{m.prodi.nama}</td>
                <td className="center mono">{m.angkatan}</td>
                <td><StatusPill status={m.status} /></td>
                <td>{m.dpa?.nama ?? <span className="muted">—</span>}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', mhs: m })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<KeyRound size={12} />} onClick={() => onResetPw(m)}>Reset PW</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(m)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <MahasiswaModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.mhs : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            if (id) await actions.update.mutateAsync({ id, patch: input });
            else await actions.create.mutateAsync(input as CreateMahasiswaInput);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function MahasiswaModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: AdminMahasiswa;
  onClose: () => void;
  onSubmit: (input: Partial<CreateMahasiswaInput>, id?: string) => Promise<void>;
}) {
  const prodi = useProdi();
  const dosen = useAdminDosen();
  const [form, setForm] = useState<Partial<CreateMahasiswaInput>>({
    nim: initial?.nim ?? '',
    nama: initial?.nama ?? '',
    email: initial?.user.email ?? '',
    jenisKelamin: (initial?.jenisKelamin ?? 'L') as 'L' | 'P',
    angkatan: initial?.angkatan ?? new Date().getFullYear(),
    prodiId: prodi.data?.items.find((p) => p.nama === initial?.prodi.nama)?.id ?? '',
    dpaId: initial?.dpa?.id,
    status: initial?.status ?? 'aktif',
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
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Mahasiswa' : `Edit ${initial!.nim}`} width={640}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="NIM" required value={form.nim ?? ''} onChange={(e) => setForm({ ...form, nim: (e.target as HTMLInputElement).value })} disabled={mode === 'edit'} />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama lengkap" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Input label="Email" type="email" required value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Jenis kelamin" value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: (e.target as HTMLSelectElement).value as 'L' | 'P' })}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </Select>
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Angkatan" type="number" min={1990} max={2100} required value={String(form.angkatan ?? '')} onChange={(e) => setForm({ ...form, angkatan: Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 2 }}>
            <Select label="Program Studi" required value={form.prodiId ?? ''} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value })}>
              <option value="">— pilih prodi —</option>
              {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </Select>
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Select label="DPA (opsional)" value={form.dpaId ?? ''} onChange={(e) => setForm({ ...form, dpaId: (e.target as HTMLSelectElement).value || undefined })}>
              <option value="">— tanpa DPA —</option>
              {dosen.data?.items.filter((d) => d.isDpa).map((d) => (
                <option key={d.id} value={d.id}>{[d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ')}</option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Status" value={form.status ?? 'aktif'} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value })}>
              {STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </Select>
          </div>
        </div>

        {mode === 'create' && (
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
            Password awal otomatis = NIM. Mahasiswa diharapkan menggantinya setelah login pertama.
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
