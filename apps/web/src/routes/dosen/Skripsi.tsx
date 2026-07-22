import { Alert, Card } from '@/ds';
import { ExternalLink } from 'lucide-react';
import { useDosenSkripsi } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggal } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

export function DosenSkripsi() {
  const { data, isLoading, error } = useDosenSkripsi();

  return (
    <div className="stack">
      <PageHead
        eyebrow="BIMBINGAN"
        title="Skripsi Bimbingan"
        subtitle="Mahasiswa yang Anda bimbing sebagai Pembimbing 1 atau Pembimbing 2."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada bimbingan">Saat ini Anda belum ditetapkan sebagai pembimbing skripsi mahasiswa manapun.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <StatusPill status={s.status} />
                  <span className="pill pill--neutral">
                    {s.peran === 'pembimbing1' ? 'Pembimbing 1' : 'Pembimbing 2'}
                  </span>
                  {s.topik && <span className="pill pill--info">{s.topik}</span>}
                  {s.nilaiHuruf && <span className="pill pill--success">Nilai: {s.nilaiHuruf}</span>}
                </div>
                <div className="mono muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>{s.mahasiswa.nim} · {s.mahasiswa.prodi.kode}</div>
                <strong style={{ color: 'var(--text-strong)' }}>{s.mahasiswa.nama}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--text-default)' }}>{s.judul}</p>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  Diajukan {formatTanggal(s.tanggalAjuan)}
                  {s.tanggalDisetujui && ` · Disetujui ${formatTanggal(s.tanggalDisetujui)}`}
                  {s.tanggalSidang && ` · Sidang ${formatTanggal(s.tanggalSidang)}`}
                </div>
                {s.linkDokumen && (
                  <a href={s.linkDokumen} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-link)', marginTop: 6 }}>
                    Lihat dokumen <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
