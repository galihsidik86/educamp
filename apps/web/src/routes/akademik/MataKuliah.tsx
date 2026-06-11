import { useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useMataKuliah, useMkActions, useProdi, type Mk, type MkInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import { formatStatus } from '@/lib/format';

const JENIS = ['wajib_universitas', 'wajib_prodi', 'pilihan'] as const;

export function AdminMataKuliah() {
  const [filters, setFilters] = useState({ q: '', prodiId: '' });
  const { data, isLoading, error } = useMataKuliah(filters);
  const prodi = useProdi();
  const actions = useMkActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; mk: Mk } | null>(null);

  const onDelete = async (m: Mk) => {
    if (!confirm(`Hapus MK ${m.kode} — ${m.nama}?`)) return;
    try { await actions.remove.mutateAsync(m.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="KURIKULUM"
        title="Mata Kuliah"
        subtitle="Daftar MK & jenisnya per prodi."
        right={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>Tambah MK</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Cari" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} placeholder="kode/nama…" />
        </div>
        <div style={{ minWidth: 200 }}>
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
              <th>Kode</th><th>Nama MK</th><th>Prodi</th><th>Jenis</th>
              <th className="num">SKS</th><th className="num">Teori</th><th className="num">Praktik</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Tidak ada data.</td></tr>}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.kode}</td>
                <td>{m.nama}{m.namaInggris && <div className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{m.namaInggris}</div>}</td>
                <td>{m.prodi.nama}</td>
                <td>{formatStatus(m.jenis)}</td>
                <td className="num">{m.sks}</td>
                <td className="num">{m.sksTeori}</td>
                <td className="num">{m.sksPraktik}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', mk: m })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(m)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <MkModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.mk : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            if (id) await actions.update.mutateAsync({ id, patch: input });
            else await actions.create.mutateAsync(input as MkInput);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function MkModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit'; initial?: Mk;
  onClose: () => void;
  onSubmit: (input: Partial<MkInput>, id?: string) => Promise<void>;
}) {
  const prodi = useProdi();
  const initialProdiId = prodi.data?.items.find((p) => p.nama === initial?.prodi.nama)?.id ?? '';
  const [form, setForm] = useState<Partial<MkInput>>({
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
    namaInggris: initial?.namaInggris ?? '',
    sks: initial?.sks ?? 3,
    sksTeori: initial?.sksTeori ?? 3,
    sksPraktik: initial?.sksPraktik ?? 0,
    jenis: (initial?.jenis as any) ?? 'wajib_prodi',
    prodiId: initialProdiId,
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
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Mata Kuliah' : `Edit ${initial!.kode}`} width={600}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Kode" required value={form.kode ?? ''} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} disabled={mode === 'edit'} placeholder="IF-3101" />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama MK" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <Input label="Nama (Inggris)" value={form.namaInggris ?? ''} onChange={(e) => setForm({ ...form, namaInggris: (e.target as HTMLInputElement).value })} />

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="SKS" type="number" min={1} max={10} required value={String(form.sks ?? 3)} onChange={(e) => setForm({ ...form, sks: Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="SKS Teori" type="number" min={0} max={10} value={String(form.sksTeori ?? 0)} onChange={(e) => setForm({ ...form, sksTeori: Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="SKS Praktik" type="number" min={0} max={10} value={String(form.sksPraktik ?? 0)} onChange={(e) => setForm({ ...form, sksPraktik: Number((e.target as HTMLInputElement).value) })} />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Jenis" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as MkInput['jenis'] })}>
              {JENIS.map((j) => <option key={j} value={j}>{formatStatus(j)}</option>)}
            </Select>
          </div>
          <div style={{ flex: 2 }}>
            <Select label="Prodi" required value={form.prodiId ?? ''} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value })}>
              <option value="">— pilih prodi —</option>
              {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </Select>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
