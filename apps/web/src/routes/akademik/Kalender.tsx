import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import {
  useKalenderAkademik, useKalenderActions,
  type EventKalender, type EventKalenderInput,
} from '@/lib/queries-kalender';
import { usePeriode } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

const JENIS_OPTS: Array<{ v: EventKalender['jenis']; label: string }> = [
  { v: 'ujian', label: 'Ujian (UTS/UAS)' },
  { v: 'libur', label: 'Libur' },
  { v: 'registrasi', label: 'Registrasi (KRS/PRS/Pembayaran)' },
  { v: 'wisuda', label: 'Wisuda / Yudisium' },
  { v: 'akademik', label: 'Akademik' },
  { v: 'lain', label: 'Lain' },
];

const TARGET_OPTS: Array<{ v: EventKalender['target']; label: string }> = [
  { v: 'all', label: 'Semua peran' },
  { v: 'mahasiswa', label: 'Hanya mahasiswa' },
  { v: 'dosen', label: 'Hanya dosen' },
];

const EMPTY: EventKalenderInput = {
  judul: '',
  jenis: 'akademik',
  tanggalMulai: '',
  target: 'all',
};

export function AkademikKalender() {
  const periode = usePeriode();
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const { data, isLoading, error } = useKalenderAkademik({
    semesterId: filterSemester || undefined,
    jenis: filterJenis || undefined,
  });
  const actions = useKalenderActions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventKalender | null>(null);
  const [form, setForm] = useState<EventKalenderInput>(EMPTY);
  const [actErr, setActErr] = useState<string | null>(null);

  const semesterOptions = useMemo(
    () => periode.data?.items.flatMap((ta) => ta.semester.map((s) => ({ id: s.id, label: `${s.jenis} ${ta.kode}` }))) ?? [],
    [periode.data],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setActErr(null);
    setModalOpen(true);
  };
  const openEdit = (e: EventKalender) => {
    setEditing(e);
    setForm({
      judul: e.judul,
      deskripsi: e.deskripsi,
      jenis: e.jenis,
      tanggalMulai: e.tanggalMulai.slice(0, 16),
      tanggalSelesai: e.tanggalSelesai ? e.tanggalSelesai.slice(0, 16) : null,
      target: e.target,
      warna: e.warna,
      semesterId: e.semesterId,
    });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.judul.trim()) { setActErr('Judul wajib diisi'); return; }
    if (!form.tanggalMulai) { setActErr('Tanggal mulai wajib diisi'); return; }
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, patch: form });
      else await actions.create.mutateAsync(form);
      setModalOpen(false);
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  const onDelete = async (e: EventKalender) => {
    if (!confirm(`Hapus event "${e.judul}"?`)) return;
    setActErr(null);
    try { await actions.remove.mutateAsync(e.id); }
    catch (err) { setActErr(err instanceof ApiError ? err.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Kalender Akademik"
        subtitle="Atur jadwal kampus: UTS/UAS, libur, periode KRS, dan event lain. Mahasiswa & dosen membaca sesuai target."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
            Tambah Event
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Semester" value={filterSemester} onChange={(e) => setFilterSemester((e.target as HTMLSelectElement).value)}>
            <option value="">Semua semester</option>
            {semesterOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Jenis" value={filterJenis} onChange={(e) => setFilterJenis((e.target as HTMLSelectElement).value)}>
            <option value="">Semua jenis</option>
            {JENIS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada event">Klik "Tambah Event" untuk membuat yang pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((e) => (
          <Card key={e.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CalendarDays size={16} className="muted" />
                  <strong style={{ color: 'var(--text-strong)' }}>{e.judul}</strong>
                  <span className="pill pill--neutral">{labelJenis(e.jenis)}</span>
                  <span className="pill pill--neutral">{labelTarget(e.target)}</span>
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {formatTanggal(e.tanggalMulai)}{e.tanggalSelesai && ` → ${formatTanggal(e.tanggalSelesai)}`}
                  {e.semester && ` · ${e.semester.jenis} ${e.semester.tahunAjaran.kode}`}
                </div>
                {e.deskripsi && <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{e.deskripsi}</p>}
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)} leftIcon={<Pencil size={14} />}>Ubah</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(e)} leftIcon={<Trash2 size={14} />}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah event' : 'Event kalender baru'} width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} placeholder="UTS Semester Ganjil 2025/2026" />
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
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Jenis" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as EventKalender['jenis'] })}>
                {JENIS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Target" value={form.target} onChange={(e) => setForm({ ...form, target: (e.target as HTMLSelectElement).value as EventKalender['target'] })}>
                {TARGET_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal mulai" type="datetime-local" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal selesai (opsional)" type="datetime-local" value={form.tanggalSelesai ?? ''} onChange={(e) => setForm({ ...form, tanggalSelesai: (e.target as HTMLInputElement).value || null })} />
            </div>
          </div>
          <Select label="Semester (opsional)" value={form.semesterId ?? ''} onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value || null })}>
            <option value="">— tanpa semester —</option>
            {semesterOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending || actions.update.isPending} onClick={save}>
              {actions.create.isPending || actions.update.isPending ? 'Menyimpan…' : (editing ? 'Simpan' : 'Tambah')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function labelJenis(j: EventKalender['jenis']): string {
  return JENIS_OPTS.find((o) => o.v === j)?.label ?? j;
}
function labelTarget(t: EventKalender['target']): string {
  return TARGET_OPTS.find((o) => o.v === t)?.label ?? t;
}
