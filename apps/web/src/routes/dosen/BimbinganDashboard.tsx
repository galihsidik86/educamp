import { Link } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { Users, AlertTriangle, Activity, BookCheck, Award, ChevronRight } from 'lucide-react';
import { useDpaDashboard } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { Skeleton } from '@/components/Skeleton';

const STATUS_LABEL: Record<string, string> = {
  aktif: 'Aktif', cuti: 'Cuti', lulus: 'Lulus', drop_out: 'Drop out', mengundurkan_diri: 'Mengundurkan diri',
};

export function DosenBimbinganDashboard() {
  const { data, isLoading, error } = useDpaDashboard();

  return (
    <div className="stack">
      <PageHead
        eyebrow="BIMBINGAN AKADEMIK"
        title="Dashboard DPA"
        subtitle="Ringkasan akademik mahasiswa bimbingan Anda di semester aktif."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.ringkasan.totalMahasiswa === 0 && (
        <Alert variant="info" title="Belum ada bimbingan">Anda belum ditetapkan sebagai DPA mahasiswa manapun.</Alert>
      )}

      {data && data.ringkasan.totalMahasiswa > 0 && (
        <>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            Periode: <strong>{data.ringkasan.semester.nama}</strong>
            {' · '}Threshold IPK at-risk: <strong className="mono">{data.ringkasan.threshold.ipkAtRisk}</strong>
            {' · '}Threshold kehadiran kritis: <strong className="mono">{data.ringkasan.threshold.kehadiranKritis}%</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <Kpi icon={<Users size={20} />} label="Mahasiswa bimbingan" value={String(data.ringkasan.totalMahasiswa)} />
            <Kpi icon={<BookCheck size={20} />} label="KRS pending" value={String(data.ringkasan.krsPending)} tone={data.ringkasan.krsPending > 0 ? 'warn' : undefined} />
            <Kpi icon={<AlertTriangle size={20} />} label={`IPK < ${data.ringkasan.threshold.ipkAtRisk}`} value={String(data.ringkasan.atRiskIpk)} tone={data.ringkasan.atRiskIpk > 0 ? 'danger' : undefined} />
            <Kpi icon={<Activity size={20} />} label="Kehadiran kritis" value={String(data.ringkasan.kritisKehadiran)} tone={data.ringkasan.kritisKehadiran > 0 ? 'danger' : undefined} />
            <Kpi icon={<Award size={20} />} label="IPK rata-rata" value={data.ringkasan.ipkRataRata != null ? data.ringkasan.ipkRataRata.toFixed(2) : '—'} />
          </div>

          <Card>
            <div className="tz-table-wrap">
              <table className="tz-table">
                <thead>
                  <tr>
                    <th>NIM</th>
                    <th>Nama</th>
                    <th>Angkatan</th>
                    <th>Status</th>
                    <th className="num">IPK</th>
                    <th className="num">SKS ambil</th>
                    <th className="num">% hadir</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((m) => (
                    <tr key={m.id}>
                      <td className="mono">{m.nim}</td>
                      <td>
                        <strong>{m.nama}</strong>
                        <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{m.prodi.kode}</div>
                      </td>
                      <td className="num mono">{m.angkatan}</td>
                      <td>
                        <span className="pill pill--neutral">{STATUS_LABEL[m.status] ?? m.status}</span>
                        {m.krsPending && <span className="pill pill--warning" style={{ marginLeft: 4 }}>KRS pending</span>}
                      </td>
                      <td className={`num mono ${m.atRiskIpk ? '' : ''}`} style={{ color: m.atRiskIpk ? 'var(--danger-fg)' : undefined, fontWeight: m.atRiskIpk ? 600 : undefined }}>
                        {m.ipk != null ? m.ipk.toFixed(2) : '—'}
                      </td>
                      <td className="num mono">{m.sksAmbil}</td>
                      <td className="num mono" style={{ color: m.kritisKehadiran ? 'var(--danger-fg)' : undefined, fontWeight: m.kritisKehadiran ? 600 : undefined }}>
                        {m.persenHadir != null ? `${m.persenHadir}%` : '—'}
                      </td>
                      <td className="num">
                        <Link to={`/dosen/bimbingan/${m.id}`} style={{ color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
                          Detail <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'warn' | 'danger' }) {
  const color = tone === 'danger' ? 'var(--danger-fg)' : tone === 'warn' ? 'var(--warning-fg)' : undefined;
  return (
    <Card>
      <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ color: color ?? 'var(--text-muted)' }}>{icon}</div>
        <div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 2, color }}>{value}</div>
        </div>
      </div>
    </Card>
  );
}
