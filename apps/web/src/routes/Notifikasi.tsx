// Halaman Notifikasi — shared semua peran.
// Route: /[role]/notifikasi (mounted di App.tsx untuk 3 peran).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { Bell, Check, CheckCheck, ClipboardList, GraduationCap, Wallet, Receipt, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotifikasi, useNotifikasiActions, type Notifikasi } from '@/lib/queries-notifikasi';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';

const PAGE = 25;

const ICON: Record<string, React.ReactNode> = {
  krs: <ClipboardList size={18} />,
  nilai: <GraduationCap size={18} />,
  tagihan: <Wallet size={18} />,
  pembayaran: <Receipt size={18} />,
};

const COLOR: Record<string, string> = {
  krs: 'var(--info-fg)',
  nilai: 'var(--success-fg)',
  tagihan: 'var(--warning-fg)',
  pembayaran: 'var(--success-fg)',
};

export function NotifikasiPage() {
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const [skip, setSkip] = useState(0);
  const { data, isLoading, error } = useNotifikasi({ onlyUnread: tab === 'unread', take: PAGE, skip });
  const { markRead, markAllRead } = useNotifikasiActions();
  const navigate = useNavigate();

  const page = Math.floor(skip / PAGE) + 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  const onClick = (n: Notifikasi) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="NOTIFIKASI"
        title="Semua Notifikasi"
        subtitle={data ? `${data.unread.toLocaleString('id-ID')} belum dibaca dari ${data.total.toLocaleString('id-ID')} total.` : undefined}
        right={
          data && data.unread > 0 && (
            <Button variant="ghost" size="sm" leftIcon={<CheckCheck size={14} />} onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              Tandai semua dibaca
            </Button>
          )
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="tablist">
        <button onClick={() => { setTab('unread'); setSkip(0); }} aria-selected={tab === 'unread'}>
          Belum dibaca {data?.unread != null && tab !== 'unread' ? `(${data.unread})` : ''}
        </button>
        <button onClick={() => { setTab('all'); setSkip(0); }} aria-selected={tab === 'all'}>
          Semua
        </button>
      </div>

      {isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat…</p></Card>}

      {data && data.items.length === 0 && (
        <Card>
          <div className="row" style={{ gap: 12, color: 'var(--text-muted)', alignItems: 'center' }}>
            <Bell size={20} />
            <p style={{ margin: 0 }}>{tab === 'unread' ? 'Tidak ada notifikasi belum dibaca.' : 'Belum ada notifikasi.'}</p>
          </div>
        </Card>
      )}

      <div className="card-list">
        {data?.items.map((n) => (
          <Card key={n.id} style={{ background: n.readAt ? undefined : 'var(--blue-50)', cursor: n.link ? 'pointer' : 'default' }} onClick={() => onClick(n)}>
            <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <div style={{ color: COLOR[n.type ?? ''] ?? 'var(--text-muted)', marginTop: 2 }}>
                {ICON[n.type ?? ''] ?? <Info size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{n.title}</strong>
                  <span className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{formatTanggalWaktu(n.createdAt)}</span>
                </div>
                {n.body && <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>{n.body}</p>}
              </div>
              {!n.readAt && (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }} leftIcon={<Check size={14} />}>
                  Dibaca
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {data && data.total > PAGE && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {(data.skip + 1).toLocaleString('id-ID')}–{Math.min(data.skip + data.take, data.total).toLocaleString('id-ID')} dari {data.total.toLocaleString('id-ID')}
          </span>
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button size="sm" variant="ghost" leftIcon={<ChevronLeft size={14} />} disabled={page === 1 || isLoading} onClick={() => setSkip(Math.max(0, skip - PAGE))}>
              Sebelumnya
            </Button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{page} / {totalPages}</span>
            <Button size="sm" variant="ghost" rightIcon={<ChevronRight size={14} />} disabled={page >= totalPages || isLoading} onClick={() => setSkip(skip + PAGE)}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
