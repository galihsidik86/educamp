import { useNavigate } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronRight, BookOpen } from 'lucide-react';
import { useMahasiswaMateri } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { Skeleton } from '@/components/Skeleton';

export function MahasiswaMateri() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useMahasiswaMateri();

  return (
    <div className="stack">
      <PageHead
        eyebrow="AKADEMIK"
        title="Materi Kuliah"
        subtitle="Bahan ajar dari dosen untuk setiap kelas yang Anda ikuti."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada kelas">KRS belum disetujui atau belum ada kelas semester aktif.</Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => (
          <Card key={k.kelasId} hover>
            <div
              className="row"
              role="button"
              tabIndex={0}
              style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`/mahasiswa/materi/${k.kelasId}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/mahasiswa/materi/${k.kelasId}`); } }}
            >
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
                <BookOpen size={20} className="muted" />
                <div>
                  <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{k.kodeMK} · Kelas {k.kodeKelas} · {k.sks} SKS</div>
                  <strong style={{ color: 'var(--text-strong)' }}>{k.namaMK}</strong>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    Dosen: {k.dosen}
                  </div>
                </div>
              </div>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>{k.totalBahanAjar} materi</span>
                <ChevronRight size={18} className="muted" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
