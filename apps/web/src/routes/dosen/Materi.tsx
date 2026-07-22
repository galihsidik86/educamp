import { useNavigate } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronRight, BookOpen } from 'lucide-react';
import { useDosenKelas } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { capitalize } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

export function DosenMateriList() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDosenKelas();

  return (
    <div className="stack">
      <PageHead
        eyebrow="PENGAJARAN"
        title="Materi Ajar"
        subtitle="Unggah dan kelola materi (link, file, video, atau catatan) untuk setiap kelas yang Anda ampu."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.kelas.length === 0 && (
        <Alert variant="info" title="Tidak ada kelas">Anda belum ditugaskan kelas di semester aktif.</Alert>
      )}

      <div className="stack">
        {data?.kelas.map((k) => (
          <Card key={k.id} hover>
            <div
              className="row"
              role="button"
              tabIndex={0}
              style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`/dosen/materi/${k.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/dosen/materi/${k.id}`); } }}
            >
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
                <BookOpen size={20} className="muted" />
                <div>
                  <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{k.kodeMK} · Kelas {k.kodeKelas}</div>
                  <strong style={{ color: 'var(--text-strong)' }}>{k.namaMK}</strong>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {k.hari ? `${capitalize(k.hari)}, ${k.jamMulai}–${k.jamSelesai}` : 'Jadwal belum diatur'}
                    {k.ruangan && ` · ${k.ruangan}`} · {k.pesertaCount} peserta
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
