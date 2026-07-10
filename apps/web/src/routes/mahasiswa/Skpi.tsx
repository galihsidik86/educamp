import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Send, Award, FileBadge, Printer } from 'lucide-react';
import {
  useMahasiswaSertifikasi, useMahasiswaPrestasi,
  useMahasiswaSertifikasiActions, useMahasiswaPrestasiActions,
  type Sertifikasi, type Prestasi, type SertifikasiInput, type PrestasiInput,
  type JenisSertifikasi, type JenisPrestasi, type LevelKegiatan,
} from '@/lib/queries-skpi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggal, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS_SERTIFIKAT: Array<{ v: JenisSertifikasi; label: string }> = [
  { v: 'bahasa', label: 'Bahasa' },
  { v: 'kompetensi', label: 'Kompetensi / Profesi' },
  { v: 'pelatihan', label: 'Pelatihan / Workshop' },
  { v: 'lain', label: 'Lain' },
];

const JENIS_PRESTASI: Array<{ v: JenisPrestasi; label: string }> = [
  { v: 'lomba_akademik', label: 'Lomba akademik' },
  { v: 'lomba_non_akademik', label: 'Lomba non-akademik' },
  { v: 'kepanitiaan', label: 'Kepanitiaan' },
  { v: 'organisasi', label: 'Organisasi' },
  { v: 'publikasi', label: 'Publikasi' },
  { v: 'lain', label: 'Lain' },
];

const LEVEL: Array<{ v: LevelKegiatan; label: string }> = [
  { v: 'internasional', label: 'Internasional' },
  { v: 'nasional', label: 'Nasional' },
  { v: 'regional', label: 'Regional / Provinsi' },
  { v: 'lokal', label: 'Lokal / Kota' },
  { v: 'internal', label: 'Internal Kampus' },
];

export function MahasiswaSkpi() {
  const [tab, setTab] = useState<'sertifikat' | 'prestasi'>('sertifikat');

  return (
    <div className="stack">
      <PageHead
        eyebrow="PORTFOLIO"
        title="Sertifikasi & Prestasi (SKPI)"
        subtitle="Catat sertifikat kompetensi/bahasa dan prestasi non-akademik untuk Surat Keterangan Pendamping Ijazah."
        right={
          <Link to="/mahasiswa/skpi/cetak">
            <Button variant="ghost" size="sm" leftIcon={<Printer size={14} />}>Pratinjau SKPI</Button>
          </Link>
        }
      />

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Button size="sm" variant={tab === 'sertifikat' ? 'primary' : 'ghost'} leftIcon={<FileBadge size={14} />} onClick={() => setTab('sertifikat')}>
          Sertifikat
        </Button>
        <Button size="sm" variant={tab === 'prestasi' ? 'primary' : 'ghost'} leftIcon={<Award size={14} />} onClick={() => setTab('prestasi')}>
          Prestasi
        </Button>
      </div>

      {tab === 'sertifikat' ? <SertifikatTab /> : <PrestasiTab />}
    </div>
  );
}

function SertifikatTab() {
  const { data, isLoading, error } = useMahasiswaSertifikasi();
  const actions = useMahasiswaSertifikasiActions();
  const [editing, setEditing] = useState<Sertifikasi | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<SertifikasiInput>>({});
  const [actErr, setActErr] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setForm({ jenis: 'bahasa', tanggalTerbit: '' }); setActErr(null); setModalOpen(true); };
  const openEdit = (s: Sertifikasi) => {
    setEditing(s);
    setForm({
      jenis: s.jenis, nama: s.nama, penerbit: s.penerbit, nomorSertifikat: s.nomorSertifikat,
      tanggalTerbit: s.tanggalTerbit.slice(0, 10),
      tanggalKadaluwarsa: s.tanggalKadaluwarsa ? s.tanggalKadaluwarsa.slice(0, 10) : null,
      level: s.level, skor: s.skor, fileUrl: s.fileUrl,
    });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.nama || !form.penerbit || !form.tanggalTerbit) { setActErr('Nama, penerbit, dan tanggal terbit wajib diisi'); return; }
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: form });
      else await actions.create.mutateAsync(form);
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onSubmit = async (s: Sertifikasi) => {
    setActErr(null);
    try { await actions.submit.mutateAsync(s.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (s: Sertifikasi) => {
    if (!confirm(`Hapus sertifikat "${s.nama}"?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(s.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah Sertifikat</Button>
      </div>

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada sertifikat">Klik "Tambah Sertifikat" untuk mencatat sertifikat pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <FileBadge size={16} className="muted" />
                  <strong>{s.nama}</strong>
                  <StatusPill status={s.status} />
                  <span className="pill pill--neutral">{JENIS_SERTIFIKAT.find((j) => j.v === s.jenis)?.label}</span>
                  {s.level && <span className="pill pill--neutral">{LEVEL.find((l) => l.v === s.level)?.label}</span>}
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {s.penerbit} · Terbit {formatTanggal(s.tanggalTerbit)}
                  {s.skor && ` · Skor: ${s.skor}`}
                  {s.nomorSertifikat && ` · No. ${s.nomorSertifikat}`}
                </div>
                {s.fileUrl && <a href={safeHref(s.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>Lihat bukti</a>}
                {s.catatanVerifikator && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan verifikator:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{s.catatanVerifikator}</p>
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {(s.status === 'draft' || s.status === 'ditolak') && (
                  <Button size="sm" variant="primary" leftIcon={<Send size={12} />} onClick={() => onSubmit(s)}>
                    {s.status === 'ditolak' ? 'Ajukan ulang' : 'Submit verifikasi'}
                  </Button>
                )}
                {s.status !== 'diverifikasi' && (
                  <>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(s)}>Ubah</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(s)}>Hapus</Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah sertifikat' : 'Sertifikat baru'} width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Jenis" value={form.jenis ?? 'bahasa'} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as JenisSertifikasi })}>
                {JENIS_SERTIFIKAT.map((j) => <option key={j.v} value={j.v}>{j.label}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Level (opsional)" value={form.level ?? ''} onChange={(e) => setForm({ ...form, level: ((e.target as HTMLSelectElement).value || null) as LevelKegiatan | null })}>
                <option value="">— tanpa level —</option>
                {LEVEL.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
              </Select>
            </div>
          </div>
          <Input label="Nama sertifikat" value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="TOEFL ITP, MTCNA, dll" />
          <Input label="Penerbit" value={form.penerbit ?? ''} onChange={(e) => setForm({ ...form, penerbit: (e.target as HTMLInputElement).value })} placeholder="ETS Institutional, Mikrotik" />
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal terbit" type="date" value={form.tanggalTerbit ?? ''} onChange={(e) => setForm({ ...form, tanggalTerbit: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal kadaluwarsa (opsional)" type="date" value={form.tanggalKadaluwarsa ?? ''} onChange={(e) => setForm({ ...form, tanggalKadaluwarsa: (e.target as HTMLInputElement).value || null })} />
            </div>
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Skor / hasil" value={form.skor ?? ''} onChange={(e) => setForm({ ...form, skor: (e.target as HTMLInputElement).value })} placeholder="550 / Band 6.5 / Pass" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="No. sertifikat (opsional)" value={form.nomorSertifikat ?? ''} onChange={(e) => setForm({ ...form, nomorSertifikat: (e.target as HTMLInputElement).value })} />
            </div>
          </div>
          <Input label="Link bukti / file (opsional)" value={form.fileUrl ?? ''} onChange={(e) => setForm({ ...form, fileUrl: (e.target as HTMLInputElement).value })} placeholder="https://drive.google.com/..." />
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

function PrestasiTab() {
  const { data, isLoading, error } = useMahasiswaPrestasi();
  const actions = useMahasiswaPrestasiActions();
  const [editing, setEditing] = useState<Prestasi | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<PrestasiInput>>({});
  const [actErr, setActErr] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setForm({ jenis: 'lomba_akademik', tanggal: '' }); setActErr(null); setModalOpen(true); };
  const openEdit = (p: Prestasi) => {
    setEditing(p);
    setForm({
      jenis: p.jenis, nama: p.nama, penyelenggara: p.penyelenggara,
      tanggal: p.tanggal.slice(0, 10),
      level: p.level, peran: p.peran, deskripsi: p.deskripsi, fileUrl: p.fileUrl,
    });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.nama || !form.tanggal) { setActErr('Nama dan tanggal wajib diisi'); return; }
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: form });
      else await actions.create.mutateAsync(form);
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onSubmit = async (p: Prestasi) => {
    setActErr(null);
    try { await actions.submit.mutateAsync(p.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (p: Prestasi) => {
    if (!confirm(`Hapus prestasi "${p.nama}"?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(p.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah Prestasi</Button>
      </div>

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada prestasi">Klik "Tambah Prestasi" untuk mencatat prestasi pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={16} className="muted" />
                  <strong>{p.nama}</strong>
                  <StatusPill status={p.status} />
                  <span className="pill pill--neutral">{JENIS_PRESTASI.find((j) => j.v === p.jenis)?.label}</span>
                  {p.level && <span className="pill pill--neutral">{LEVEL.find((l) => l.v === p.level)?.label}</span>}
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {p.penyelenggara && `${p.penyelenggara} · `}{formatTanggal(p.tanggal)}
                  {p.peran && ` · Peran: ${p.peran}`}
                </div>
                {p.deskripsi && <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{p.deskripsi}</p>}
                {p.fileUrl && <a href={safeHref(p.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>Lihat bukti</a>}
                {p.catatanVerifikator && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan verifikator:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{p.catatanVerifikator}</p>
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {(p.status === 'draft' || p.status === 'ditolak') && (
                  <Button size="sm" variant="primary" leftIcon={<Send size={12} />} onClick={() => onSubmit(p)}>
                    {p.status === 'ditolak' ? 'Ajukan ulang' : 'Submit verifikasi'}
                  </Button>
                )}
                {p.status !== 'diverifikasi' && (
                  <>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(p)}>Ubah</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(p)}>Hapus</Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah prestasi' : 'Prestasi baru'} width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Jenis" value={form.jenis ?? 'lomba_akademik'} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as JenisPrestasi })}>
                {JENIS_PRESTASI.map((j) => <option key={j.v} value={j.v}>{j.label}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Level (opsional)" value={form.level ?? ''} onChange={(e) => setForm({ ...form, level: ((e.target as HTMLSelectElement).value || null) as LevelKegiatan | null })}>
                <option value="">— tanpa level —</option>
                {LEVEL.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
              </Select>
            </div>
          </div>
          <Input label="Nama prestasi / kegiatan" value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="Juara 2 GEMASTIK 2024 — Pemrograman" />
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 2 }}>
              <Input label="Penyelenggara (opsional)" value={form.penyelenggara ?? ''} onChange={(e) => setForm({ ...form, penyelenggara: (e.target as HTMLInputElement).value })} placeholder="Kemdikbud" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal" type="date" value={form.tanggal ?? ''} onChange={(e) => setForm({ ...form, tanggal: (e.target as HTMLInputElement).value })} />
            </div>
          </div>
          <Input label="Peran (opsional)" value={form.peran ?? ''} onChange={(e) => setForm({ ...form, peran: (e.target as HTMLInputElement).value })} placeholder="Ketua Panitia, Anggota Tim" />
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Deskripsi (opsional)</label>
            <textarea
              value={form.deskripsi ?? ''}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={3}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <Input label="Link bukti / file (opsional)" value={form.fileUrl ?? ''} onChange={(e) => setForm({ ...form, fileUrl: (e.target as HTMLInputElement).value })} />
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
