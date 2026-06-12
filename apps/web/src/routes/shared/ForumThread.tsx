import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Send, Pin, Lock, Trash2 } from 'lucide-react';
import { useForumThread, useForumActions } from '@/lib/queries-forum';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function ForumThreadDetail() {
  const { kelasId, threadId } = useParams<{ kelasId: string; threadId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/dosen') ? '/dosen/forum' : '/mahasiswa/forum';
  const { data, isLoading } = useForumThread(threadId);
  const { reply, moderate, deleteThread, deleteReply } = useForumActions(kelasId, threadId);

  const [body, setBody] = useState('');
  const [actErr, setActErr] = useState<string | null>(null);

  const submit = async () => {
    setActErr(null);
    if (body.trim().length === 0) { setActErr('Isi reply tidak boleh kosong'); return; }
    try {
      await reply.mutateAsync({ id: threadId!, isi: body });
      setBody('');
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const togglePin = async () => {
    if (!data) return;
    try { await moderate.mutateAsync({ id: threadId!, patch: { isPinned: !data.thread.isPinned } }); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };
  const toggleLock = async () => {
    if (!data) return;
    try { await moderate.mutateAsync({ id: threadId!, patch: { isLocked: !data.thread.isLocked } }); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDeleteThread = async () => {
    if (!confirm('Hapus thread ini beserta semua reply?')) return;
    try {
      await deleteThread.mutateAsync(threadId!);
      navigate(`${basePath}/${kelasId}`);
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDeleteReply = async (id: string) => {
    if (!confirm('Hapus reply ini?')) return;
    try { await deleteReply.mutateAsync(id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Thread tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link to={`${basePath}/${kelasId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar thread
      </Link>

      <PageHead
        eyebrow="THREAD DISKUSI"
        title={data.thread.judul}
        subtitle={`Oleh ${data.thread.author?.nama ?? '—'} · ${formatTanggalWaktu(data.thread.createdAt)}`}
        right={
          <div className="row" style={{ gap: 4 }}>
            {data.canModerate && (
              <>
                <Button size="sm" variant={data.thread.isPinned ? 'secondary' : 'ghost'} leftIcon={<Pin size={14} />} onClick={togglePin}>
                  {data.thread.isPinned ? 'Lepas Pin' : 'Pin'}
                </Button>
                <Button size="sm" variant={data.thread.isLocked ? 'secondary' : 'ghost'} leftIcon={<Lock size={14} />} onClick={toggleLock}>
                  {data.thread.isLocked ? 'Buka' : 'Kunci'}
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={onDeleteThread}>Hapus</Button>
          </div>
        }
      />

      {data.thread.isLocked && (
        <Alert variant="warning" title="Thread terkunci">Dosen pengampu mengunci thread ini. Reply baru tidak diterima.</Alert>
      )}

      <Card>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {data.thread.author?.role === 'dosen' && <span className="pill pill--info">Dosen</span>}
          <strong style={{ color: 'var(--text-strong)' }}>{data.thread.author?.nama ?? '—'}</strong>
          <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>· {formatTanggalWaktu(data.thread.createdAt)}</span>
        </div>
        <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{data.thread.isi}</p>
      </Card>

      <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>{data.replies.length} Reply</h3>

      <div className="stack">
        {data.replies.map((r) => (
          <Card key={r.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  {r.author?.role === 'dosen' && <span className="pill pill--info">Dosen</span>}
                  <strong style={{ color: 'var(--text-strong)' }}>{r.author?.nama ?? '—'}</strong>
                  <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>· {formatTanggalWaktu(r.createdAt)}</span>
                </div>
                <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{r.isi}</p>
              </div>
              <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDeleteReply(r.id)}>Hapus</Button>
            </div>
          </Card>
        ))}
      </div>

      {!data.thread.isLocked && (
        <Card>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Tulis reply</h3>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="tz-input"
            placeholder="Tulis reply Anda…"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" leftIcon={<Send size={14} />} disabled={reply.isPending} onClick={submit}>
              {reply.isPending ? 'Mengirim…' : 'Reply'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
