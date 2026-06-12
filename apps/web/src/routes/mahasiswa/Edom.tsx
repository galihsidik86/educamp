import { useNavigate } from 'react-router-dom';
import { Alert, Card, Button } from '@/ds';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { useEdomList } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';

export function MahasiswaEdom() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useEdomList();

  return (
    <div className="stack">
      <PageHead
        eyebrow="AKADEMIK"
        title="Evaluasi Dosen oleh Mahasiswa (EDOM)"
        subtitle="Isi EDOM untuk semua kelas Anda. Jawaban anonim dari sisi dosen."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      {data && !data.kuesioner && (
        <Alert variant="info" title="Belum ada kuesioner aktif">
          Saat ini bagian akademik belum mengaktifkan kuesioner EDOM untuk semester ini.
        </Alert>
      )}

      {data?.kuesioner && (
        <>
          <Alert variant="info" title={data.kuesioner.judul}>
            {data.kuesioner.jumlahAspek} aspek pertanyaan. Skala penilaian 1 (sangat kurang) – 5 (sangat baik).
          </Alert>

          {data.items.length === 0 && (
            <Card><p className="muted" style={{ margin: 0 }}>Tidak ada kelas dengan KRS disetujui di semester aktif.</p></Card>
          )}

          <div className="stack">
            {data.items.map((k) => (
              <Card key={k.kelasId}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {k.kodeMK} · Kelas {k.kodeKelas} · {k.sks} SKS
                    </div>
                    <strong style={{ color: 'var(--text-strong)' }}>{k.namaMK}</strong>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Dosen: {k.dosen}</div>
                  </div>
                  <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                    {k.sudahDiisi
                      ? <span className="pill pill--success"><ClipboardCheck size={12} style={{ verticalAlign: 'middle' }} /> Sudah diisi</span>
                      : <span className="pill pill--warning">Belum diisi</span>}
                    <Button
                      size="sm"
                      variant={k.sudahDiisi ? 'ghost' : 'primary'}
                      onClick={() => navigate(`/mahasiswa/edom/${k.kelasId}`)}
                      rightIcon={<ChevronRight size={14} />}
                    >
                      {k.sudahDiisi ? 'Lihat' : 'Isi'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
