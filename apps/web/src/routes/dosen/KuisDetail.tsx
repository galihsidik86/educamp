import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Plus, Pencil, Trash2, Eye, BarChart3 } from 'lucide-react';
import {
  useDosenKuisDetail, useDosenKuisActions, useDosenKuisHasil,
  type SoalInput,
} from '@/lib/queries-kuis';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const EMPTY_SOAL: SoalInput = { pertanyaan: '', opsi: ['', '', '', ''], jawaban: 0, bobot: 1 };

export function DosenKuisDetail() {
  const { kelasId, kuisId } = useParams<{ kelasId: string; kuisId: string }>();
  const { data, isLoading, error } = useDosenKuisDetail(kuisId);
  const actions = useDosenKuisActions(kelasId, kuisId);

  const [tab, setTab] = useState<'soal' | 'hasil'>('soal');
  const [soalModalOpen, setSoalModalOpen] = useState(false);
  const [editingSoal, setEditingSoal] = useState<{ id: string; input: SoalInput } | null>(null);
  const [soalForm, setSoalForm] = useState<SoalInput>(EMPTY_SOAL);
  const [actErr, setActErr] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Kuis tidak ditemukan.</Alert>;

  const openAddSoal = () => {
    setEditingSoal(null);
    setSoalForm(EMPTY_SOAL);
    setActErr(null);
    setSoalModalOpen(true);
  };
  const openEditSoal = (s: typeof data.soal[number]) => {
    setEditingSoal({ id: s.id, input: { pertanyaan: s.pertanyaan, opsi: s.opsi, jawaban: s.jawaban, bobot: s.bobot, urutan: s.urutan } });
    setSoalForm({ pertanyaan: s.pertanyaan, opsi: s.opsi, jawaban: s.jawaban, bobot: s.bobot, urutan: s.urutan });
    setActErr(null);
    setSoalModalOpen(true);
  };

  const saveSoal = async () => {
    setActErr(null);
    if (!soalForm.pertanyaan.trim()) { setActErr('Pertanyaan wajib diisi'); return; }
    if (soalForm.opsi.some((o) => !o.trim())) { setActErr('Semua opsi wajib diisi (hapus opsi kosong)'); return; }
    if (soalForm.jawaban >= soalForm.opsi.length) { setActErr('Pilih index jawaban yang valid'); return; }
    try {
      if (editingSoal) await actions.updateSoal.mutateAsync({ id: editingSoal.id, patch: soalForm });
      else await actions.addSoal.mutateAsync(soalForm);
      setSoalModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const removeSoal = async (id: string) => {
    if (!confirm('Hapus soal ini?')) return;
    setActErr(null);
    try { await actions.removeSoal.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const togglePublish = async () => {
    setActErr(null);
    try { await actions.update.mutateAsync({ id: data.id, patch: { isPublished: !data.isPublished } }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const toggleMasukNilaiTugas = async () => {
    setActErr(null);
    try { await actions.update.mutateAsync({ id: data.id, patch: { masukNilaiTugas: !data.masukNilaiTugas } }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <Link to={`/dosen/kuis/${kelasId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar kuis
      </Link>

      <PageHead
        eyebrow={`${data.kelas.mataKuliah.kode} · KELAS ${data.kelas.kodeKelas}`}
        title={data.judul}
        subtitle={`${formatTanggalWaktu(data.mulai)} → ${formatTanggalWaktu(data.selesai)} · ${data.durasiMenit} menit · ${data.soal.length} soal`}
        right={
          <Button
            variant={data.isPublished ? 'ghost' : 'primary'}
            size="sm"
            leftIcon={<Eye size={14} />}
            onClick={togglePublish}
            disabled={actions.update.isPending || (data.soal.length === 0 && !data.isPublished)}
          >
            {data.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        }
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <Card>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', margin: 0 }}>
          <input
            type="checkbox"
            checked={data.masukNilaiTugas}
            onChange={toggleMasukNilaiTugas}
            disabled={actions.update.isPending}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 'var(--text-sm)' }}>
            <strong>Hitung sebagai nilai Tugas</strong>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
              Saat aktif, persen attempt mahasiswa untuk kuis ini ikut dirata-rata dengan nilai Tugas di Input Nilai (klik angka biru di kolom Tugas).
            </div>
          </span>
        </label>
      </Card>

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <Button size="sm" variant={tab === 'soal' ? 'primary' : 'ghost'} onClick={() => setTab('soal')}>Soal</Button>
        <Button size="sm" variant={tab === 'hasil' ? 'primary' : 'ghost'} onClick={() => setTab('hasil')} leftIcon={<BarChart3 size={14} />}>Hasil</Button>
      </div>

      {tab === 'soal' && (
        <>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openAddSoal}>Tambah Soal</Button>
          </div>
          {data.soal.length === 0 && <Alert variant="info" title="Belum ada soal">Tambahkan minimal 1 soal sebelum mempublish.</Alert>}
          <div className="stack">
            {data.soal.map((s, i) => (
              <Card key={s.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Soal #{i + 1} · {s.bobot} poin</div>
                    <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap', fontWeight: 600 }}>{s.pertanyaan}</p>
                    <ol style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                      {s.opsi.map((opt, idx) => (
                        <li key={idx} style={{ color: idx === s.jawaban ? 'var(--success-fg)' : 'var(--text-muted)', fontWeight: idx === s.jawaban ? 600 : 400 }}>
                          {opt} {idx === s.jawaban && <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>(jawaban benar)</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEditSoal(s)}>Ubah</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => removeSoal(s.id)}>Hapus</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'hasil' && <KuisHasilTable kuisId={data.id} />}

      <Modal open={soalModalOpen} onClose={() => setSoalModalOpen(false)} title={editingSoal ? 'Ubah soal' : 'Tambah soal'} width={700}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Pertanyaan</label>
            <textarea
              value={soalForm.pertanyaan}
              onChange={(e) => setSoalForm({ ...soalForm, pertanyaan: e.target.value })}
              rows={3}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Opsi jawaban — pilih radio untuk jawaban benar</div>
            {soalForm.opsi.map((opt, idx) => (
              <div key={idx} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  type="radio"
                  checked={soalForm.jawaban === idx}
                  onChange={() => setSoalForm({ ...soalForm, jawaban: idx })}
                />
                <Input value={opt} onChange={(e) => {
                  const opsi = [...soalForm.opsi];
                  opsi[idx] = (e.target as HTMLInputElement).value;
                  setSoalForm({ ...soalForm, opsi });
                }} placeholder={`Opsi ${idx + 1}`} />
                {soalForm.opsi.length > 2 && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const opsi = soalForm.opsi.filter((_, i) => i !== idx);
                    setSoalForm({ ...soalForm, opsi, jawaban: Math.min(soalForm.jawaban, opsi.length - 1) });
                  }}><Trash2 size={12} /></Button>
                )}
              </div>
            ))}
            {soalForm.opsi.length < 8 && (
              <Button size="sm" variant="ghost" leftIcon={<Plus size={12} />} onClick={() => setSoalForm({ ...soalForm, opsi: [...soalForm.opsi, ''] })}>Tambah opsi</Button>
            )}
          </div>
          <Input label="Bobot poin" type="number" min="1" max="100" value={String(soalForm.bobot ?? 1)} onChange={(e) => setSoalForm({ ...soalForm, bobot: Number((e.target as HTMLInputElement).value) })} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setSoalModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.addSoal.isPending || actions.updateSoal.isPending} onClick={saveSoal}>
              {actions.addSoal.isPending || actions.updateSoal.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function KuisHasilTable({ kuisId }: { kuisId: string }) {
  const { data, isLoading, error } = useDosenKuisHasil(kuisId);
  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  return (
    <div className="tz-table-wrap">
      <table className="tz-table">
        <thead>
          <tr>
            <th>NIM</th><th>Nama</th>
            <th>Status</th><th>Selesai</th>
            <th className="num">Skor</th><th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 && <tr><td colSpan={6} className="muted center">Belum ada peserta.</td></tr>}
          {data.items.map((it) => (
            <tr key={it.mahasiswaId}>
              <td className="mono">{it.nim}</td>
              <td>{it.nama}</td>
              <td>{it.attempt ? <span className="pill pill--neutral">{it.attempt.status}</span> : <span className="muted">Belum mulai</span>}</td>
              <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{it.attempt?.selesaiPada ? formatTanggalWaktu(it.attempt.selesaiPada) : '—'}</td>
              <td className="num mono"><strong>{it.attempt?.skor ?? '—'}{it.attempt?.maxSkor !== undefined && it.attempt.maxSkor !== null && ` / ${it.attempt.maxSkor}`}</strong></td>
              <td className="num mono">{it.attempt?.persen != null ? `${it.attempt.persen}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
