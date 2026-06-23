import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { useMahasiswaTugas } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';

export function MahasiswaTugas() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useMahasiswaTugas();

  return (
    <div className="stack">
      <PageHead
        eyebrow="AKADEMIK"
        title="Pengumpulan Tugas & Ujian"
        subtitle="Tugas, UTS, UAS, dan praktikum dari semua mata kuliah yang Anda ikuti."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada tugas">Dosen belum memberikan tugas, atau KRS Anda belum disetujui.</Alert>
      )}

      <div className="stack">
        {data?.items.map((t) => {
          const dueIn = new Date(t.deadline).getTime() - Date.now();
          const overdue = dueIn < 0;
          const due24h = dueIn > 0 && dueIn < 24 * 3600 * 1000;
          return (
            <Card key={t.id}>
              <div
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => navigate(`/mahasiswa/tugas/${t.id}`)}
              >
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <FileText size={16} className="muted" />
                    <strong style={{ color: 'var(--text-strong)' }}>{t.judul}</strong>
                    {t.submission && <StatusPill status={t.submission.status} />}
                    {due24h && !t.submission && <span className="pill pill--warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Mendekati deadline</span>}
                    {overdue && !t.submission && <span className="pill pill--danger">Lewat deadline</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {t.kodeMK} · {t.namaMK} · Deadline {formatTanggalWaktu(t.deadline)}
                  </div>
                  {t.submission?.nilai != null && (
                    <div style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                      Nilai: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{t.submission.nilai}</strong> / {t.maxNilai}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="muted" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
