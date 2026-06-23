import { useState } from 'react';
import { Alert, Card, Select } from '@/ds';
import { Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useLaporanKehadiran, useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';

export function AkademikLaporanKehadiran() {
  const [filters, setFilters] = useState({ prodiId: '' });
  const { data, isLoading, error } = useLaporanKehadiran(filters);
  const prodi = useProdi();

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  const r = data.ringkasan;

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Laporan Kehadiran"
        subtitle={`Threshold kritis: kehadiran < ${data.threshold}%`}
        right={<Button variant="ghost" size="sm" leftIcon={<Printer size={14} />} onClick={() => window.print()}>Cetak</Button>}
      />

      <Card>
        <div className="row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <Stat label="Total Kelas" value={r.totalKelas} />
          <Stat label="Total Pertemuan" value={r.totalPertemuan} />
          <Stat label="Presensi Terisi" value={r.totalAbsensiSemua} />
          <Stat label="Kehadiran Global" value={r.persentaseGlobal != null ? `${r.persentaseGlobal}%` : '—'} />
          <Stat label="Mahasiswa Kritis" value={r.totalKritis} highlight={r.totalKritis > 0} />
        </div>
      </Card>

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 220 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Mata Kuliah</th>
              <th>Kelas</th>
              <th>Prodi</th>
              <th>Dosen</th>
              <th className="num">Pertemuan</th>
              <th className="num">Peserta</th>
              <th className="num">Hadir</th>
              <th className="num">Izin</th>
              <th className="num">Sakit</th>
              <th className="num">Alpa</th>
              <th className="num">%</th>
              <th className="num">Kritis</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr><td colSpan={13} className="muted center">Tidak ada kelas.</td></tr>
            )}
            {data.items.map((k) => (
              <tr key={k.kelasId}>
                <td className="mono">{k.kodeMK}</td>
                <td>{k.namaMK}</td>
                <td className="center">{k.kodeKelas}</td>
                <td><span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{k.prodi.kode}</span></td>
                <td>{k.dosen}</td>
                <td className="num">{k.totalPertemuan}</td>
                <td className="num">{k.totalPeserta}</td>
                <td className="num">{k.ringkasan.hadir}</td>
                <td className="num">{k.ringkasan.izin}</td>
                <td className="num">{k.ringkasan.sakit}</td>
                <td className="num">{k.ringkasan.alpa}</td>
                <td className="num">{k.persentaseRata != null ? `${k.persentaseRata}%` : '—'}</td>
                <td className="num">
                  {k.kritis > 0
                    ? <span className="pill pill--danger">{k.kritis}</span>
                    : <span className="muted">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-lg)',
        fontWeight: 'var(--fw-semibold)',
        color: highlight ? 'var(--danger-fg)' : 'var(--text-strong)',
      }}>{value}</div>
    </div>
  );
}
