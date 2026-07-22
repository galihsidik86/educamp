import { Card, Alert } from '@/ds';
import { usePengabdian } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatRupiah } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

export function MahasiswaPengabdian() {
  const { data, isLoading, error } = usePengabdian();

  return (
    <div className="stack">
      <PageHead eyebrow="TRI DHARMA" title="Pengabdian kepada Masyarakat" subtitle="Kegiatan pengabdian yang Anda ikuti." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pengabdian">
          Anda belum terdaftar dalam kegiatan pengabdian. Hubungi dosen ketua pelaksana untuk bergabung.
        </Alert>
      )}

      <div className="card-list">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="card-list-item__title">{p.judul}</p>
                <div className="card-list-item__meta">
                  <span>Ketua: {p.ketua}</span>
                  <span>Peran: {p.peran}</span>
                  <span>Tahun: <span style={{ fontFamily: 'var(--font-mono)' }}>{p.tahun}</span></span>
                  {p.lokasi && <span>Lokasi: {p.lokasi}</span>}
                  {p.sumberDana && <span>Sumber dana: {p.sumberDana}</span>}
                  {p.jumlahDana != null && <span>Dana: {formatRupiah(p.jumlahDana)}</span>}
                </div>
              </div>
              <StatusPill status={p.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
