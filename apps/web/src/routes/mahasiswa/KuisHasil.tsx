import { Link, useParams } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { useMahasiswaKuisHasil } from '@/lib/queries-kuis';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';

export function MahasiswaKuisHasil() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useMahasiswaKuisHasil(id);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Hasil tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link to="/mahasiswa/kuis" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar kuis
      </Link>

      <PageHead
        eyebrow="HASIL KUIS"
        title={`Skor: ${data.skor} / ${data.maxSkor}`}
        subtitle={`${data.persen}%${data.selesaiPada ? ' · Selesai ' + formatTanggalWaktu(data.selesaiPada) : ''}`}
      />

      <div className="stack">
        {data.soal.map((s, i) => {
          const benar = s.jawabanAnda === s.jawabanBenar;
          return (
            <Card key={s.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Soal #{i + 1} · {s.bobot} poin</div>
                  <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap', fontWeight: 600 }}>{s.pertanyaan}</p>
                  <ol style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
                    {s.opsi.map((opt, idx) => {
                      const isCorrect = idx === s.jawabanBenar;
                      const isYours = idx === s.jawabanAnda;
                      return (
                        <li
                          key={idx}
                          style={{
                            color: isCorrect ? 'var(--success-fg)' : isYours ? 'var(--danger-fg)' : 'var(--text-muted)',
                            fontWeight: isCorrect || isYours ? 600 : 400,
                          }}
                        >
                          {opt}
                          {isCorrect && <span className="muted" style={{ fontSize: 'var(--text-xs)', marginLeft: 6 }}>(benar)</span>}
                          {isYours && !isCorrect && <span className="muted" style={{ fontSize: 'var(--text-xs)', marginLeft: 6 }}>(jawaban Anda)</span>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div>{benar ? <CheckCircle2 size={20} style={{ color: 'var(--success-fg)' }} /> : <XCircle size={20} style={{ color: 'var(--danger-fg)' }} />}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
