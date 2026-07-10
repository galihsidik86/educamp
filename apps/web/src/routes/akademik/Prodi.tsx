import { useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, FileUp } from 'lucide-react';
import { useProdi, useProdiActions, useFakultas, type Prodi, type ProdiInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { TableSkeletonRows } from '@/components/Skeleton';
import { formatRupiah } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENJANG: ProdiInput['jenjang'][] = ['d3', 'd4', 's1', 's2', 's3', 'profesi'];

export function AdminProdi() {
  const { data, isLoading, error } = useProdi();
  const actions = useProdiActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; p: Prodi } | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const onDelete = async (p: Prodi) => {
    if (!confirm(`Hapus prodi ${p.kode} — ${p.nama}?`)) return;
    try { await actions.remove.mutateAsync(p.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal menghapus'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA"
        title="Program Studi"
        subtitle="Kelola prodi, fakultas, dan tarif default (UKT semester & uang pangkal)."
        right={
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" leftIcon={<FileUp size={16} />} onClick={() => setImportOpen(true)}>
              Impor Excel
            </Button>
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>
              Tambah Prodi
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
              <th>Kode</th><th>Nama Prodi</th><th>Jenjang</th><th>Fakultas</th>
              <th className="num">Tarif UKT default</th><th className="num">Uang Pangkal</th>
              <th className="num">Mhs</th><th className="num">Dosen</th><th className="num">MK</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows cols={10} rows={5} />}
            {data?.items.length === 0 && <tr><td colSpan={10} className="muted center">Belum ada prodi.</td></tr>}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.kode}</td>
                <td>{p.nama}</td>
                <td style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{p.jenjang}</td>
                <td>{p.fakultas.nama}</td>
                <td className="num mono">{p.tarifSppDefault != null ? formatRupiah(Number(p.tarifSppDefault)) : <span className="muted">—</span>}</td>
                <td className="num mono">{p.tarifUangPangkal != null ? formatRupiah(Number(p.tarifUangPangkal)) : <span className="muted">—</span>}</td>
                <td className="num">{p._count.mahasiswa}</td>
                <td className="num">{p._count.dosen}</td>
                <td className="num">{p._count.mataKuliah}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', p })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(p)}>Hapus</Button>
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
        title="Import Prodi via Excel"
        expectedHeaders={['kode', 'nama', 'jenjang', 'fakultasKode']}
        optionalHeaders={['tarifSppDefault', 'tarifUangPangkal']}
        templateFilename="template-prodi.xlsx"
        keyHeader="Kode"
        notes={<><code>jenjang</code>: d3/d4/s1/s2/s3/profesi. <code>fakultasKode</code> harus sudah terdaftar. Tarif dalam Rupiah (angka saja, tanpa titik/koma).</>}
        sampleRows={[
          { kode: '55201', nama: 'Teknik Informatika', jenjang: 's1', fakultasKode: 'FTI', tarifSppDefault: 5000000 },
          { kode: '57201', nama: 'Sistem Informasi', jenjang: 's1', fakultasKode: 'FTI', tarifSppDefault: 5000000, tarifUangPangkal: 10000000 },
        ]}
        importMutation={actions.importCsv}
      />

      {modal && (
        <ProdiModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.p : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            try {
              if (id) await actions.update.mutateAsync({ id, patch: input });
              else await actions.create.mutateAsync(input as ProdiInput);
              setModal(null);
            } catch (e) {
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

function ProdiModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: Prodi;
  onClose: () => void;
  onSubmit: (input: Partial<ProdiInput>, id?: string) => Promise<void>;
}) {
  const fakultas = useFakultas();
  const [form, setForm] = useState<Partial<ProdiInput>>({
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
    jenjang: (initial?.jenjang as ProdiInput['jenjang']) ?? 's1',
    fakultasId: fakultas.data?.items.find((f) => f.nama === initial?.fakultas.nama)?.id ?? '',
    tarifSppDefault: initial?.tarifSppDefault != null ? Number(initial.tarifSppDefault) : null,
    tarifUangPangkal: initial?.tarifUangPangkal != null ? Number(initial.tarifUangPangkal) : null,
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
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Prodi' : `Edit ${initial!.kode}`} width={620}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Kode" required value={form.kode ?? ''} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} placeholder="55201" />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama Prodi" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="Sistem Informasi" />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Jenjang" value={form.jenjang ?? 's1'} onChange={(e) => setForm({ ...form, jenjang: (e.target as HTMLSelectElement).value as ProdiInput['jenjang'] })}>
              {JENJANG.map((j) => <option key={j} value={j}>{j.toUpperCase()}</option>)}
            </Select>
          </div>
          <div style={{ flex: 2 }}>
            <Select label="Fakultas" required value={form.fakultasId ?? ''} onChange={(e) => setForm({ ...form, fakultasId: (e.target as HTMLSelectElement).value })}>
              <option value="">— pilih fakultas —</option>
              {fakultas.data?.items.map((f) => <option key={f.id} value={f.id}>{f.nama}</option>)}
            </Select>
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Tarif UKT default / semester (Rp)"
              type="number"
              min={0}
              value={form.tarifSppDefault != null ? String(form.tarifSppDefault) : ''}
              onChange={(e) => setForm({ ...form, tarifSppDefault: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value) })}
              placeholder="4500000"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Uang pangkal (Rp)"
              type="number"
              min={0}
              value={form.tarifUangPangkal != null ? String(form.tarifUangPangkal) : ''}
              onChange={(e) => setForm({ ...form, tarifUangPangkal: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value) })}
              placeholder="5000000"
            />
          </div>
        </div>

        <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
          Tarif UKT default dipakai sebagai fallback bila mahasiswa belum di-assign Kategori UKT. Uang pangkal otomatis ditagih sekali saat mahasiswa baru dibuat.
        </p>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
