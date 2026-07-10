import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, ChevronLeft, ChevronRight, ClipboardList, BrainCircuit } from 'lucide-react';
import { useDosenKuisList, useDosenKuisActions, type DosenKuisItem, type KuisInput } from '@/lib/queries-kuis';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const EMPTY: KuisInput = {
  judul: '',
  durasiMenit: 30,
  mulai: '',
  selesai: '',
  masukNilaiTugas: false,
};

export function DosenKuisKelas() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDosenKuisList(kelasId);
  const actions = useDosenKuisActions(kelasId);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<KuisInput>(EMPTY);
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    if (!form.judul.trim() || !form.mulai || !form.selesai) { setActErr('Judul, mulai, dan selesai wajib diisi'); return; }
    try {
      const created = await actions.create.mutateAsync({
        ...form,
        mulai: new Date(form.mulai).toISOString(),
        selesai: new Date(form.selesai).toISOString(),
      });
      setModalOpen(false);
      navigate(`/dosen/kuis/${kelasId}/${(created as any).id}`);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <Link to="/dosen/kuis" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow="KUIS"
        title="Kuis kelas"
        subtitle="Kelola kuis online untuk kelas ini."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => { setForm(EMPTY); setActErr(null); setModalOpen(true); }}>
            Tambah Kuis
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={<BrainCircuit size={28} />}
          title="Belum ada kuis"
          description="Buat kuis pertama untuk kelas ini — bisa di-publish saat sudah punya minimal satu soal."
          action={
            <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => { setForm(EMPTY); setActErr(null); setModalOpen(true); }}>
              Tambah Kuis
            </Button>
          }
        />
      )}

      <div className="stack">
        {data?.items.map((k) => (
          <KuisCard key={k.id} kuis={k} onOpen={() => navigate(`/dosen/kuis/${kelasId}/${k.id}`)} />
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Kuis baru" width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} placeholder="Kuis Bab 1" />
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
            <div style={{ flex: 2 }}>
              <Input label="Mulai" type="datetime-local" value={form.mulai} onChange={(e) => setForm({ ...form, mulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 2 }}>
              <Input label="Selesai" type="datetime-local" value={form.selesai} onChange={(e) => setForm({ ...form, selesai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Durasi (mnt)" type="number" min="5" max="240" value={String(form.durasiMenit)} onChange={(e) => setForm({ ...form, durasiMenit: Number((e.target as HTMLInputElement).value) })} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.masukNilaiTugas ?? false}
              onChange={(e) => setForm({ ...form, masukNilaiTugas: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 'var(--text-sm)' }}>
              <strong>Hitung sebagai nilai Tugas</strong>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                Persen hasil kuis tiap mahasiswa ikut dirata-rata bersama nilai Tugas di Input Nilai.
              </div>
            </span>
          </label>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending} onClick={save}>{actions.create.isPending ? 'Menyimpan…' : 'Buat'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function KuisCard({ kuis, onOpen }: { kuis: DosenKuisItem; onOpen: () => void }) {
  return (
    <Card hover>
      <div
        className="row"
        role="button"
        tabIndex={0}
        style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      >
        <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
          <ClipboardList size={20} className="muted" />
          <div>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
              <strong style={{ color: 'var(--text-strong)' }}>{kuis.judul}</strong>
              <span className={`pill ${kuis.isPublished ? 'pill--success' : 'pill--neutral'}`}>{kuis.isPublished ? 'Published' : 'Draft'}</span>
              {kuis.masukNilaiTugas && <span className="pill pill--info" title="Hitung sebagai nilai Tugas">Tugas</span>}
            </div>
            <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
              {formatTanggalWaktu(kuis.mulai)} → {formatTanggalWaktu(kuis.selesai)}
              {' · '}{kuis.durasiMenit} mnt · {kuis._count.soal} soal · {kuis._count.attempt} attempt
            </div>
          </div>
        </div>
        <ChevronRight size={18} className="muted" />
      </div>
    </Card>
  );
}
