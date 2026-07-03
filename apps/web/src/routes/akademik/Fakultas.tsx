import { useState } from 'react';
import { Alert, Button, Input } from '@/ds';
import { Plus, Pencil, Trash2, FileUp } from 'lucide-react';
import { useFakultas, useFakultasActions, type Fakultas, type FakultasInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { ApiError } from '@/lib/api';

export function AdminFakultas() {
  const { data, isLoading, error } = useFakultas();
  const actions = useFakultasActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; f: Fakultas } | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const onDelete = async (f: Fakultas) => {
    if (!confirm(`Hapus fakultas ${f.kode} — ${f.nama}?`)) return;
    try { await actions.remove.mutateAsync(f.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal menghapus'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA"
        title="Fakultas"
        subtitle="Kelola daftar fakultas (induk Program Studi)."
        right={
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" leftIcon={<FileUp size={16} />} onClick={() => setImportOpen(true)}>
              Impor Excel
            </Button>
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>
              Tambah Fakultas
            </Button>
          </div>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode</th><th>Nama Fakultas</th><th className="num">Jumlah Prodi</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={4} className="muted center">Belum ada fakultas.</td></tr>}
            {data?.items.map((f) => (
              <tr key={f.id}>
                <td className="mono">{f.kode}</td>
                <td>{f.nama}</td>
                <td className="num">{f._count?.prodi ?? 0}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', f })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(f)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Fakultas via Excel"
        expectedHeaders={['kode', 'nama']}
        templateFilename="template-fakultas.xlsx"
        keyHeader="Kode"
        notes={<><code>kode</code> singkat & unik (mis. FTI, FEB); <code>nama</code> lengkap sesuai statuta. Fakultas jadi induk Program Studi.</>}
        sampleRows={[
          { kode: 'FTI', nama: 'Fakultas Teknologi Informasi' },
          { kode: 'FEB', nama: 'Fakultas Ekonomi & Bisnis' },
        ]}
        importMutation={actions.importCsv}
      />

      {modal && (
        <FakultasModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.f : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            if (id) await actions.update.mutateAsync({ id, patch: input });
            else await actions.create.mutateAsync(input as FakultasInput);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function FakultasModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: Fakultas;
  onClose: () => void;
  onSubmit: (input: Partial<FakultasInput>, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<FakultasInput>>({
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
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
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Fakultas' : `Edit ${initial!.kode}`} width={480}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Input label="Kode" required value={form.kode ?? ''} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} placeholder="FE" />
        <Input label="Nama Fakultas" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="Fakultas Ekonomi" />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
