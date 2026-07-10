import { Alert, Card } from '@/ds';
import { Link } from 'react-router-dom';
import { useDosenKelas } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { TableSkeletonRows } from '@/components/Skeleton';
import { capitalize } from '@/lib/format';
import { ChevronRight } from 'lucide-react';

export function DosenInputNilaiList() {
  const { data, isLoading, error } = useDosenKelas();

  return (
    <div className="stack">
      <PageHead
        eyebrow="INPUT NILAI"
        title="Pilih Kelas"
        subtitle="Klik kelas untuk membuka tabel peserta dan input nilai."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode MK</th><th>Mata Kuliah</th>
              <th className="center">SKS</th><th>Kelas</th><th>Jadwal</th>
              <th className="center">Peserta</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows cols={7} rows={5} />}
            {data?.kelas.length === 0 && (
              <tr><td colSpan={7} className="muted center">Belum ada kelas yang Anda ampu.</td></tr>
            )}
            {data?.kelas.map((k) => (
              <tr key={k.id}>
                <td className="mono">{k.kodeMK}</td>
                <td>{k.namaMK}</td>
                <td className="num">{k.sks}</td>
                <td>
                  {k.kodeKelas}
                  {k.peran !== 'lead' && (
                    <span className="muted" style={{ fontSize: 'var(--text-xs)', marginLeft: 6 }}>· {capitalize(k.peran)}</span>
                  )}
                </td>
                <td className="mono">
                  {k.hari ? `${capitalize(k.hari)}, ${k.jamMulai}–${k.jamSelesai}` : '—'}
                  {k.ruangan && <span className="muted"> · {k.ruangan}</span>}
                </td>
                <td className="num">{k.pesertaCount}</td>
                <td className="num">
                  <Link to={`/dosen/nilai/${k.id}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
                    Buka <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
