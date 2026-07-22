import { Link, useParams } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronLeft, ExternalLink, Link as LinkIcon, FileText, Video, FileType } from 'lucide-react';
import { useMahasiswaMateriDetail } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { formatTanggal, safeHref } from '@/lib/format';
import { PageLoadingSkeleton } from '@/components/Skeleton';

const JENIS_LABEL: Record<string, string> = { link: 'Tautan', file: 'File', text: 'Catatan', video: 'Video' };

function jenisIcon(j: string) {
  switch (j) {
    case 'link': return <LinkIcon size={14} />;
    case 'file': return <FileType size={14} />;
    case 'video': return <Video size={14} />;
    case 'text': return <FileText size={14} />;
    default: return null;
  }
}

export function MahasiswaMateriKelas() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const { data, isLoading, error } = useMahasiswaMateriDetail(kelasId);

  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang atau kembali.</Alert>;

  return (
    <div className="stack">
      <Link
        to="/mahasiswa/materi"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar mata kuliah
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas} · ${data.kelas.sks} SKS`}
        title={data.kelas.namaMK}
        subtitle={`Dosen: ${data.kelas.dosen}`}
      />

      {data.items.length === 0 && (
        <Alert variant="info" title="Belum ada materi">Dosen belum mengunggah bahan ajar untuk kelas ini.</Alert>
      )}

      <div className="stack">
        {data.items.map((it) => (
          <Card key={it.id}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="pill pill--neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {jenisIcon(it.jenis)} {JENIS_LABEL[it.jenis] ?? it.jenis}
              </span>
              {it.pertemuanKe && <span className="pill pill--info">Pertemuan {it.pertemuanKe}</span>}
              {it.tanggal && <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggal(it.tanggal)}</span>}
            </div>
            <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 6 }}>{it.judul}</strong>
            {it.deskripsi && <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{it.deskripsi}</p>}
            {it.url && (
              <a href={safeHref(it.url) ?? undefined} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-link)', marginTop: 6 }}>
                Buka {it.jenis === 'video' ? 'video' : it.jenis === 'file' ? 'file' : 'tautan'} <ExternalLink size={10} />
              </a>
            )}
            {it.jenis === 'text' && it.konten && (
              <pre style={{ margin: '8px 0 0', padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {it.konten}
              </pre>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
