import { Link } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { useMahasiswaKuisList } from '@/lib/queries-kuis';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

export function MahasiswaKuis() {
  const { data, isLoading, error } = useMahasiswaKuisList();

  return (
    <div className="stack">
      <PageHead
        eyebrow="PEMBELAJARAN"
        title="Kuis Online"
        subtitle="Kuis yang dipublikasikan oleh dosen pengampu kelas Anda."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada kuis">Dosen belum mempublish kuis untuk kelas Anda.</Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => {
          const now = Date.now();
          const mulai = new Date(k.mulai).getTime();
          const selesai = new Date(k.selesai).getTime();
          const sudahSubmit = k.attempt?.status === 'submit';
          const buka = now >= mulai && now <= selesai;
          return (
            <Card key={k.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{k.kelas.kodeMK} · Kelas {k.kelas.kodeKelas}</div>
                  <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <ClipboardList size={18} className="muted" />
                    <strong style={{ color: 'var(--text-strong)' }}>{k.judul}</strong>
                    {sudahSubmit && <span className="pill pill--success">Selesai</span>}
                    {!sudahSubmit && k.attempt?.status === 'berjalan' && <span className="pill pill--warning">Berjalan</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {formatTanggalWaktu(k.mulai)} → {formatTanggalWaktu(k.selesai)} · {k.durasiMenit} menit
                  </div>
                  {k.deskripsi && <p className="muted" style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{k.deskripsi}</p>}
                  {sudahSubmit && k.attempt && (
                    <div className="mono" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>
                      Skor: <strong>{k.attempt.skor}/{k.attempt.maxSkor}</strong> ({k.attempt.persen}%)
                    </div>
                  )}
                </div>
                <div>
                  {sudahSubmit ? (
                    <Link to={`/mahasiswa/kuis/${k.id}/hasil`}>
                      <Button size="sm" variant="ghost" rightIcon={<ChevronRight size={14} />}>Lihat hasil</Button>
                    </Link>
                  ) : buka ? (
                    <Link to={`/mahasiswa/kuis/${k.id}/kerjakan`}>
                      <Button size="sm" variant="primary" rightIcon={<ChevronRight size={14} />}>
                        {k.attempt?.status === 'berjalan' ? 'Lanjutkan' : 'Mulai kerjakan'}
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>{now < mulai ? 'Belum dimulai' : 'Sudah berakhir'}</Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
