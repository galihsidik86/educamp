import { Alert, Card } from '@/ds';
import { Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useLaporan } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { formatStatus } from '@/lib/format';
import { PageLoadingSkeleton } from '@/components/Skeleton';

export function AkademikLaporan() {
  const { data, isLoading, error } = useLaporan();

  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  return (
    <div className="stack">
      <PageHead
        eyebrow={`SEMESTER ${data.semester.nama.toUpperCase()}`}
        title="Laporan Akademik"
        subtitle="Ringkasan PDDikti-friendly. Cetak untuk dijadikan lampiran."
        right={<Button variant="ghost" size="sm" leftIcon={<Printer size={14} />} onClick={() => window.print()}>Cetak</Button>}
      />

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Mahasiswa per Program Studi</h3>
        <table className="tz-table">
          <thead>
            <tr>
              <th>Prodi</th><th>Kode</th>
              <th className="num">Aktif</th><th className="num">Cuti</th>
              <th className="num">Lulus</th><th className="num">DO</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.mahasiswaPerProdi.map((r) => (
              <tr key={r.kode}>
                <td>{r.prodi}</td>
                <td className="mono">{r.kode}</td>
                <td className="num">{r.aktif}</td>
                <td className="num">{r.cuti}</td>
                <td className="num">{r.lulus}</td>
                <td className="num">{r.drop_out}</td>
                <td className="num"><strong>{r.total}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Mahasiswa per Angkatan</h3>
        <table className="tz-table">
          <thead>
            <tr><th>Prodi</th><th>Angkatan</th><th className="num">Jumlah</th></tr>
          </thead>
          <tbody>
            {data.mahasiswaPerAngkatan.map((r, i) => (
              <tr key={i}>
                <td>{r.prodi}</td>
                <td className="mono">{r.angkatan}</td>
                <td className="num">{r.jumlah}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Dosen per Program Studi (Jabatan Fungsional)</h3>
        <table className="tz-table">
          <thead>
            <tr>
              <th>Prodi</th>
              <th className="num">Asisten Ahli</th><th className="num">Lektor</th>
              <th className="num">Lektor Kepala</th><th className="num">Guru Besar</th>
              <th className="num">Tenaga Pengajar</th><th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.dosenPerProdi.map((r) => (
              <tr key={r.kode}>
                <td>{r.prodi}</td>
                <td className="num">{r.asisten_ahli}</td>
                <td className="num">{r.lektor}</td>
                <td className="num">{r.lektor_kepala}</td>
                <td className="num">{r.guru_besar}</td>
                <td className="num">{r.tenaga_pengajar}</td>
                <td className="num"><strong>{r.total}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>KRS Semester Aktif</h3>
        <div className="row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {Object.entries(data.krsSemester).map(([k, v]) => (
            <div key={k}>
              <div className="muted" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{formatStatus(k)}</div>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--text-strong)' }}>{v}</strong>
            </div>
          ))}
          <div>
            <div className="muted" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>Nilai Finalized</div>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--text-strong)' }}>{data.nilaiSelesai}</strong>
          </div>
        </div>
      </Card>
    </div>
  );
}
