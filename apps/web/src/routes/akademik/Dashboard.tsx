import { Card, StatCard, Alert } from '@/ds';
import { GraduationCap, Users, Building2, BookOpen, ClipboardList, Wallet, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAkademikDashboard } from '@/lib/queries-akademik';
import { DashboardHero } from '@/components/DashboardHero';
import { PengumumanWidget } from '@/components/PengumumanWidget';
import { formatRupiah } from '@/lib/format';

export function AkademikDashboard() {
  const { state } = useAuth();
  const { data, isLoading, error } = useAkademikDashboard();
  if (state.status !== 'authenticated' || !state.user.akademik) return null;
  const a = state.user.akademik;

  return (
    <div className="stack">
      <DashboardHero
        eyebrow={data ? `SEMESTER ${data.semester.nama.toUpperCase()}` : 'PORTAL AKADEMIK'}
        title={`Selamat datang, ${a.nama}`}
        subtitle="Sistem Informasi Akademik Tazkia"
        right={a.jabatan ? <>{a.jabatan}</> : <>Bagian Akademik</>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      {data && data.krsPending > 0 && (
        <Alert variant="warning" title={`${data.krsPending} KRS menunggu validasi`}>
          <Link to="/akademik/krs" style={{ color: 'inherit' }}>Buka halaman Validasi KRS</Link>
        </Alert>
      )}

      <div className="kpi-grid">
        <StatCard label="Mahasiswa Aktif" value={isLoading ? '…' : (data?.mahasiswa.aktif ?? 0)} icon={<GraduationCap size={20} />} />
        <StatCard label="Total Dosen" value={isLoading ? '…' : (data?.totalDosen ?? 0)} icon={<Users size={20} />} />
        <StatCard label="Program Studi" value={isLoading ? '…' : (data?.totalProdi ?? 0)} icon={<Building2 size={20} />} />
        <StatCard label="Mata Kuliah" value={isLoading ? '…' : (data?.totalMK ?? 0)} icon={<BookOpen size={20} />} />
        <StatCard label="Kelas Semester Ini" value={isLoading ? '…' : (data?.totalKelasSemester ?? 0)} icon={<ClipboardList size={20} />} />
        <StatCard label="KRS Diajukan" value={isLoading ? '…' : (data?.krsPending ?? 0)} icon={<AlertTriangle size={20} />} />
        <StatCard label="Tagihan Belum Lunas" value={isLoading ? '…' : (data?.tagihanBelumLunas ?? 0)} icon={<Wallet size={20} />} />
        <StatCard label="Total Belum Lunas" value={isLoading ? '…' : formatRupiah(data?.totalTagihanBelum ?? 0)} icon={<Wallet size={20} />} />
      </div>

      <div className="grid-2col">
        {data && (
          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Status mahasiswa</h3>
            <div className="row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap' }}>
              <Bar label="Aktif" value={data.mahasiswa.aktif} max={data.mahasiswa.total} variant="success" />
              <Bar label="Cuti" value={data.mahasiswa.cuti} max={data.mahasiswa.total} variant="neutral" />
              <Bar label="Lulus" value={data.mahasiswa.lulus} max={data.mahasiswa.total} variant="info" />
            </div>
          </Card>
        )}

        <PengumumanWidget items={data?.pengumuman ?? []} seeAllPath="/akademik/pengumuman" seeAllLabel="Kelola" />
      </div>
    </div>
  );
}

function Bar({ label, value, max, variant }: { label: string; value: number; max: number; variant: 'success' | 'neutral' | 'info' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = variant === 'success' ? 'var(--success-solid)' : variant === 'info' ? 'var(--info-solid)' : 'var(--neutral-400)';
  return (
    <div style={{ flex: '1 1 200px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{label}</span>
        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{value} ({pct}%)</strong>
      </div>
      <div style={{ marginTop: 4, height: 8, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
