import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ClipboardList, GraduationCap, Wallet, Receipt, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNotifikasi, useNotifikasiActions, useUnreadCount, type Notifikasi } from '@/lib/queries-notifikasi';
import { roleHomePath } from '@/lib/routing';

const ICON: Record<string, React.ReactNode> = {
  krs: <ClipboardList size={16} />,
  nilai: <GraduationCap size={16} />,
  tagihan: <Wallet size={16} />,
  pembayaran: <Receipt size={16} />,
};

const COLOR: Record<string, string> = {
  krs: 'var(--info-fg)',
  nilai: 'var(--success-fg)',
  tagihan: 'var(--warning-fg)',
  pembayaran: 'var(--success-fg)',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { state } = useAuth();
  const unread = useUnreadCount(state.status === 'authenticated');
  const list = useNotifikasi({ take: 10 });
  const { markRead, markAllRead } = useNotifikasiActions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (state.status !== 'authenticated') return null;
  const role = state.user.role;
  const unreadCount = unread.data?.unread ?? 0;

  const onClickItem = async (n: Notifikasi) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        style={{
          position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 6, borderRadius: 'var(--radius-md)', color: 'var(--text-body)',
          display: 'inline-flex',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: 2, right: 2,
              minWidth: 16, height: 16, padding: '0 4px',
              fontSize: 10, fontWeight: 600, color: 'white',
              background: 'var(--danger-solid)', borderRadius: 'var(--radius-full)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--surface-card)', lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 'min(380px, calc(100vw - 24px))',
            maxHeight: 'min(480px, calc(100vh - var(--topbar-h) - 16px))',
            overflow: 'hidden',
            background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)',
            zIndex: 600, display: 'flex', flexDirection: 'column',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>Notifikasi</strong>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-link)', fontSize: 'var(--text-xs)',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <CheckCheck size={14} /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            {list.isLoading && <p className="muted" style={{ padding: 'var(--space-4)', margin: 0, fontSize: 'var(--text-sm)' }}>Memuat…</p>}
            {list.data?.items.length === 0 && (
              <p className="muted" style={{ padding: 'var(--space-4)', margin: 0, fontSize: 'var(--text-sm)' }}>Belum ada notifikasi.</p>
            )}
            {list.data?.items.map((n) => (
              <button
                key={n.id}
                onClick={() => onClickItem(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  border: 'none', cursor: 'pointer',
                  background: n.readAt ? 'transparent' : 'var(--blue-50)',
                }}
              >
                <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ color: COLOR[n.type ?? ''] ?? 'var(--text-muted)', marginTop: 2 }}>
                    {ICON[n.type ?? ''] ?? <Info size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: n.readAt ? 400 : 600, color: 'var(--text-strong)' }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2, lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                      {relativeTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.readAt && (
                    <Check size={12} style={{ color: 'var(--info-fg)', marginTop: 6 }} />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <button
              onClick={() => { setOpen(false); navigate(`${roleHomePath(role)}/notifikasi`); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-link)', fontSize: 'var(--text-sm)' }}
            >
              Lihat semua notifikasi →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'baru saja';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}
