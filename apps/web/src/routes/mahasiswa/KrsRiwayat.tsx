import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/ds';
import { useKrsRiwayat } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';

export function MahasiswaKrsRiwayat() {
  const navigate = useNavigate();
  const { data, isLoading } = useKrsRiwayat();

  return (
    <div className="stack">
      <PageHead
        eyebrow="MAHASISWA"
        title="Riwayat KRS"
        subtitle="Daftar KRS semester-semester sebelumnya."
        right={
          <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/krs')} leftIcon={<ArrowLeft size={14} />}>
            Kembali ke KRS
          </Button>
        }
      />

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.semesters.length === 0 && (
        <Card>
          <p className="muted" style={{ margin: 0 }}>Belum ada riwayat KRS.</p>
        </Card>
      )}

      {data?.semesters.map((s) => (
        <Card key={s.semester.kode}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <div>
              <span className="eyebrow">SEMESTER {s.semester.kode}</span>
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>{s.semester.nama}</h3>
            </div>
            <div className="muted" style={{ fontFamily: 'var(--font-mono)' }}>
              {s.items.length} MK · {s.totalSks} SKS
            </div>
          </div>
          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Mata Kuliah</th>
                  <th className="center">SKS</th>
                  <th>Kelas</th>
                  <th>Dosen</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((it) => (
                  <tr key={it.id}>
                    <td className="mono">{it.kelas.kodeMK}</td>
                    <td>{it.kelas.namaMK}</td>
                    <td className="num">{it.kelas.sks}</td>
                    <td>{it.kelas.kodeKelas}</td>
                    <td>{it.kelas.dosen}</td>
                    <td><StatusPill status={it.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
