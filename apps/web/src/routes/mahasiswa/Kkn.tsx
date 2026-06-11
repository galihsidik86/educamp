import { Card, Alert } from '@/ds';
import { useKkn } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggal } from '@/lib/format';

export function MahasiswaKkn() {
  const { data, isLoading, error } = useKkn();

  return (
    <div className="stack">
      <PageHead eyebrow="TRI DHARMA" title="Kuliah Kerja Nyata" subtitle="Riwayat pendaftaran & penugasan KKN." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat…</p></Card>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum mendaftar KKN">Pendaftaran KKN dibuka periode genap setiap tahun.</Alert>
      )}

      <div className="card-list">
        {data?.items.map((k) => (
          <Card key={k.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="card-list-item__title">Periode {k.periode}</p>
                <div className="card-list-item__meta">
                  <span>Lokasi: {k.lokasi}</span>
                  {k.desa && <span>Desa: {k.desa}</span>}
                  {k.kecamatan && <span>Kec.: {k.kecamatan}</span>}
                  {k.kabupaten && <span>Kab.: {k.kabupaten}</span>}
                  {k.dpl && <span>DPL: {k.dpl}</span>}
                  {k.tanggalMulai && <span>{formatTanggal(k.tanggalMulai)} – {formatTanggal(k.tanggalSelesai)}</span>}
                  {k.nilai && <span>Nilai: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{k.nilai}</strong></span>}
                </div>
              </div>
              <StatusPill status={k.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
