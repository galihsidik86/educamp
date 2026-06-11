import { useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, KeyRound, Upload } from 'lucide-react';
import { useAdminMahasiswa, useMahasiswaActions, useProdi, useAdminDosen, type AdminMahasiswa, type CreateMahasiswaInput, type ImportResult } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import { parseCsv } from '@/lib/csv';

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
  const [importOpen, setImportOpen] = useState(false);

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
        right={
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" leftIcon={<Upload size={16} />} onClick={() => setImportOpen(true)}>Import CSV</Button>
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>Tambah Mahasiswa</Button>
          </div>
        }
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

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importMutation={actions.importCsv}
      />
    </div>
  );
}

const EXPECTED_HEADERS = ['nim', 'nama', 'email', 'jenisKelamin', 'angkatan', 'prodiKode'] as const;
const OPTIONAL_HEADERS = ['dpaNidn', 'tempatLahir', 'tanggalLahir', 'alamat', 'telepon'] as const;

function ImportModal({ open, onClose, importMutation }: {
  open: boolean;
  onClose: () => void;
  importMutation: ReturnType<typeof useMahasiswaActions>['importCsv'];
}) {
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!open) return null;

  const reset = () => { setRows([]); setHeaders([]); setParseError(null); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const onFile = async (file: File | null) => {
    setParseError(null); setResult(null);
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = parseCsv(text);
      const missing = EXPECTED_HEADERS.filter((h) => !parsed.headers.includes(h));
      if (missing.length > 0) {
        setParseError(`Header CSV kurang: ${missing.join(', ')}. Wajib: ${EXPECTED_HEADERS.join(', ')}.`);
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
    } catch (e: any) {
      setParseError(`Gagal parse CSV: ${e?.message ?? 'unknown'}`);
    }
  };

  const submit = async () => {
    setResult(null);
    try {
      const r = await importMutation.mutateAsync(rows);
      setResult(r);
    } catch (e) {
      setParseError(e instanceof ApiError ? e.message : 'Gagal mengimpor');
    }
  };

  return (
    <Modal open onClose={handleClose} title="Import mahasiswa via CSV" width={760}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <Alert variant="info" title="Format CSV">
          Header wajib: <code>{EXPECTED_HEADERS.join(', ')}</code>.<br />
          Header opsional: <code>{OPTIONAL_HEADERS.join(', ')}</code>.<br />
          Password awal di-set sama dengan NIM. Prodi diidentifikasi via kode, DPA via NIDN.
        </Alert>

        {!result && (
          <div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 'var(--text-sm)' }}
            />
          </div>
        )}

        {parseError && <Alert variant="danger" title="Gagal">{parseError}</Alert>}

        {!result && rows.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Pratinjau <strong>{rows.length}</strong> baris (5 pertama):
            </div>
            <div className="tz-table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
              <table className="tz-table">
                <thead>
                  <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>{headers.map((h) => <td key={h}>{r[h] || <span className="muted">—</span>}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result && (
          <>
            <Alert variant={result.failed === 0 ? 'success' : 'warning'} title={`Hasil impor`}>
              {result.created} berhasil dibuat, {result.failed} gagal dari {result.totalRows} baris.
            </Alert>
            <div className="tz-table-wrap" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table className="tz-table">
                <thead>
                  <tr><th>Baris</th><th>NIM</th><th>Status</th><th>Catatan</th></tr>
                </thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.row}>
                      <td className="num mono">{r.row}</td>
                      <td className="mono">{r.nim ?? '—'}</td>
                      <td>
                        {r.status === 'created'
                          ? <span className="pill pill--success">created</span>
                          : <span className="pill pill--danger">failed</span>}
                      </td>
                      <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{r.message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          {result
            ? <Button variant="primary" size="sm" onClick={handleClose}>Tutup</Button>
            : (
              <>
                <Button variant="ghost" size="sm" onClick={handleClose}>Batal</Button>
                <Button variant="primary" size="sm" disabled={rows.length === 0 || importMutation.isPending} onClick={submit}>
                  {importMutation.isPending ? 'Mengimpor…' : `Import ${rows.length} baris`}
                </Button>
              </>
            )}
        </div>
      </div>
    </Modal>
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
