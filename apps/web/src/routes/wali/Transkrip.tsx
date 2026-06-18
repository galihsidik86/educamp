import { Link, useParams } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ChevronLeft } from 'lucide-react';
import { useWaliTranskrip } from '@/lib/queries-wali';
import { PageHead } from '@/components/PageHead';

export function WaliTranskrip() {
  const { mahasiswaId } = useParams<{ mahasiswaId: string }>();
  const { data, isLoading, error } = useWaliTranskrip(mahasiswaId);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  // Group by semester
  const grouped = data.items.reduce<Record<string, typeof data.items>>((acc, it) => {
    if (!acc[it.semester]) acc[it.semester] = [];
    acc[it.semester]!.push(it);
    return acc;
  }, {});

  let cumSks = 0; let cumBobot = 0;

  return (
    <div className="stack">
      <Link to="/wali" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke dashboard
      </Link>

      <PageHead eyebrow="TRANSKRIP" title="Riwayat Nilai" subtitle="Nilai final per mata kuliah seluruh semester." />

      {data.items.length === 0 && (
        <Alert variant="info" title="Belum ada nilai">Belum ada mata kuliah dengan nilai final.</Alert>
      )}

      {Object.keys(grouped).sort().map((sem) => {
        const semItems = grouped[sem]!;
        const semSks = semItems.reduce((s, i) => s + i.sks, 0);
        const semBobot = semItems.reduce((s, i) => s + i.sks * (i.bobot ?? 0), 0);
        const semIp = semSks > 0 ? semBobot / semSks : 0;
        cumSks += semSks;
        cumBobot += semBobot;
        const ipk = cumSks > 0 ? cumBobot / cumSks : 0;

        return (
          <Card key={sem}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Semester {sem}
              </div>
              <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
                IP: <strong>{semIp.toFixed(2)}</strong> · IPK: <strong>{ipk.toFixed(2)}</strong> · {semSks} SKS
              </div>
            </div>
            <div className="tz-table-wrap">
              <table className="tz-table">
                <thead>
                  <tr><th>Kode MK</th><th>Mata Kuliah</th><th className="num">SKS</th><th className="center">Nilai</th><th className="num">Bobot</th></tr>
                </thead>
                <tbody>
                  {semItems.map((it, i) => (
                    <tr key={i}>
                      <td className="mono">{it.kodeMK}</td>
                      <td>{it.namaMK}</td>
                      <td className="num mono">{it.sks}</td>
                      <td className="center mono"><strong>{it.nilaiHuruf ?? '—'}</strong></td>
                      <td className="num mono">{it.bobot != null ? it.bobot.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
