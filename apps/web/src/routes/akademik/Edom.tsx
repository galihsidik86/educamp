import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Trash2, Power, ChevronRight, BarChart3 } from 'lucide-react';
import {
  useEdomKuesionerList, useEdomKuesionerDetail, useEdomAkademikActions,
  usePeriode, type EdomKuesionerItem,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';

export function AkademikEdom() {
  const { data, isLoading, error } = useEdomKuesionerList();
  const { createKuesioner, updateKuesioner, deleteKuesioner } = useEdomAkademikActions();
  const periode = usePeriode();
  const [createOpen, setCreateOpen] = useState(false);
  const [manage, setManage] = useState<EdomKuesionerItem | null>(null);
  const [form, setForm] = useState({ judul: '', semesterId: '' });
  const [actErr, setActErr] = useState<string | null>(null);

  const submitCreate = async () => {
    setActErr(null);
    try {
      await createKuesioner.mutateAsync(form);
      setCreateOpen(false);
      setForm({ judul: '', semesterId: '' });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const toggleAktif = async (k: EdomKuesionerItem) => {
    try { await updateKuesioner.mutateAsync({ id: k.id, patch: { isAktif: !k.isAktif } }); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (k: EdomKuesionerItem) => {
    if (!confirm(`Hapus kuesioner "${k.judul}"? Semua aspek dan jawaban responden akan terhapus.`)) return;
    try { await deleteKuesioner.mutateAsync(k.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  // ambil daftar semester dari periode
  const semesterOptions = periode.data?.items.flatMap((ta) =>
    ta.semester.map((s) => ({ id: s.id, label: `${s.kode} · ${ta.kode} ${s.jenis}` })),
  ) ?? [];

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Kelola EDOM"
        subtitle="Susun kuesioner Evaluasi Dosen oleh Mahasiswa, aktifkan, dan lihat rekap."
        right={
          <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => { setActErr(null); setCreateOpen(true); }}>
            Kuesioner Baru
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada kuesioner">Klik "Kuesioner Baru" untuk menyusun yang pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => (
          <Card key={k.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{k.judul}</strong>
                  {k.isAktif
                    ? <span className="pill pill--success">Aktif</span>
                    : <span className="pill pill--neutral">Tidak aktif</span>}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  Semester <span className="mono">{k.semester.kode}</span> ({k.semester.jenis}) · {k._count.aspek} aspek · {k._count.response} response
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" leftIcon={<Power size={14} />} onClick={() => toggleAktif(k)}>
                  {k.isAktif ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setManage(k)}>Kelola Aspek</Button>
                <Link
                  to={`/akademik/edom/${k.id}/rekap`}
                  className="tz-btn tz-btn--ghost tz-btn--sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <BarChart3 size={14} /> Rekap
                </Link>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => onDelete(k)}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Kuesioner EDOM baru" width={520}>
        <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} placeholder="EDOM Semester Ganjil 2026/2027" />
          <Select label="Semester" value={form.semesterId} onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value })}>
            <option value="">— Pilih semester —</option>
            {semesterOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={!form.judul || !form.semesterId || createKuesioner.isPending} onClick={submitCreate}>
              {createKuesioner.isPending ? 'Membuat…' : 'Buat'}
            </Button>
          </div>
        </div>
      </Modal>

      {manage && (
        <KuesionerModal item={manage} onClose={() => setManage(null)} />
      )}
    </div>
  );
}

function KuesionerModal({ item, onClose }: { item: EdomKuesionerItem; onClose: () => void }) {
  const detail = useEdomKuesionerDetail(item.id);
  const { addAspek, deleteAspek } = useEdomAkademikActions();
  const [pertanyaan, setPertanyaan] = useState('');
  const [actErr, setActErr] = useState<string | null>(null);

  const submitAspek = async () => {
    if (!pertanyaan.trim()) return;
    setActErr(null);
    try {
      await addAspek.mutateAsync({ kuesionerId: item.id, pertanyaan });
      setPertanyaan('');
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Kelola aspek — ${item.judul}`} width={680}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        {detail.data?.aspek.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>Belum ada aspek. Tambahkan minimal 1 aspek agar mahasiswa dapat mengisi.</p>
        )}

        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {detail.data?.aspek.map((a) => (
            <div key={a.id} className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', minWidth: 24 }}>{a.urutan}</div>
              <div style={{ flex: 1 }}>{a.pertanyaan}</div>
              <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => deleteAspek.mutate(a.id)}>Hapus</Button>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'flex-end', borderTop: '1px dashed var(--border-default)', paddingTop: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Pertanyaan baru" value={pertanyaan} onChange={(e) => setPertanyaan((e.target as HTMLInputElement).value)} placeholder="Dosen menyampaikan materi dengan jelas" />
          </div>
          <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} disabled={!pertanyaan.trim() || addAspek.isPending} onClick={submitAspek}>
            Tambah
          </Button>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onClose} rightIcon={<ChevronRight size={14} />}>Selesai</Button>
        </div>
      </div>
    </Modal>
  );
}
