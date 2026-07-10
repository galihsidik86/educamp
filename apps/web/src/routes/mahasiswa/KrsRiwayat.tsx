import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Button, Card, Input } from '@/ds';
import { useKrsRiwayat } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Skeleton } from '@/components/Skeleton';

export function MahasiswaKrsRiwayat() {
  const navigate = useNavigate();
  const { data, isLoading } = useKrsRiwayat();
  const [q, setQ] = useState('');

  const semesters = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.semesters ?? [];
    return (data?.semesters ?? [])
      .map((s) => ({
        ...s,
        items: s.items.filter((it) =>
          it.kelas.namaMK.toLowerCase().includes(query) ||
          it.kelas.kodeMK.toLowerCase().includes(query) ||
          it.kelas.dosen.toLowerCase().includes(query),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [data, q]);

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

      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.semesters.length === 0 && (
        <Card>
          <p className="muted" style={{ margin: 0 }}>Belum ada riwayat KRS.</p>
        </Card>
      )}

      {data && data.semesters.length > 0 && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari mata kuliah atau dosen…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      )}
      {data && data.semesters.length > 0 && semesters.length === 0 && (
        <p className="muted">Tidak ada mata kuliah yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      {semesters.map((s) => (
        <Card key={s.semester.kode}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <div>
              <span className="eyebrow">SEMESTER {s.semester.kode}</span>
              <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>{s.semester.nama}</h3>
            </div>
            <div className="muted" style={{ fontFamily: 'var(--font-mono)' }}>
              {s.items.length} MK · {q.trim() ? s.items.reduce((n, it) => n + it.kelas.sks, 0) : s.totalSks} SKS
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
