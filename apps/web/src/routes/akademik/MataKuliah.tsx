import { useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { useMataKuliah, useMkActions, useProdi, KELOMPOK_MATKUL, type Mk, type MkInput, type MkImportResult } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import { formatStatus } from '@/lib/format';
import { parseXlsxFile, downloadXlsxTemplate } from '@/lib/xlsx';
import { TableSkeletonRows } from '@/components/Skeleton';

const JENIS = ['wajib_universitas', 'wajib_prodi', 'pilihan'] as const;
const MK_EXPECTED_HEADERS = ['kode', 'nama', 'sks', 'prodiKode'] as const;
const MK_OPTIONAL_HEADERS = ['namaInggris', 'sksTeori', 'sksPraktik', 'jenis', 'kelompokMatkul'] as const;

export function AdminMataKuliah() {
  const [filters, setFilters] = useState({ q: '', prodiId: '' });
  const { data, isLoading, error } = useMataKuliah(filters);
  const prodi = useProdi();
  const actions = useMkActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; mk: Mk } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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
        right={
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" leftIcon={<Upload size={16} />} onClick={() => setImportOpen(true)}>Import Excel</Button>
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>Tambah MK</Button>
          </div>
        }
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
              <th>Kode</th><th>Nama MK</th><th>Prodi</th><th>Jenis</th><th>Kelompok</th>
              <th className="num">SKS</th><th className="num">Teori</th><th className="num">Praktik</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows cols={9} rows={5} />}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Tidak ada data.</td></tr>}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.kode}</td>
                <td>{m.nama}{m.namaInggris && <div className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{m.namaInggris}</div>}</td>
                <td>{m.prodi.nama}</td>
                <td>{formatStatus(m.jenis)}</td>
                <td className="mono">{m.kelompokMatkul ?? <span className="muted">—</span>}</td>
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

      <MkImportModal open={importOpen} onClose={() => setImportOpen(false)} importMutation={actions.importCsv} />
    </div>
  );
}

function MkImportModal({ open, onClose, importMutation }: {
  open: boolean;
  onClose: () => void;
  importMutation: ReturnType<typeof useMkActions>['importCsv'];
}) {
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<MkImportResult | null>(null);

  if (!open) return null;

  const reset = () => { setRows([]); setHeaders([]); setParseError(null); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const onFile = async (file: File | null) => {
    setParseError(null); setResult(null);
    if (!file) return;
    try {
      const parsed = await parseXlsxFile(file);
      const missing = MK_EXPECTED_HEADERS.filter((h) => !parsed.headers.includes(h));
      if (missing.length > 0) {
        setParseError(`Header Excel kurang: ${missing.join(', ')}. Wajib: ${MK_EXPECTED_HEADERS.join(', ')}.`);
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
    } catch (e: any) {
      setParseError(`Gagal parse Excel: ${e?.message ?? 'unknown'}`);
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
    <Modal open onClose={handleClose} title="Import Mata Kuliah via Excel" width={760}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <Alert variant="info" title="Format Excel (.xlsx)">
          Header wajib: <code>{MK_EXPECTED_HEADERS.join(', ')}</code>.<br />
          Header opsional: <code>{MK_OPTIONAL_HEADERS.join(', ')}</code>.<br />
          Prodi diidentifikasi via <code>prodiKode</code>. Jenis: <code>wajib_universitas</code> / <code>wajib_prodi</code> / <code>pilihan</code> (default <code>wajib_prodi</code>).<br />
          Kelompok MK (opsional): <code>MKWU</code> / <code>MKDK</code> / <code>MKWK</code> / <code>MKK</code> / <code>MKB</code> / <code>MPK</code>.
        </Alert>

        <div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Download size={14} />}
            type="button"
            onClick={() => downloadXlsxTemplate(
              'template-mata-kuliah.xlsx',
              [...MK_EXPECTED_HEADERS, ...MK_OPTIONAL_HEADERS],
              [
                { kode: 'IF-3201', nama: 'Algoritma Lanjut', sks: 3, prodiKode: '55201', namaInggris: 'Advanced Algorithms', sksTeori: 2, sksPraktik: 1, jenis: 'wajib_prodi', kelompokMatkul: 'MKK' },
                { kode: 'IF-3202', nama: 'Big Data', sks: 3, prodiKode: '55201', sksTeori: 3, sksPraktik: 0, jenis: 'pilihan', kelompokMatkul: 'MKB' },
              ],
            )}
          >
            Unduh template Excel
          </Button>
        </div>

        {!result && (
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 'var(--text-sm)' }}
          />
        )}

        {parseError && <Alert variant="danger" title="Gagal">{parseError}</Alert>}

        {!result && rows.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Pratinjau <strong>{rows.length}</strong> baris (5 pertama):
            </div>
            <div className="tz-table-wrap" style={{ maxHeight: 280, overflow: 'auto' }}>
              <table className="tz-table">
                <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
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
            <Alert variant={result.failed === 0 ? 'success' : 'warning'} title="Hasil impor">
              {result.created} berhasil dibuat, {result.failed} gagal dari {result.totalRows} baris.
            </Alert>
            <div className="tz-table-wrap" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table className="tz-table">
                <thead><tr><th>Baris</th><th>Kode</th><th>Status</th><th>Catatan</th></tr></thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.row}>
                      <td className="num mono">{r.row}</td>
                      <td className="mono">{r.kode ?? '—'}</td>
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
    kelompokMatkul: initial?.kelompokMatkul ?? null,
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
          <div style={{ flex: 1 }}>
            <Select
              label="Kelompok MK"
              value={form.kelompokMatkul ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                setForm({ ...form, kelompokMatkul: v === '' ? null : (v as MkInput['kelompokMatkul']) });
              }}
            >
              <option value="">— tidak ditentukan —</option>
              {KELOMPOK_MATKUL.map((k) => <option key={k} value={k}>{k}</option>)}
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
