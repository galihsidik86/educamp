import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { CheckCircle2, Save, Plus, Trash2, ClipboardEdit } from 'lucide-react';
import { usePeriode, usePeriodeActions } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu, formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

export function AdminPeriode() {
  const { data, isLoading, error } = usePeriode();
  const actions = usePeriodeActions();
  const [actErr, setActErr] = useState<string | null>(null);
  const [createTaOpen, setCreateTaOpen] = useState(false);
  const [editTaFor, setEditTaFor] = useState<{ id: string; kode: string; nama: string; tahunMulai: number; tahunSelesai: number } | null>(null);
  const [createSemForTaId, setCreateSemForTaId] = useState<string | null>(null);

  const handleAktifkan = async (id: string) => {
    if (!confirm('Aktifkan semester ini? Semester lain akan dinonaktifkan.')) return;
    setActErr(null);
    try { await actions.aktifkan.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const handleAktifkanTa = async (id: string) => {
    if (!confirm('Aktifkan tahun ajaran ini? Tahun ajaran lain akan dinonaktifkan.')) return;
    setActErr(null);
    try { await actions.aktifkanTa.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const handleRemoveTa = async (id: string, kode: string) => {
    if (!confirm(`Hapus tahun ajaran ${kode}? Tidak bisa dibatalkan.`)) return;
    setActErr(null);
    try { await actions.removeTa.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal hapus'); }
  };

  const handleRemoveSemester = async (id: string, kode: string) => {
    if (!confirm(`Hapus semester ${kode}? Tidak bisa dibatalkan.`)) return;
    setActErr(null);
    try { await actions.removeSemester.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal hapus'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Periode KRS & Nilai"
        subtitle="Atur tahun ajaran, semester aktif, dan tanggal periode KRS/penilaian."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateTaOpen(true)}>
            Tambah Tahun Ajaran
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      <div className="stack">
        {data?.items.map((ta) => (
          <Card key={ta.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>
                  Tahun Ajaran {ta.kode}
                  {ta.isAktif && <span style={{ marginLeft: 8 }}><StatusPill status="aktif" /></span>}
                </h3>
                <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
                  {ta.nama} · {ta.tahunMulai}–{ta.tahunSelesai}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {!ta.isAktif && (
                  <Button size="sm" variant="primary" leftIcon={<CheckCircle2 size={14} />} onClick={() => handleAktifkanTa(ta.id)}>
                    Aktifkan TA
                  </Button>
                )}
                <Button size="sm" variant="ghost" leftIcon={<ClipboardEdit size={14} />} onClick={() => setEditTaFor(ta)}>Edit</Button>
                <Button size="sm" variant="ghost" leftIcon={<Plus size={14} />} onClick={() => setCreateSemForTaId(ta.id)}>Tambah Semester</Button>
                {!ta.isAktif && ta.semester.length === 0 && (
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => handleRemoveTa(ta.id, ta.kode)}>Hapus</Button>
                )}
              </div>
            </div>

            <div className="stack" style={{ marginTop: 12 }}>
              {ta.semester.length === 0 && <p className="muted" style={{ margin: 0 }}>Belum ada semester pada TA ini.</p>}
              {ta.semester.map((s) => (
                <SemesterRow
                  key={s.id}
                  semester={s}
                  onAktifkan={() => handleAktifkan(s.id)}
                  onHapus={() => handleRemoveSemester(s.id, s.kode)}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>

      <CreateTaModal open={createTaOpen} onClose={() => setCreateTaOpen(false)} onErr={setActErr} />
      <EditTaModal ta={editTaFor} onClose={() => setEditTaFor(null)} onErr={setActErr} />
      <CreateSemesterModal taId={createSemForTaId} onClose={() => setCreateSemForTaId(null)} onErr={setActErr} />
    </div>
  );
}

function SemesterRow({ semester, onAktifkan, onHapus }: {
  semester: { id: string; kode: string; jenis: string; isAktif: boolean; krsMulai: string | null; krsSelesai: string | null; prsMulai: string | null; prsSelesai: string | null; nilaiMulai: string | null; nilaiSelesai: string | null };
  onAktifkan: () => void;
  onHapus: () => void;
}) {
  const { updateSemester } = usePeriodeActions();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    krsMulai: semester.krsMulai?.slice(0, 16) ?? '',
    krsSelesai: semester.krsSelesai?.slice(0, 16) ?? '',
    prsMulai: semester.prsMulai?.slice(0, 16) ?? '',
    prsSelesai: semester.prsSelesai?.slice(0, 16) ?? '',
    nilaiMulai: semester.nilaiMulai?.slice(0, 16) ?? '',
    nilaiSelesai: semester.nilaiSelesai?.slice(0, 16) ?? '',
  });
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!!form.prsMulai !== !!form.prsSelesai) {
      setErr('Periode PRS harus diisi keduanya (mulai dan selesai) atau dikosongkan');
      return;
    }
    if (form.prsMulai && form.prsSelesai && form.prsMulai >= form.prsSelesai) {
      setErr('PRS Selesai harus lebih lambat dari PRS Mulai');
      return;
    }
    try {
      await updateSemester.mutateAsync({
        id: semester.id,
        patch: {
          krsMulai: form.krsMulai,
          krsSelesai: form.krsSelesai,
          prsMulai: form.prsMulai,
          prsSelesai: form.prsSelesai,
          nilaiMulai: form.nilaiMulai,
          nilaiSelesai: form.nilaiSelesai,
        },
      });
      setEditing(false);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div style={{ padding: 'var(--space-3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong style={{ color: 'var(--text-strong)' }}>{formatStatus(semester.jenis)} <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>({semester.kode})</span></strong>
          {semester.isAktif && <span style={{ marginLeft: 8 }}><StatusPill status="aktif" /></span>}
          <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            KRS: {formatTanggalWaktu(semester.krsMulai)} – {formatTanggalWaktu(semester.krsSelesai)}<br />
            PRS: {semester.prsMulai
              ? <>{formatTanggalWaktu(semester.prsMulai)} – {formatTanggalWaktu(semester.prsSelesai)}</>
              : <em>belum diatur</em>}<br />
            Penilaian: {formatTanggalWaktu(semester.nilaiMulai)} – {formatTanggalWaktu(semester.nilaiSelesai)}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {!semester.isAktif && (
            <Button size="sm" variant="primary" leftIcon={<CheckCircle2 size={14} />} onClick={onAktifkan}>
              Aktifkan
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Tutup' : 'Edit Tanggal'}
          </Button>
          {!semester.isAktif && (
            <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={onHapus}>Hapus</Button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-default)' }}>
          {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="KRS Mulai" type="datetime-local" value={form.krsMulai} onChange={(e) => setForm({ ...form, krsMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="KRS Selesai" type="datetime-local" value={form.krsSelesai} onChange={(e) => setForm({ ...form, krsSelesai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="PRS Mulai" type="datetime-local" value={form.prsMulai} onChange={(e) => setForm({ ...form, prsMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="PRS Selesai" type="datetime-local" value={form.prsSelesai} onChange={(e) => setForm({ ...form, prsSelesai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="Nilai Mulai" type="datetime-local" value={form.nilaiMulai} onChange={(e) => setForm({ ...form, nilaiMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="Nilai Selesai" type="datetime-local" value={form.nilaiSelesai} onChange={(e) => setForm({ ...form, nilaiSelesai: (e.target as HTMLInputElement).value })} />
            </div>
          </div>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 8, marginBottom: 0 }}>
            PRS opsional. Bila diisi, mahasiswa dapat menambah atau men-drop kelas pada rentang ini setelah KRS ditutup.
          </p>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" leftIcon={<Save size={14} />} onClick={save} disabled={updateSemester.isPending}>
              {updateSemester.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTaModal({ open, onClose, onErr }: { open: boolean; onClose: () => void; onErr: (s: string) => void }) {
  const actions = usePeriodeActions();
  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState({ kode: `${thisYear}/${thisYear + 1}`, nama: `${thisYear}/${thisYear + 1}`, tahunMulai: thisYear, tahunSelesai: thisYear + 1 });
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Tambah Tahun Ajaran" width={500}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.createTa.mutate(form, {
            onSuccess: () => onClose(),
            onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
          });
        }}
      >
        <Input label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} required placeholder="2025/2026" />
        <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} required />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Tahun Mulai" type="number" value={String(form.tahunMulai)} onChange={(e) => setForm({ ...form, tahunMulai: Number((e.target as HTMLInputElement).value) })} required />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tahun Selesai" type="number" value={String(form.tahunSelesai)} onChange={(e) => setForm({ ...form, tahunSelesai: Number((e.target as HTMLInputElement).value) })} required />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditTaModal({ ta, onClose, onErr }: { ta: { id: string; kode: string; nama: string; tahunMulai: number; tahunSelesai: number } | null; onClose: () => void; onErr: (s: string) => void }) {
  const actions = usePeriodeActions();
  const [form, setForm] = useState<{ kode: string; nama: string; tahunMulai: number; tahunSelesai: number } | null>(null);
  // Sinkronisasi form saat ta berubah
  if (ta && (!form || form.kode !== ta.kode)) {
    setForm({ kode: ta.kode, nama: ta.nama, tahunMulai: ta.tahunMulai, tahunSelesai: ta.tahunSelesai });
  }
  if (!ta || !form) return null;
  return (
    <Modal open={!!ta} onClose={onClose} title={`Edit Tahun Ajaran ${ta.kode}`} width={500}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.updateTa.mutate(
            { id: ta.id, body: form },
            {
              onSuccess: () => { setForm(null); onClose(); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          );
        }}
      >
        <Input label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} required />
        <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} required />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Tahun Mulai" type="number" value={String(form.tahunMulai)} onChange={(e) => setForm({ ...form, tahunMulai: Number((e.target as HTMLInputElement).value) })} required />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tahun Selesai" type="number" value={String(form.tahunSelesai)} onChange={(e) => setForm({ ...form, tahunSelesai: Number((e.target as HTMLInputElement).value) })} required />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={() => { setForm(null); onClose(); }}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateSemesterModal({ taId, onClose, onErr }: { taId: string | null; onClose: () => void; onErr: (s: string) => void }) {
  const actions = usePeriodeActions();
  const [form, setForm] = useState({ kode: '', jenis: 'ganjil' as 'ganjil' | 'genap' | 'pendek' });
  if (!taId) return null;
  return (
    <Modal open={!!taId} onClose={onClose} title="Tambah Semester" width={500}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\d{5}$/.test(form.kode)) {
            onErr('Kode semester harus 5 digit (mis. 20251)');
            return;
          }
          actions.createSemester.mutate(
            { tahunAjaranId: taId, ...form },
            {
              onSuccess: () => { setForm({ kode: '', jenis: 'ganjil' }); onClose(); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          );
        }}
      >
        <Input label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} required placeholder="20251" />
        <Select label="Jenis" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as any })}>
          <option value="ganjil">Ganjil</option>
          <option value="genap">Genap</option>
          <option value="pendek">Pendek (Sela)</option>
        </Select>
        <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
          Periode KRS/PRS/Nilai bisa diatur setelah semester dibuat melalui tombol "Edit Tanggal".
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
