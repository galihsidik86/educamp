import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Megaphone, AlertCircle } from 'lucide-react';
import { usePengumumanAkademik, usePengumumanActions, useProdi, type Pengumuman, type PengumumanInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AkademikPengumuman() {
  const { data, isLoading, error } = usePengumumanAkademik();
  const { create, update, remove } = usePengumumanActions();
  const prodi = useProdi();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pengumuman | null>(null);
  const [form, setForm] = useState<PengumumanInput>({ judul: '', isi: '', target: 'all', isPenting: false });
  const [actErr, setActErr] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ judul: '', isi: '', target: 'all', isPenting: false });
    setActErr(null);
    setModalOpen(true);
  };
  const openEdit = (p: Pengumuman) => {
    setEditing(p);
    setForm({
      judul: p.judul, isi: p.isi, target: p.target,
      pengirim: p.pengirim, isPenting: p.isPenting,
      tanggal: p.tanggal.slice(0, 16),
    });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.judul.trim() || !form.isi.trim()) { setActErr('Judul dan isi wajib diisi'); return; }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, patch: form });
      else await create.mutateAsync(form);
      setModalOpen(false);
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  const onDelete = async (p: Pengumuman) => {
    if (!confirm(`Hapus pengumuman "${p.judul}"?`)) return;
    setActErr(null);
    try { await remove.mutateAsync(p.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Pengumuman"
        subtitle="Kelola pengumuman untuk mahasiswa, dosen, dan prodi tertentu."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
            Tambah Pengumuman
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pengumuman">Klik "Tambah Pengumuman" untuk membuat yang pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  {p.isPenting
                    ? <AlertCircle size={16} style={{ color: 'var(--danger-fg)' }} />
                    : <Megaphone size={16} className="muted" />}
                  <strong style={{ color: 'var(--text-strong)' }}>{p.judul}</strong>
                  {p.isPenting && <span className="pill pill--danger">Penting</span>}
                  <span className="pill pill--neutral">{prettyTarget(p.target, prodi.data?.items)}</span>
                </div>
                <p className="muted" style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{p.isi}</p>
                <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {formatTanggalWaktu(p.tanggal)}
                  {p.pengirim && ` · ${p.pengirim}`}
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)} leftIcon={<Pencil size={14} />}>Ubah</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(p)} leftIcon={<Trash2 size={14} />}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah pengumuman' : 'Pengumuman baru'} width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} />
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Isi</label>
            <textarea
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
              rows={6}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Target" value={form.target} onChange={(e) => setForm({ ...form, target: (e.target as HTMLSelectElement).value })}>
                <option value="all">Semua peran</option>
                <option value="mahasiswa">Hanya mahasiswa</option>
                <option value="dosen">Hanya dosen</option>
                {prodi.data?.items.map((p) => <option key={p.id} value={`prodi:${p.id}`}>Prodi: {p.nama}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Pengirim (opsional)" value={form.pengirim ?? ''} onChange={(e) => setForm({ ...form, pengirim: (e.target as HTMLInputElement).value })} placeholder="mis. BAAK" />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={!!form.isPenting} onChange={(e) => setForm({ ...form, isPenting: e.target.checked })} />
            Tandai sebagai penting
          </label>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={create.isPending || update.isPending} onClick={save}>
              {create.isPending || update.isPending ? 'Menyimpan…' : (editing ? 'Simpan perubahan' : 'Publikasikan')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function prettyTarget(target: string, prodiList?: Array<{ id: string; nama: string }>): string {
  if (target === 'all') return 'Semua';
  if (target === 'mahasiswa') return 'Mahasiswa';
  if (target === 'dosen') return 'Dosen';
  if (target.startsWith('prodi:')) {
    const id = target.slice(6);
    const p = prodiList?.find((x) => x.id === id);
    return p ? `Prodi ${p.nama}` : 'Prodi';
  }
  return target;
}
