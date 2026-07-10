import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { ChevronLeft, Plus, RefreshCw, Pencil, Trash2, Send, BookOpen, Microscope, HandHeart, Briefcase } from 'lucide-react';
import { useDosenBkdDetail, useDosenBkdActions, type BkdItem, type BkdItemInput, type KategoriBkd } from '@/lib/queries-bkd';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { PageLoadingSkeleton } from '@/components/Skeleton';
import { ApiError } from '@/lib/api';

const KATEGORI_INFO: Record<KategoriBkd, { label: string; icon: React.ReactNode; targetSks: string }> = {
  pengajaran: { label: 'Pengajaran', icon: <BookOpen size={14} />, targetSks: '≥4 SKS' },
  penelitian: { label: 'Penelitian', icon: <Microscope size={14} />, targetSks: '≥3 SKS' },
  pengabdian: { label: 'Pengabdian', icon: <HandHeart size={14} />, targetSks: '≥3 SKS' },
  penunjang:  { label: 'Penunjang',  icon: <Briefcase size={14} />, targetSks: '0–3 SKS' },
};

const EMPTY: BkdItemInput = { kategori: 'penunjang', jenis: '', deskripsi: '', bobotSks: 1 };

export function DosenBkdDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDosenBkdDetail(id);
  const actions = useDosenBkdActions(id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BkdItem | null>(null);
  const [form, setForm] = useState<BkdItemInput>(EMPTY);
  const [actErr, setActErr] = useState<string | null>(null);

  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Laporan tidak ditemukan.</Alert>;

  const isEditable = data.status === 'draft';
  const isResubmittable = data.status === 'ditolak';

  const openCreate = () => { setEditing(null); setForm(EMPTY); setActErr(null); setModalOpen(true); };
  const openEdit = (it: BkdItem) => {
    setEditing(it);
    setForm({ kategori: it.kategori, jenis: it.jenis, deskripsi: it.deskripsi, bobotSks: it.bobotSks, fileUrl: it.fileUrl });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.jenis || !form.deskripsi || !form.bobotSks) { setActErr('Jenis, deskripsi, dan bobot SKS wajib diisi'); return; }
    try {
      if (editing) await actions.updateItem.mutateAsync({ itemId: editing.id, patch: form });
      else await actions.addItem.mutateAsync({ id: data.id, body: form });
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDelete = async (it: BkdItem) => {
    if (!confirm(`Hapus item "${it.jenis}"?`)) return;
    setActErr(null);
    try { await actions.removeItem.mutateAsync(it.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onRefresh = async () => {
    setActErr(null);
    try { await actions.refresh.mutateAsync(data.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onSubmit = async () => {
    if (!confirm('Submit laporan untuk verifikasi akademik? Setelah submit, item tidak dapat diedit.')) return;
    setActErr(null);
    try { await actions.submit.mutateAsync(data.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  // Group items by kategori
  const grouped: Record<KategoriBkd, BkdItem[]> = {
    pengajaran: [], penelitian: [], pengabdian: [], penunjang: [],
  };
  for (const it of data.items ?? []) grouped[it.kategori].push(it);
  const totalPerKategori = (Object.keys(grouped) as KategoriBkd[]).reduce<Record<KategoriBkd, number>>((acc, k) => {
    acc[k] = grouped[k].reduce((s, i) => s + i.bobotSks, 0);
    return acc;
  }, { pengajaran: 0, penelitian: 0, pengabdian: 0, penunjang: 0 });

  return (
    <div className="stack">
      <Link to="/dosen/bkd" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar BKD
      </Link>

      <PageHead
        eyebrow={`BKD · ${data.semester ? `${data.semester.jenis} ${data.semester.tahunAjaran.kode}` : ''}`}
        title={`Total ${data.totalSks.toFixed(1)} SKS`}
        subtitle={`${data.items?.length ?? 0} item · Status laporan`}
        right={<StatusPill status={data.status} />}
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {data.catatanAkademik && (
        <Alert variant={data.status === 'disetujui' ? 'info' : 'warning'} title="Catatan akademik">
          {data.catatanAkademik}
        </Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        {(Object.keys(KATEGORI_INFO) as KategoriBkd[]).map((k) => (
          <Card key={k}>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="muted">{KATEGORI_INFO[k].icon}</span>
              <strong>{KATEGORI_INFO[k].label}</strong>
            </div>
            <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 6 }}>
              {totalPerKategori[k].toFixed(1)} SKS
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Target {KATEGORI_INFO[k].targetSks}</div>
          </Card>
        ))}
      </div>

      {(isEditable || isResubmittable) && (
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {isEditable && (
            <>
              <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} onClick={openCreate}>Tambah Item</Button>
              <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={14} />} onClick={onRefresh} disabled={actions.refresh.isPending}>
                {actions.refresh.isPending ? 'Refresh…' : 'Refresh auto-populate'}
              </Button>
            </>
          )}
          <Button size="sm" variant="primary" leftIcon={<Send size={14} />} onClick={onSubmit} disabled={actions.submit.isPending}>
            {actions.submit.isPending ? 'Mengirim…' : isResubmittable ? 'Submit ulang' : 'Submit BKD'}
          </Button>
        </div>
      )}

      {(Object.keys(grouped) as KategoriBkd[]).map((k) => grouped[k].length > 0 && (
        <Card key={k}>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {KATEGORI_INFO[k].icon} {KATEGORI_INFO[k].label}
          </div>
          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th>Deskripsi</th>
                  <th className="num">SKS</th>
                  <th>Sumber</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grouped[k].map((it) => (
                  <tr key={it.id}>
                    <td><strong>{it.jenis}</strong></td>
                    <td>{it.deskripsi}</td>
                    <td className="num mono">{it.bobotSks.toFixed(1)}</td>
                    <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{it.sumberEntity ?? 'Manual'}</td>
                    <td>
                      {isEditable && (
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => openEdit(it)}>Ubah</Button>
                          <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(it)}>Hapus</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah item' : 'Tambah item BKD'} width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: (e.target as HTMLSelectElement).value as KategoriBkd })}>
                {(Object.keys(KATEGORI_INFO) as KategoriBkd[]).map((k) => <option key={k} value={k}>{KATEGORI_INFO[k].label}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Bobot SKS" type="number" step="0.5" min="0.1" max="20" value={String(form.bobotSks)} onChange={(e) => setForm({ ...form, bobotSks: Number((e.target as HTMLInputElement).value) })} />
            </div>
          </div>
          <Input label="Jenis kegiatan" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLInputElement).value })} placeholder="Panitia Wisuda, Pembina Organisasi, dll" />
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Deskripsi</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={3}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <Input label="Link bukti / dokumen (opsional)" value={form.fileUrl ?? ''} onChange={(e) => setForm({ ...form, fileUrl: (e.target as HTMLInputElement).value })} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.addItem.isPending || actions.updateItem.isPending} onClick={save}>
              {actions.addItem.isPending || actions.updateItem.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
