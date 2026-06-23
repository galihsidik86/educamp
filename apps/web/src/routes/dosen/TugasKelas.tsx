import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Plus, Trash2, Pencil, Users } from 'lucide-react';
import { useDosenTugas, useDosenTugasActions, useDosenPertemuan, type DosenTugasItem, type DosenTugasInput, type Komponen } from '@/lib/queries-dosen';

const JENIS_LABEL: Record<Komponen, string> = {
  tugas: 'Tugas',
  uts: 'UTS',
  uas: 'UAS',
  praktikum: 'Praktikum',
};
const JENIS_OPTIONS: Komponen[] = ['tugas', 'uts', 'uas', 'praktikum'];
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function DosenTugasKelas() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDosenTugas(kelasId);
  const pertemuan = useDosenPertemuan(kelasId);
  const { create, update, remove } = useDosenTugasActions(kelasId);
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: DosenTugasItem } | null>(null);

  const onDelete = async (t: DosenTugasItem) => {
    if (!confirm(`Hapus tugas "${t.judul}"? Semua submission akan terhapus.`)) return;
    try { await remove.mutateAsync(t.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Kelas tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link to="/dosen/tugas" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={data.kelas.namaMK}
        subtitle="Pengumpulan tugas, UTS, UAS, atau praktikum untuk kelas ini."
        right={<Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setModal({ mode: 'create' })}>Tambah</Button>}
      />

      {data.items.length === 0 && (
        <Alert variant="info" title="Belum ada item">Klik "Tambah" untuk membuat tugas, UTS, UAS, atau praktikum pertama.</Alert>
      )}

      <div className="stack">
        {data.items.map((t) => (
          <Card key={t.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className={`pill ${t.jenis === 'tugas' ? 'pill--neutral' : 'pill--warning'}`}>{JENIS_LABEL[t.jenis]}</span>
                  <strong style={{ color: 'var(--text-strong)' }}>{t.judul}</strong>
                  {t.pertemuanKe && <span className="pill pill--info">Pertemuan {t.pertemuanKe}</span>}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  Deadline: {formatTanggalWaktu(t.deadline)} · Max nilai {t.maxNilai} · {t.totalSubmit} submit ({t.totalDinilai} dinilai)
                </div>
                {t.deskripsi && <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '6px 0 0' }}>{t.deskripsi}</p>}
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="secondary" leftIcon={<Users size={14} />} onClick={() => navigate(`/dosen/tugas/${kelasId}/${t.id}`)}>Submission</Button>
                <Button size="sm" variant="ghost" leftIcon={<Pencil size={14} />} onClick={() => setModal({ mode: 'edit', item: t })}>Edit</Button>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => onDelete(t)}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <TugasModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.item : undefined}
          pertemuanOptions={pertemuan.data?.items.map((p) => ({ id: p.id, label: `Pertemuan ${p.pertemuanKe}${p.topik ? ` — ${p.topik}` : ''}` })) ?? []}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            try {
              if (id) await update.mutateAsync({ id, patch: input });
              else await create.mutateAsync(input);
              setModal(null);
            } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
          }}
        />
      )}
    </div>
  );
}

function TugasModal({ mode, initial, pertemuanOptions, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: DosenTugasItem;
  pertemuanOptions: Array<{ id: string; label: string }>;
  onClose: () => void;
  onSubmit: (input: DosenTugasInput, id?: string) => void;
}) {
  const [form, setForm] = useState<DosenTugasInput>({
    judul: initial?.judul ?? '',
    deskripsi: initial?.deskripsi ?? '',
    deadline: initial?.deadline.slice(0, 16) ?? '',
    maxNilai: initial?.maxNilai ?? 100,
    linkLampiran: initial?.linkLampiran ?? '',
    pertemuanId: null,
    jenis: initial?.jenis ?? 'tugas',
  });

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Tugas / Ujian' : 'Edit'} width={640}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Jenis</label>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {JENIS_OPTIONS.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setForm({ ...form, jenis: j })}
                className={`pill ${form.jenis === j ? 'pill--success' : 'pill--neutral'}`}
                style={{ cursor: 'pointer', border: form.jenis === j ? '1px solid var(--success-fg)' : '1px solid transparent', padding: '4px 12px' }}
              >
                {JENIS_LABEL[j]}
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Nilai submission akan tersedia untuk disinkronkan ke kolom <strong>{JENIS_LABEL[form.jenis ?? 'tugas']}</strong> di Input Nilai.
          </div>
        </div>
        <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} />
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Deskripsi (opsional)</label>
          <textarea
            value={form.deskripsi ?? ''}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            rows={5}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="Max nilai" type="number" min="1" max="100" value={(form.maxNilai ?? 100).toString()} onChange={(e) => setForm({ ...form, maxNilai: Number((e.target as HTMLInputElement).value) })} /></div>
        </div>
        <Input label="Link lampiran (opsional)" value={form.linkLampiran ?? ''} onChange={(e) => setForm({ ...form, linkLampiran: (e.target as HTMLInputElement).value })} placeholder="https://..." />
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Terikat pertemuan (opsional)</label>
          <select
            value={form.pertemuanId ?? ''}
            onChange={(e) => setForm({ ...form, pertemuanId: e.target.value || null })}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-2) var(--space-3)' }}
          >
            <option value="">— Tidak terikat —</option>
            {pertemuanOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" onClick={() => onSubmit(form, initial?.id)}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
