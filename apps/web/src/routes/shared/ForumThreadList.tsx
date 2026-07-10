import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Plus, MessageCircle, Pin, Lock } from 'lucide-react';
import { useForumKelasThreads, useForumActions } from '@/lib/queries-forum';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function ForumKelasDetail() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/dosen') ? '/dosen/forum' : '/mahasiswa/forum';
  const { data, isLoading } = useForumKelasThreads(kelasId);
  const { createThread } = useForumActions(kelasId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ judul: '', isi: '' });
  const [actErr, setActErr] = useState<string | null>(null);

  const submit = async () => {
    setActErr(null);
    if (form.judul.length < 3) { setActErr('Judul minimal 3 karakter'); return; }
    if (form.isi.length < 3) { setActErr('Isi minimal 3 karakter'); return; }
    try {
      await createThread.mutateAsync(form);
      setOpen(false);
      setForm({ judul: '', isi: '' });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Kelas tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link to={basePath} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={data.kelas.namaMK}
        subtitle="Forum diskusi kelas — silakan ajukan pertanyaan atau bahas materi."
        right={<Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => { setActErr(null); setOpen(true); }}>Thread Baru</Button>}
      />

      {data.items.length === 0 && (
        <Alert variant="info" title="Belum ada diskusi">Mulai diskusi dengan membuat thread baru.</Alert>
      )}

      <div className="stack">
        {data.items.map((t) => (
          <Card key={t.id} hover>
            <div
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`${basePath}/${kelasId}/${t.id}`)}
            >
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  {t.isPinned && <Pin size={14} style={{ color: 'var(--info-fg)' }} />}
                  {t.isLocked && <Lock size={14} className="muted" />}
                  <strong style={{ color: 'var(--text-strong)' }}>{t.judul}</strong>
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {t.author?.role === 'dosen' && <span className="pill pill--info" style={{ marginRight: 4 }}>Dosen</span>}
                  oleh <strong style={{ color: 'var(--text-default)' }}>{t.author?.nama ?? '—'}</strong>
                  {' · '}{formatTanggalWaktu(t.createdAt)}
                </div>
              </div>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                <MessageCircle size={14} className="muted" />
                <span className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>{t.totalReply}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Thread baru" width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} />
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Isi</label>
            <textarea
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
              rows={8}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={createThread.isPending} onClick={submit}>
              {createThread.isPending ? 'Mengirim…' : 'Posting'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
