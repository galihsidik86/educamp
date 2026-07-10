import { useEffect, useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, KeyRound, Upload, FileText, Calendar } from 'lucide-react';
import {
  useAdminMahasiswa, useMahasiswaActions, useProdi, useAdminDosen, useKategoriUkt,
  usePddiktiRefs, useMahasiswaOrangTua, useOrangTuaActions,
  type AdminMahasiswa, type CreateMahasiswaInput, type ImportResult,
  type OrangTuaInput, type OrangTuaJenis,
} from '@/lib/queries-akademik';
import { formatRupiah } from '@/lib/format';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { RowActions } from '@/components/RowActions';
import { ApiError } from '@/lib/api';
import { parseXlsxFile, downloadXlsxTemplate } from '@/lib/xlsx';
import { Download } from 'lucide-react';

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
            <Button variant="ghost" leftIcon={<Upload size={16} />} onClick={() => setImportOpen(true)}>Import Excel</Button>
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
              <th className="center">Angkatan</th><th>Status</th><th>DPA</th><th>Kategori UKT</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Tidak ada data.</td></tr>}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.nim}</td>
                <td>{m.nama}</td>
                <td className="muted">{m.user.email}</td>
                <td>{m.prodi.nama}</td>
                <td className="center mono">{m.angkatan}</td>
                <td><StatusPill status={m.status} /></td>
                <td>{m.dpa?.nama ?? <span className="muted">—</span>}</td>
                <td>{m.kategoriUkt ? (
                  <>
                    <span className="mono">{m.kategoriUkt.kode}</span>
                    <div className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{formatRupiah(m.kategoriUkt.nominalSemester)}</div>
                  </>
                ) : <span className="muted">—</span>}</td>
                <td>
                  <RowActions
                    label={`Aksi untuk ${m.nama}`}
                    actions={[
                      { label: 'Transkrip', icon: <FileText size={14} />, to: `/akademik/mahasiswa/${m.id}/transkrip` },
                      { label: 'Kehadiran', icon: <Calendar size={14} />, to: `/akademik/mahasiswa/${m.id}/kehadiran` },
                      { label: 'Edit', icon: <Pencil size={14} />, onClick: () => setModal({ mode: 'edit', mhs: m }) },
                      { label: 'Reset PW', icon: <KeyRound size={14} />, onClick: () => onResetPw(m) },
                      { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => onDelete(m), danger: true },
                    ]}
                  />
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
    try {
      const parsed = await parseXlsxFile(file);
      const missing = EXPECTED_HEADERS.filter((h) => !parsed.headers.includes(h));
      if (missing.length > 0) {
        setParseError(`Header Excel kurang: ${missing.join(', ')}. Wajib: ${EXPECTED_HEADERS.join(', ')}.`);
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
    <Modal open onClose={handleClose} title="Import mahasiswa via Excel" width={760}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <Alert variant="info" title="Format Excel (.xlsx)">
          Header wajib: <code>{EXPECTED_HEADERS.join(', ')}</code>.<br />
          Header opsional: <code>{OPTIONAL_HEADERS.join(', ')}</code>.<br />
          Password awal di-set sama dengan NIM. Prodi diidentifikasi via kode, DPA via NIDN.
        </Alert>

        <div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Download size={14} />}
            type="button"
            onClick={() => downloadXlsxTemplate(
              'template-mahasiswa.xlsx',
              [...EXPECTED_HEADERS, ...OPTIONAL_HEADERS],
              [
                { nim: '2026110001', nama: 'Ahmad Fauzi', email: 'ahmad.fauzi@example.com', jenisKelamin: 'L', angkatan: 2026, prodiKode: '55201', dpaNidn: '', tempatLahir: 'Bogor', tanggalLahir: '2008-05-12', alamat: 'Jl. Contoh No. 1', telepon: '081234567890' },
                { nim: '2026110002', nama: 'Siti Aminah', email: 'siti.aminah@example.com', jenisKelamin: 'P', angkatan: 2026, prodiKode: '55201' },
              ],
            )}
          >
            Unduh template Excel
          </Button>
        </div>

        {!result && (
          <div>
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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

type ModalTab = 'akademik' | 'biodata' | 'ortu';

function MahasiswaModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: AdminMahasiswa;
  onClose: () => void;
  onSubmit: (input: Partial<CreateMahasiswaInput>, id?: string) => Promise<void>;
}) {
  const prodi = useProdi();
  const dosen = useAdminDosen();
  const refs = usePddiktiRefs();
  const [tab, setTab] = useState<ModalTab>('akademik');
  const [form, setForm] = useState<Partial<CreateMahasiswaInput>>({
    nim: initial?.nim ?? '',
    nama: initial?.nama ?? '',
    email: initial?.user.email ?? '',
    jenisKelamin: (initial?.jenisKelamin ?? 'L') as 'L' | 'P',
    tempatLahir: initial?.tempatLahir ?? '',
    tanggalLahir: initial?.tanggalLahir ? initial.tanggalLahir.slice(0, 10) : '',
    alamat: initial?.alamat ?? '',
    telepon: initial?.telepon ?? '',
    angkatan: initial?.angkatan ?? new Date().getFullYear(),
    prodiId: prodi.data?.items.find((p) => p.nama === initial?.prodi.nama)?.id ?? '',
    dpaId: initial?.dpa?.id,
    kategoriUktId: initial?.kategoriUkt?.id,
    defaultCicilanUkt: initial?.defaultCicilanUkt ?? 1,
    status: initial?.status ?? 'aktif',
    // PDDikti biodata
    nik: initial?.nik ?? '',
    nisn: initial?.nisn ?? '',
    npsn: initial?.npsn ?? '',
    namaSekolahAsal: initial?.namaSekolahAsal ?? '',
    jenisSekolahAsal: initial?.jenisSekolahAsal ?? '',
    tahunLulusSekolah: initial?.tahunLulusSekolah ?? null,
    kewarganegaraan: initial?.kewarganegaraan ?? 'Indonesia',
    kodeWilayahAlamat: initial?.kodeWilayahAlamat ?? '',
    pembiayaan: initial?.pembiayaan ?? '',
    kebutuhanKhusus: initial?.kebutuhanKhusus ?? '',
    semesterAwal: initial?.semesterAwal ?? '',
    agamaKode: initial?.agamaKode ?? null,
    jenisTinggalKode: initial?.jenisTinggalKode ?? null,
    alatTransportasiKode: initial?.alatTransportasiKode ?? null,
    jalurMasukKode: initial?.jalurMasukKode ?? '',
  });
  const kategoriUkt = useKategoriUkt(form.prodiId || undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bersihkan field opsional kosong ('' → null) sebelum submit.
  const cleanPayload = (): Partial<CreateMahasiswaInput> => {
    const nullableStr: (keyof CreateMahasiswaInput)[] = [
      'nik', 'nisn', 'npsn', 'namaSekolahAsal', 'jenisSekolahAsal',
      'kewarganegaraan', 'kodeWilayahAlamat', 'pembiayaan', 'kebutuhanKhusus',
      'semesterAwal', 'jalurMasukKode',
    ];
    const out: any = { ...form };
    for (const k of nullableStr) {
      if (out[k] === '') out[k] = null;
    }
    // Tanggal lahir dari date input ('' → undefined supaya tidak overwrite di edit)
    if (out.tanggalLahir === '') delete out.tanggalLahir;
    if (out.tempatLahir === '') delete out.tempatLahir;
    if (out.alamat === '') delete out.alamat;
    if (out.telepon === '') delete out.telepon;
    return out;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await onSubmit(cleanPayload(), mode === 'edit' ? initial!.id : undefined); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Mahasiswa' : `Edit ${initial!.nim} — ${initial!.nama}`}
      width={820}
    >
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`modal-tabs__btn ${tab === 'akademik' ? 'modal-tabs__btn--active' : ''}`}
            onClick={() => setTab('akademik')}
          >Akademik</button>
          <button
            type="button"
            role="tab"
            className={`modal-tabs__btn ${tab === 'biodata' ? 'modal-tabs__btn--active' : ''}`}
            onClick={() => setTab('biodata')}
          >Biodata PDDikti</button>
          <button
            type="button"
            role="tab"
            disabled={mode === 'create'}
            title={mode === 'create' ? 'Simpan dulu data dasar, lalu isi orang tua' : undefined}
            className={`modal-tabs__btn ${tab === 'ortu' ? 'modal-tabs__btn--active' : ''}`}
            onClick={() => setTab('ortu')}
          >Orang Tua / Wali</button>
        </div>

        {tab === 'akademik' && (
          <div className="stack">
            <div className="form-section">
              <h4>Identitas akun</h4>
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
                  <Input label="Tempat lahir" value={form.tempatLahir ?? ''} onChange={(e) => setForm({ ...form, tempatLahir: (e.target as HTMLInputElement).value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <Input label="Tanggal lahir" type="date" value={form.tanggalLahir ?? ''} onChange={(e) => setForm({ ...form, tanggalLahir: (e.target as HTMLInputElement).value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <Input label="Telepon" value={form.telepon ?? ''} onChange={(e) => setForm({ ...form, telepon: (e.target as HTMLInputElement).value })} />
                </div>
              </div>
              <Input label="Alamat" value={form.alamat ?? ''} onChange={(e) => setForm({ ...form, alamat: (e.target as HTMLInputElement).value })} />
            </div>

            <div className="form-section">
              <h4>Akademik & UKT</h4>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Input label="Angkatan" type="number" min={1990} max={2100} required value={String(form.angkatan ?? '')} onChange={(e) => setForm({ ...form, angkatan: Number((e.target as HTMLInputElement).value) })} />
                </div>
                <div style={{ flex: 2 }}>
                  <Select label="Program Studi" required value={form.prodiId ?? ''} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value, kategoriUktId: undefined })}>
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
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 2 }}>
                  <Select
                    label="Kategori UKT (opsional)"
                    value={form.kategoriUktId ?? ''}
                    onChange={(e) => setForm({ ...form, kategoriUktId: (e.target as HTMLSelectElement).value || null })}
                    disabled={!form.prodiId}
                  >
                    <option value="">{form.prodiId ? '— pakai tarif default prodi —' : '— pilih prodi dulu —'}</option>
                    {kategoriUkt.data?.items.filter((k) => k.isAktif).map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.kode} · {k.nama} — {formatRupiah(k.nominalSemester)}/sem
                      </option>
                    ))}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Default Skema UKT"
                    value={String(form.defaultCicilanUkt ?? 1)}
                    onChange={(e) => setForm({ ...form, defaultCicilanUkt: Number((e.target as HTMLSelectElement).value) })}
                  >
                    <option value="1">Sekaligus</option>
                    <option value="2">Cicilan 2×</option>
                    <option value="3">Cicilan 3×</option>
                    <option value="4">Cicilan 4×</option>
                    <option value="6">Cicilan 6×</option>
                    <option value="12">Cicilan 12×</option>
                  </Select>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                Kategori menentukan nominal UKT. Default Skema = preferensi cicilan yang dipakai saat validasi KRS.
              </p>
              {mode === 'create' && (
                <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                  Password awal otomatis = NIM. Mahasiswa diharapkan menggantinya setelah login pertama.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'biodata' && (
          <div className="stack">
            <Alert variant="info" title="Biodata PDDikti">
              Field di bawah ini dilaporkan ke Neo Feeder. Isi seakurat mungkin —
              kosong = tidak dilaporkan, tapi bisa diperbaiki nanti.
            </Alert>

            <div className="form-section">
              <h4>Identitas pribadi</h4>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="NIK (16 digit)"
                    maxLength={16}
                    value={form.nik ?? ''}
                    onChange={(e) => setForm({ ...form, nik: (e.target as HTMLInputElement).value })}
                    placeholder="3201xxxxxxxxxxxx"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label="NISN (10 digit)"
                    maxLength={10}
                    value={form.nisn ?? ''}
                    onChange={(e) => setForm({ ...form, nisn: (e.target as HTMLInputElement).value })}
                  />
                </div>
              </div>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Agama"
                    value={form.agamaKode != null ? String(form.agamaKode) : ''}
                    onChange={(e) => setForm({ ...form, agamaKode: e.target.value ? Number((e.target as HTMLSelectElement).value) : null })}
                  >
                    <option value="">— pilih —</option>
                    {refs.data?.agama.map((a) => <option key={a.kode} value={a.kode}>{a.nama}</option>)}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Kewarganegaraan"
                    value={form.kewarganegaraan ?? ''}
                    onChange={(e) => setForm({ ...form, kewarganegaraan: (e.target as HTMLInputElement).value })}
                    placeholder="Indonesia"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Kebutuhan khusus"
                    value={form.kebutuhanKhusus ?? ''}
                    onChange={(e) => setForm({ ...form, kebutuhanKhusus: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">Tidak ada</option>
                    <option value="tuna_netra">Tuna netra</option>
                    <option value="tuna_rungu">Tuna rungu</option>
                    <option value="tuna_daksa">Tuna daksa</option>
                    <option value="tuna_grahita">Tuna grahita</option>
                    <option value="lambat_belajar">Lambat belajar</option>
                    <option value="lainnya">Lainnya</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Asal sekolah</h4>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="NPSN sekolah"
                    maxLength={10}
                    value={form.npsn ?? ''}
                    onChange={(e) => setForm({ ...form, npsn: (e.target as HTMLInputElement).value })}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <Input
                    label="Nama sekolah asal"
                    value={form.namaSekolahAsal ?? ''}
                    onChange={(e) => setForm({ ...form, namaSekolahAsal: (e.target as HTMLInputElement).value })}
                    placeholder="SMA Negeri 1 ..."
                  />
                </div>
              </div>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Jenis sekolah"
                    value={form.jenisSekolahAsal ?? ''}
                    onChange={(e) => setForm({ ...form, jenisSekolahAsal: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">— pilih —</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                    <option value="MA">MA (Madrasah Aliyah)</option>
                    <option value="Pesantren">Pondok Pesantren</option>
                    <option value="Paket C">Paket C</option>
                    <option value="Lainnya">Lainnya</option>
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Tahun lulus"
                    type="number"
                    min={1990}
                    max={2100}
                    value={form.tahunLulusSekolah != null ? String(form.tahunLulusSekolah) : ''}
                    onChange={(e) => setForm({ ...form, tahunLulusSekolah: e.target.value ? Number((e.target as HTMLInputElement).value) : null })}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Jalur masuk & pembiayaan</h4>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Semester awal (5 digit)"
                    maxLength={5}
                    value={form.semesterAwal ?? ''}
                    onChange={(e) => setForm({ ...form, semesterAwal: (e.target as HTMLInputElement).value })}
                    placeholder="20241"
                    hint="Format PDDikti: TAHUN+SEMESTER, mis. 20241 = 2024/2025 Ganjil"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Jalur masuk"
                    value={form.jalurMasukKode ?? ''}
                    onChange={(e) => setForm({ ...form, jalurMasukKode: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">— pilih —</option>
                    {refs.data?.jalurMasuk.map((j) => <option key={j.kode} value={j.kode}>{j.nama}</option>)}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Pembiayaan"
                    value={form.pembiayaan ?? ''}
                    onChange={(e) => setForm({ ...form, pembiayaan: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">— pilih —</option>
                    <option value="biaya_sendiri">Biaya sendiri</option>
                    <option value="orang_tua">Orang tua</option>
                    <option value="beasiswa_kip">Beasiswa KIP-Kuliah</option>
                    <option value="beasiswa_pt">Beasiswa PT</option>
                    <option value="beasiswa_lain">Beasiswa lain</option>
                    <option value="ikatan_dinas">Ikatan dinas</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Tempat tinggal & transportasi</h4>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Jenis tempat tinggal"
                    value={form.jenisTinggalKode != null ? String(form.jenisTinggalKode) : ''}
                    onChange={(e) => setForm({ ...form, jenisTinggalKode: e.target.value ? Number((e.target as HTMLSelectElement).value) : null })}
                  >
                    <option value="">— pilih —</option>
                    {refs.data?.jenisTinggal.map((j) => <option key={j.kode} value={j.kode}>{j.nama}</option>)}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Alat transportasi utama"
                    value={form.alatTransportasiKode != null ? String(form.alatTransportasiKode) : ''}
                    onChange={(e) => setForm({ ...form, alatTransportasiKode: e.target.value ? Number((e.target as HTMLSelectElement).value) : null })}
                  >
                    <option value="">— pilih —</option>
                    {refs.data?.alatTransportasi.map((a) => <option key={a.kode} value={a.kode}>{a.nama}</option>)}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Kode wilayah BPS"
                    maxLength={8}
                    value={form.kodeWilayahAlamat ?? ''}
                    onChange={(e) => setForm({ ...form, kodeWilayahAlamat: (e.target as HTMLInputElement).value })}
                    placeholder="32.71.xx.xx"
                    hint="Kode wilayah Kemendagri (BPS) sesuai alamat KTP"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'ortu' && mode === 'edit' && (
          <OrangTuaSection mahasiswaId={initial!.id} />
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          {tab !== 'ortu' && (
            <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// Orang Tua / Wali — sub-section dengan 3 form (ayah, ibu, wali)
// ============================================================

const ORTU_PENDIDIKAN = ['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'Lainnya'];
const ORTU_PEKERJAAN = [
  'Tidak Bekerja', 'PNS', 'TNI/POLRI', 'Karyawan Swasta', 'Wiraswasta',
  'Petani', 'Nelayan', 'Buruh', 'Guru/Dosen', 'Profesional', 'Lainnya',
];
const ORTU_PENGHASILAN_RANGES = [
  { value: 0, label: 'Kurang dari Rp 500.000' },
  { value: 1, label: 'Rp 500.000 – 1.000.000' },
  { value: 2, label: 'Rp 1.000.001 – 2.000.000' },
  { value: 3, label: 'Rp 2.000.001 – 5.000.000' },
  { value: 4, label: 'Rp 5.000.001 – 10.000.000' },
  { value: 5, label: 'Lebih dari Rp 10.000.000' },
];

function OrangTuaSection({ mahasiswaId }: { mahasiswaId: string }) {
  const q = useMahasiswaOrangTua(mahasiswaId);
  const actions = useOrangTuaActions(mahasiswaId);
  const [forms, setForms] = useState<Record<OrangTuaJenis, OrangTuaInput>>({
    ayah: { jenis: 'ayah', nama: '' },
    ibu: { jenis: 'ibu', nama: '' },
    wali: { jenis: 'wali', nama: '' },
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const next: Record<OrangTuaJenis, OrangTuaInput> = {
      ayah: { jenis: 'ayah', nama: '' },
      ibu: { jenis: 'ibu', nama: '' },
      wali: { jenis: 'wali', nama: '' },
    };
    for (const item of q.data.items) {
      next[item.jenis] = {
        jenis: item.jenis,
        nama: item.nama,
        nik: item.nik ?? '',
        tahunLahir: item.tahunLahir,
        pendidikan: item.pendidikan ?? '',
        pekerjaan: item.pekerjaan ?? '',
        penghasilan: item.penghasilan,
      };
    }
    setForms(next);
  }, [q.data]);

  const update = (jenis: OrangTuaJenis, patch: Partial<OrangTuaInput>) => {
    setForms((prev) => ({ ...prev, [jenis]: { ...prev[jenis], ...patch } }));
  };

  const save = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      // Hanya kirim row yang nama-nya terisi.
      const items: OrangTuaInput[] = (['ayah', 'ibu', 'wali'] as const)
        .map((j) => forms[j])
        .filter((f) => f.nama.trim().length > 0)
        .map((f) => ({
          ...f,
          nik: f.nik?.toString().trim() ? f.nik : null,
          pendidikan: f.pendidikan || null,
          pekerjaan: f.pekerjaan || null,
        }));
      await actions.save.mutateAsync(items);
      setSavedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading) return <div className="muted">Memuat data orang tua…</div>;

  return (
    <div className="stack">
      <Alert variant="info" title="Data orang tua / wali">
        Isi data ayah, ibu, dan wali (jika ada). Baris dengan nama kosong tidak
        akan disimpan. Data ini dilaporkan ke PDDikti.
      </Alert>

      {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
      {savedAt && <Alert variant="success" title="Tersimpan">Disimpan pukul {savedAt}.</Alert>}

      {(['ayah', 'ibu', 'wali'] as const).map((jenis) => (
        <OrangTuaForm key={jenis} jenis={jenis} value={forms[jenis]} onChange={(p) => update(jenis, p)} />
      ))}

      <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
        <Button type="button" variant="primary" onClick={save} disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan orang tua'}
        </Button>
      </div>
    </div>
  );
}

function OrangTuaForm({ jenis, value, onChange }: {
  jenis: OrangTuaJenis;
  value: OrangTuaInput;
  onChange: (patch: Partial<OrangTuaInput>) => void;
}) {
  const titleMap: Record<OrangTuaJenis, string> = { ayah: 'Ayah kandung', ibu: 'Ibu kandung', wali: 'Wali (jika berbeda)' };
  return (
    <div className="form-section">
      <h4>{titleMap[jenis]}</h4>
      <div className="row" style={{ gap: 'var(--space-3)' }}>
        <div style={{ flex: 2 }}>
          <Input
            label="Nama"
            value={value.nama}
            onChange={(e) => onChange({ nama: (e.target as HTMLInputElement).value })}
            placeholder={jenis === 'wali' ? 'Kosongkan jika tidak ada' : ''}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input
            label="NIK (16 digit)"
            maxLength={16}
            value={value.nik ?? ''}
            onChange={(e) => onChange({ nik: (e.target as HTMLInputElement).value })}
          />
        </div>
        <div style={{ width: 110 }}>
          <Input
            label="Tahun lahir"
            type="number"
            min={1900}
            max={2100}
            value={value.tahunLahir != null ? String(value.tahunLahir) : ''}
            onChange={(e) => onChange({ tahunLahir: e.target.value ? Number((e.target as HTMLInputElement).value) : null })}
          />
        </div>
      </div>
      <div className="row" style={{ gap: 'var(--space-3)' }}>
        <div style={{ flex: 1 }}>
          <Select
            label="Pendidikan terakhir"
            value={value.pendidikan ?? ''}
            onChange={(e) => onChange({ pendidikan: (e.target as HTMLSelectElement).value })}
          >
            <option value="">— pilih —</option>
            {ORTU_PENDIDIKAN.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Select
            label="Pekerjaan"
            value={value.pekerjaan ?? ''}
            onChange={(e) => onChange({ pekerjaan: (e.target as HTMLSelectElement).value })}
          >
            <option value="">— pilih —</option>
            {ORTU_PEKERJAAN.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Select
            label="Penghasilan"
            value={value.penghasilan != null ? String(value.penghasilan) : ''}
            onChange={(e) => onChange({ penghasilan: e.target.value ? Number((e.target as HTMLSelectElement).value) : null })}
          >
            <option value="">— pilih —</option>
            {ORTU_PENGHASILAN_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>
      </div>
    </div>
  );
}
