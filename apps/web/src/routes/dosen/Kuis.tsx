import { useNavigate } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { useDosenKelas } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { capitalize } from '@/lib/format';

export function DosenKuisList() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDosenKelas();

  return (
    <div className="stack">
      <PageHead
        eyebrow="PENGAJARAN"
        title="Kuis Online"
        subtitle="Susun kuis pilihan ganda, set timer, dan lihat hasil auto-grade per kelas."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.kelas.length === 0 && (
        <Alert variant="info" title="Tidak ada kelas">Anda belum ditugaskan kelas di semester aktif.</Alert>
      )}

      <div className="stack">
        {data?.kelas.map((k) => (
          <Card key={k.id} hover>
            <div
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`/dosen/kuis/${k.id}`)}
            >
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
                <ClipboardList size={20} className="muted" />
                <div>
                  <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{k.kodeMK} · Kelas {k.kodeKelas}</div>
                  <strong style={{ color: 'var(--text-strong)' }}>{k.namaMK}</strong>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {k.hari ? `${capitalize(k.hari)}, ${k.jamMulai}–${k.jamSelesai}` : 'Jadwal belum diatur'} · {k.pesertaCount} peserta
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
