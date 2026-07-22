import { Link } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { Award, Printer, ChevronRight } from 'lucide-react';
import { useMahasiswaSertifikat, type JenisSertifikat } from '@/lib/queries-sertifikat';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

const JENIS_LABEL: Record<JenisSertifikat, string> = {
  kkn: 'KKN', mbkm: 'MBKM', edom: 'EDOM',
  workshop: 'Workshop', panitia: 'Kepanitiaan', asisten: 'Asisten', lain: 'Lain',
};

export function MahasiswaSertifikat() {
  const { data, isLoading, error } = useMahasiswaSertifikat();

  return (
    <div className="stack">
      <PageHead
        eyebrow="PORTFOLIO"
        title="Sertifikat Digital"
        subtitle="Sertifikat yang telah Anda terima — KKN, MBKM, workshop, dan kegiatan lain. Setiap sertifikat dilengkapi QR untuk verifikasi publik."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada sertifikat">
          Sertifikat akan otomatis terbit saat KKN/MBKM Anda selesai, atau dibuat oleh akademik untuk kegiatan workshop/kepanitiaan.
        </Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={18} className="muted" />
                  <strong style={{ color: 'var(--text-strong)' }}>{s.judul}</strong>
                  <span className="pill pill--neutral">{JENIS_LABEL[s.jenis]}</span>
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  No. {s.nomorSertifikat}
                  {' · '}Terbit {formatTanggal(s.tanggalTerbit)}
                  {s.periode && ` · ${s.periode}`}
                </div>
                {s.deskripsi && (
                  <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{s.deskripsi}</p>
                )}
              </div>
              <Link to={`/mahasiswa/sertifikat/${s.id}/cetak`}>
                <Button size="sm" variant="primary" leftIcon={<Printer size={14} />} rightIcon={<ChevronRight size={14} />}>
                  Lihat & Cetak
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
