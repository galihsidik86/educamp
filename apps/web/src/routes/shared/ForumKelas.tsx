import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { useForumKelas } from '@/lib/queries-forum';
import { PageHead } from '@/components/PageHead';

export function ForumKelasList() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/dosen') ? '/dosen/forum' : '/mahasiswa/forum';
  const { data, isLoading, error } = useForumKelas();

  return (
    <div className="stack">
      <PageHead
        eyebrow="DISKUSI"
        title="Forum Kelas"
        subtitle="Diskusi tanya jawab per mata kuliah."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada kelas">Belum ada kelas yang dapat dibuka di forum.</Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => (
          <Card key={k.kelasId} hover>
            <div
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`${basePath}/${k.kelasId}`)}
            >
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
                <MessageSquare size={20} className="muted" />
                <div>
                  <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{k.kodeMK} · Kelas {k.kodeKelas} · Semester {k.semester}</div>
                  <strong style={{ color: 'var(--text-strong)' }}>{k.namaMK}</strong>
                  {k.dosen && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Dosen: {k.dosen}</div>}
                </div>
              </div>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>{k.totalThread} thread</span>
                <ChevronRight size={18} className="muted" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
