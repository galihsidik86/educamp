import { Link, useParams } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronLeft } from 'lucide-react';
import { useEdomRekap } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';

export function AkademikEdomRekap() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useEdomRekap(id);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  return (
    <div className="stack">
      <Link
        to="/akademik/edom"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke kuesioner
      </Link>

      <PageHead eyebrow="REKAP EDOM" title={data.kuesioner.judul} subtitle={`${data.items.length} kelas`} />

      {data.items.length === 0 && (
        <Card><p className="muted" style={{ margin: 0 }}>Belum ada response untuk kuesioner ini.</p></Card>
      )}

      {data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Dosen</th>
                <th>MK</th>
                <th>Kelas</th>
                <th className="num">Response</th>
                <th className="num">Peserta</th>
                <th className="num">% Resp</th>
                {data.aspek.map((a) => (
                  <th key={a.id} className="num" title={a.pertanyaan}>A{a.urutan}</th>
                ))}
                <th className="num">Rata2</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((k) => (
                <tr key={k.kelasId}>
                  <td>{k.dosen.nama}<div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{k.dosen.nidn}</div></td>
                  <td className="mono">{k.kodeMK}</td>
                  <td>{k.kodeKelas}</td>
                  <td className="num">{k.totalResponse}</td>
                  <td className="num">{k.peserta}</td>
                  <td className="num">{k.responseRate}%</td>
                  {data.aspek.map((a) => (
                    <td key={a.id} className="num mono">{k.rataAspek[a.id]?.toFixed(2) ?? '—'}</td>
                  ))}
                  <td className="num mono"><strong>{k.rataAgregat.toFixed(2)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <strong style={{ color: 'var(--text-strong)' }}>Legenda aspek</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 'var(--text-sm)' }}>
          {data.aspek.map((a) => (
            <li key={a.id} style={{ marginBottom: 4 }}>
              <span className="mono">A{a.urutan}</span> · {a.pertanyaan}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
