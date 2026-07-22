import { Card, Alert } from '@/ds';
import { usePenelitian } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatRupiah } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

export function MahasiswaPenelitian() {
  const { data, isLoading, error } = usePenelitian();

  return (
    <div className="stack">
      <PageHead eyebrow="TRI DHARMA" title="Penelitian" subtitle="Penelitian yang Anda ikuti sebagai anggota/asisten." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada penelitian">
          Anda belum terdaftar sebagai anggota penelitian. Hubungi dosen ketua peneliti untuk diikutsertakan.
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
