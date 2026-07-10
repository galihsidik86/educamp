import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Check, X, BookOpen, Microscope, HandHeart, Briefcase, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminBkdDetail, useAdminBkdRingkasan, useAdminBkdActions, type KategoriBkd } from '@/lib/queries-bkd';
import { safeHref } from '@/lib/format';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { PageLoadingSkeleton } from '@/components/Skeleton';
import { ApiError } from '@/lib/api';

const KATEGORI_INFO: Record<KategoriBkd, { label: string; icon: React.ReactNode }> = {
  pengajaran: { label: 'Pengajaran', icon: <BookOpen size={14} /> },
  penelitian: { label: 'Penelitian', icon: <Microscope size={14} /> },
  pengabdian: { label: 'Pengabdian', icon: <HandHeart size={14} /> },
  penunjang:  { label: 'Penunjang',  icon: <Briefcase size={14} /> },
};

export function AkademikBkdDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminBkdDetail(id);
  const ringkasan = useAdminBkdRingkasan(id);
  const actions = useAdminBkdActions();
  const [reject, setReject] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [actErr, setActErr] = useState<string | null>(null);

  const onDelete = async () => {
    if (!data) return;
    if (!confirm(`Hapus laporan BKD ini? Aksi ini permanen dan akan menghapus semua item.`)) return;
    setActErr(null);
    try {
      await actions.remove.mutateAsync(data.id);
      navigate('/akademik/bkd');
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal hapus'); }
  };

  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Laporan tidak ditemukan.</Alert>;

  const approve = async () => {
    if (!confirm('Setujui laporan BKD ini?')) return;
    setActErr(null);
    try { await actions.verifikasi.mutateAsync({ id: data.id, status: 'disetujui' }); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const submitReject = async () => {
    setActErr(null);
    if (catatan.trim().length < 5) { setActErr('Catatan penolakan wajib (minimal 5 karakter)'); return; }
    try {
      await actions.verifikasi.mutateAsync({ id: data.id, status: 'ditolak', catatan });
      setReject(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const grouped: Record<KategoriBkd, NonNullable<typeof data.items>> = {
    pengajaran: [], penelitian: [], pengabdian: [], penunjang: [],
  };
  for (const it of data.items ?? []) grouped[it.kategori]!.push(it);

  return (
    <div className="stack">
      <Link to="/akademik/bkd" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar BKD
      </Link>

      <PageHead
        eyebrow={`BKD · ${data.semester ? `${data.semester.jenis} ${data.semester.tahunAjaran.kode}` : ''}`}
        title={[data.dosen?.gelarDepan, data.dosen?.nama, data.dosen?.gelarBelakang].filter(Boolean).join(' ')}
        subtitle={`${data.dosen?.nidn} · ${data.dosen?.prodi.nama} · Total ${data.totalSks.toFixed(1)} SKS`}
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
              {(ringkasan.data?.[k] ?? 0).toFixed(1)} SKS
            </div>
          </Card>
        ))}
      </div>

      <div className="row" style={{ gap: 'var(--space-2)' }}>
        {data.status === 'diajukan' && (
          <>
            <Button size="sm" variant="primary" leftIcon={<Check size={14} />} onClick={approve} disabled={actions.verifikasi.isPending}>Setujui</Button>
            <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => setReject(true)}>Tolak</Button>
          </>
        )}
        {data.status !== 'disetujui' && (
          <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={onDelete} disabled={actions.remove.isPending}>
            Hapus
          </Button>
        )}
      </div>

      {(Object.keys(grouped) as KategoriBkd[]).map((k) => grouped[k].length > 0 && (
        <Card key={k}>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {KATEGORI_INFO[k].icon} {KATEGORI_INFO[k].label}
          </div>
          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr><th>Jenis</th><th>Deskripsi</th><th className="num">SKS</th><th>Sumber</th><th>Bukti</th></tr>
              </thead>
              <tbody>
                {grouped[k].map((it) => (
                  <tr key={it.id}>
                    <td><strong>{it.jenis}</strong></td>
                    <td>{it.deskripsi}</td>
                    <td className="num mono">{it.bobotSks.toFixed(1)}</td>
                    <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{it.sumberEntity ?? 'Manual'}</td>
                    <td>{it.fileUrl ? <a href={safeHref(it.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', fontSize: 'var(--text-xs)' }}>Lihat</a> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Modal open={reject} onClose={() => setReject(false)} title="Tolak laporan BKD" width={560}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Catatan penolakan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={4}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              placeholder="mis. Bobot SKS bimbingan tidak sesuai aturan EWMP."
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setReject(false)}>Batal</Button>
            <Button variant="primary" size="sm" onClick={submitReject} disabled={actions.verifikasi.isPending}>Tolak</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
