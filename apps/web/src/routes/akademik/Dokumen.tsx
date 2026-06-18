import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, FileText, Activity, Layers } from 'lucide-react';
import {
  useAdminKategori, useAdminKategoriActions,
  useAdminDokumen, useAdminDokumenActions, useAdminDokumenAkses,
  type KategoriDokumen, type KategoriInput, type Dokumen, type DokumenInput,
} from '@/lib/queries-dokumen';
import { useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal, formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const KAT_EMPTY: KategoriInput = { kode: '', nama: '', urutan: 0, isAktif: true };
const DOK_EMPTY: Partial<DokumenInput> = { kategoriId: '', judul: '', target: 'all', fileUrl: '', jenisFile: 'pdf' };

export function AkademikDokumen() {
  const [tab, setTab] = useState<'dokumen' | 'kategori'>('dokumen');

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Pusat Dokumen"
        subtitle="Repository file institusional: panduan akademik, tata tertib, pedoman skripsi, SOP, dll. Mahasiswa & dosen membaca sesuai target."
      />

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Button size="sm" variant={tab === 'dokumen' ? 'primary' : 'ghost'} leftIcon={<FileText size={14} />} onClick={() => setTab('dokumen')}>Dokumen</Button>
        <Button size="sm" variant={tab === 'kategori' ? 'primary' : 'ghost'} leftIcon={<Layers size={14} />} onClick={() => setTab('kategori')}>Kategori</Button>
      </div>

      {tab === 'dokumen' ? <DokumenTab /> : <KategoriTab />}
    </div>
  );
}

function KategoriTab() {
  const { data, isLoading, error } = useAdminKategori();
  const actions = useAdminKategoriActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KategoriDokumen | null>(null);
  const [form, setForm] = useState<KategoriInput>(KAT_EMPTY);
  const [actErr, setActErr] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setForm(KAT_EMPTY); setActErr(null); setModalOpen(true); };
  const openEdit = (k: KategoriDokumen) => {
    setEditing(k);
    setForm({ kode: k.kode, nama: k.nama, deskripsi: k.deskripsi, urutan: k.urutan, isAktif: k.isAktif });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.kode || !form.nama) { setActErr('Kode dan nama wajib diisi'); return; }
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: form });
      else await actions.create.mutateAsync(form);
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (k: KategoriDokumen) => {
    if (!confirm(`Hapus kategori "${k.nama}"?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(k.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah Kategori</Button>
      </div>
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada kategori">Buat minimal 1 kategori (mis. "Panduan Akademik") sebelum menambah dokumen.</Alert>
      )}

      <Card>
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th className="num">Urutan</th>
                <th>Kode</th>
                <th>Nama</th>
                <th>Status</th>
                <th className="num">Dokumen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((k) => (
                <tr key={k.id}>
                  <td className="num mono">{k.urutan}</td>
                  <td className="mono">{k.kode}</td>
                  <td>
                    <strong>{k.nama}</strong>
                    {k.deskripsi && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{k.deskripsi}</div>}
                  </td>
                  <td>{k.isAktif ? <span className="pill pill--success">Aktif</span> : <span className="pill pill--neutral">Nonaktif</span>}</td>
                  <td className="num mono">{k._count?.dokumen ?? 0}</td>
                  <td>
                    <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(k)}>Ubah</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(k)}>Hapus</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah kategori' : 'Kategori baru'} width={560}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Input label="Kode (huruf kecil/angka/strip)" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} placeholder="panduan-akademik" disabled={!!editing} />
          <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="Panduan Akademik" />
          <Input label="Deskripsi (opsional)" value={form.deskripsi ?? ''} onChange={(e) => setForm({ ...form, deskripsi: (e.target as HTMLInputElement).value })} />
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Urutan" type="number" min="0" value={String(form.urutan ?? 0)} onChange={(e) => setForm({ ...form, urutan: Number((e.target as HTMLInputElement).value) })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={form.isAktif ?? true} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending || actions.update.isPending} onClick={save}>
              {actions.create.isPending || actions.update.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function DokumenTab() {
  const kategori = useAdminKategori();
  const prodi = useProdi();
  const [filterKategori, setFilterKategori] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'aktif' | 'nonaktif' | ''>('');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useAdminDokumen({
    kategoriId: filterKategori || undefined,
    status: filterStatus || undefined,
    q: q || undefined,
  });
  const actions = useAdminDokumenActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dokumen | null>(null);
  const [form, setForm] = useState<Partial<DokumenInput>>(DOK_EMPTY);
  const [actErr, setActErr] = useState<string | null>(null);
  const [aksesFor, setAksesFor] = useState<Dokumen | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...DOK_EMPTY, kategoriId: kategori.data?.items[0]?.id ?? '' });
    setActErr(null);
    setModalOpen(true);
  };
  const openEdit = (d: Dokumen) => {
    setEditing(d);
    setForm({
      kategoriId: d.kategoriId, judul: d.judul, deskripsi: d.deskripsi, versi: d.versi,
      target: d.target, fileUrl: d.fileUrl, jenisFile: d.jenisFile,
      ukuranByte: d.ukuranByte,
      tanggalBerlaku: d.tanggalBerlaku ? d.tanggalBerlaku.slice(0, 10) : null,
      tanggalKedaluwarsa: d.tanggalKedaluwarsa ? d.tanggalKedaluwarsa.slice(0, 10) : null,
      isAktif: d.isAktif,
    });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.kategoriId || !form.judul || !form.fileUrl || !form.target) {
      setActErr('Kategori, judul, target, dan file URL wajib diisi'); return;
    }
    try {
      const payload = form as DokumenInput;
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: payload });
      else await actions.create.mutateAsync(payload);
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (d: Dokumen) => {
    if (!confirm(`Hapus dokumen "${d.judul}"?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(d.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Kategori" value={filterKategori} onChange={(e) => setFilterKategori((e.target as HTMLSelectElement).value)}>
            <option value="">Semua kategori</option>
            {kategori.data?.items.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 160 }}>
          <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus((e.target as HTMLSelectElement).value as 'aktif' | 'nonaktif' | '')}>
            <option value="">Semua</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="judul / deskripsi" />
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah Dokumen</Button>
      </div>

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      <Card>
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Target</th>
                <th>Status</th>
                <th className="num">View / DL</th>
                <th>Diperbarui</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Belum ada dokumen.</td></tr>}
              {data?.items.map((d) => (
                <tr key={d.id} style={{ opacity: d.isAktif ? 1 : 0.6 }}>
                  <td>
                    <strong>{d.judul}</strong>
                    <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
                      {d.versi && `v${d.versi} · `}
                      {d.jenisFile?.toUpperCase()}
                    </div>
                  </td>
                  <td className="mono">{d.kategori?.nama}</td>
                  <td><TargetPill target={d.target} prodi={prodi.data?.items} /></td>
                  <td>{d.isAktif ? <span className="pill pill--success">Aktif</span> : <span className="pill pill--neutral">Nonaktif</span>}</td>
                  <td className="num mono">{d.viewCount} / {d.downloadCount}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggal(d.updatedAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <a href={d.fileUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">Buka</Button>
                      </a>
                      <Button size="sm" variant="ghost" leftIcon={<Activity size={12} />} onClick={() => setAksesFor(d)}>Akses</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(d)}>Ubah</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(d)}>Hapus</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah dokumen' : 'Dokumen baru'} width={720}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Kategori" value={form.kategoriId ?? ''} onChange={(e) => setForm({ ...form, kategoriId: (e.target as HTMLSelectElement).value })}>
                <option value="">— pilih kategori —</option>
                {kategori.data?.items.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Target audience" value={form.target ?? 'all'} onChange={(e) => setForm({ ...form, target: (e.target as HTMLSelectElement).value })}>
                <option value="all">Semua peran</option>
                <option value="mahasiswa">Hanya mahasiswa</option>
                <option value="dosen">Hanya dosen</option>
                {prodi.data?.items.map((p) => <option key={p.id} value={`prodi:${p.id}`}>Prodi: {p.nama}</option>)}
              </Select>
            </div>
          </div>
          <Input label="Judul" value={form.judul ?? ''} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} placeholder="Panduan Akademik 2025/2026" />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Deskripsi (opsional)</label>
            <textarea
              value={form.deskripsi ?? ''}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={3}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 2 }}>
              <Input label="File URL" value={form.fileUrl ?? ''} onChange={(e) => setForm({ ...form, fileUrl: (e.target as HTMLInputElement).value })} placeholder="https://drive.google.com/…" />
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Jenis file" value={form.jenisFile ?? 'pdf'} onChange={(e) => setForm({ ...form, jenisFile: (e.target as HTMLSelectElement).value })}>
                <option value="pdf">PDF</option>
                <option value="doc">Word</option>
                <option value="xls">Excel</option>
                <option value="ppt">PowerPoint</option>
                <option value="zip">ZIP</option>
                <option value="link">Link / Website</option>
                <option value="lain">Lain</option>
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Versi (opsional)" value={form.versi ?? ''} onChange={(e) => setForm({ ...form, versi: (e.target as HTMLInputElement).value })} placeholder="1.0" />
            </div>
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Berlaku dari (opsional)" type="date" value={form.tanggalBerlaku ?? ''} onChange={(e) => setForm({ ...form, tanggalBerlaku: (e.target as HTMLInputElement).value || null })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Kedaluwarsa (opsional)" type="date" value={form.tanggalKedaluwarsa ?? ''} onChange={(e) => setForm({ ...form, tanggalKedaluwarsa: (e.target as HTMLInputElement).value || null })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={form.isAktif ?? true} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending || actions.update.isPending} onClick={save}>
              {actions.create.isPending || actions.update.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {aksesFor && (
        <AksesLogModal dokumen={aksesFor} onClose={() => setAksesFor(null)} />
      )}
    </>
  );
}

function AksesLogModal({ dokumen, onClose }: { dokumen: Dokumen; onClose: () => void }) {
  const { data, isLoading } = useAdminDokumenAkses(dokumen.id);
  return (
    <Modal open onClose={onClose} title={`Log akses — ${dokumen.judul}`} width={760}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Total view: <strong>{dokumen.viewCount}</strong> · Total download: <strong>{dokumen.downloadCount}</strong>
        </div>
        {isLoading && <p className="muted">Memuat…</p>}
        {data && data.items.length === 0 && <Alert variant="info" title="Belum ada log akses" />}
        {data && data.items.length > 0 && (
          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr><th>Waktu</th><th>User</th><th>Aksi</th><th>IP</th></tr>
              </thead>
              <tbody>
                {data.items.map((a) => {
                  const nama = a.user.mahasiswa?.nama ?? a.user.dosen?.nama ?? a.user.email;
                  const idn = a.user.mahasiswa?.nim ?? a.user.dosen?.nidn ?? null;
                  return (
                    <tr key={a.id}>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggalWaktu(a.createdAt)}</td>
                      <td>
                        {nama}
                        {idn && <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{idn}</div>}
                      </td>
                      <td><span className={`pill ${a.aksi === 'download' ? 'pill--accent' : 'pill--neutral'}`}>{a.aksi}</span></td>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{a.ip ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}

function TargetPill({ target, prodi }: { target: string; prodi?: Array<{ id: string; nama: string }> }) {
  const label = useMemo(() => {
    if (target === 'all') return 'Semua';
    if (target === 'mahasiswa') return 'Mahasiswa';
    if (target === 'dosen') return 'Dosen';
    if (target.startsWith('prodi:')) {
      const id = target.slice(6);
      const p = prodi?.find((x) => x.id === id);
      return p ? `Prodi ${p.nama}` : 'Prodi';
    }
    return target;
  }, [target, prodi]);
  return <span className="pill pill--neutral">{label}</span>;
}
