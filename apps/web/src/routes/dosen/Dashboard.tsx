import { Card, StatCard, Alert } from '@/ds';
import { Users, BookOpen, FileText, HeartHandshake, CalendarDays, GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDosenDashboard } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { capitalize } from '@/lib/format';

export function DosenDashboard() {
  const { state } = useAuth();
  const { data, isLoading, error } = useDosenDashboard();
  if (state.status !== 'authenticated' || !state.user.dosen) return null;
  const d = state.user.dosen;
  const gelar = [d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ');

  return (
    <div className="stack">
      <PageHead
        eyebrow={data ? `SEMESTER ${data.semester.nama.toUpperCase()}` : 'PORTAL DOSEN'}
        title={`Selamat datang, ${gelar}`}
        subtitle={`${d.prodi.nama} · NIDN `}
        right={<span style={{ fontFamily: 'var(--font-mono)' }}>{d.nidn}</span>}
      />

      {error && <Alert variant="danger" title="Gagal memuat dashboard">Coba muat ulang.</Alert>}

      <div className="kpi-grid">
        <StatCard label="Kelas Diampu" value={isLoading ? '…' : (data?.kelasCount ?? 0)} icon={<BookOpen size={20} />} />
        <StatCard label="Total SKS Mengajar" value={isLoading ? '…' : (data?.totalSks ?? 0)} icon={<GraduationCap size={20} />} />
        <StatCard label="Mahasiswa di Kelas" value={isLoading ? '…' : (data?.totalMahasiswa ?? 0)} icon={<Users size={20} />} />
        <StatCard label="Bimbingan Akademik" value={isLoading ? '…' : (data?.totalBimbingan ?? 0)} icon={<Users size={20} />} />
        <StatCard label="Penelitian Aktif" value={isLoading ? '…' : (data?.penelitianAktif ?? 0)} icon={<FileText size={20} />} />
        <StatCard label="Pengabdian Aktif" value={isLoading ? '…' : (data?.pengabdianAktif ?? 0)} icon={<HeartHandshake size={20} />} />
      </div>

      <Card>
        <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>
          <CalendarDays size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Jadwal mengajar hari ini ({data ? capitalize(data.today) : '—'})
        </h3>
        <div style={{ marginTop: 12 }}>
          {!data || data.jadwalHariIni.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Tidak ada jadwal mengajar hari ini.</p>
          ) : (
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.jadwalHariIni.map((j) => (
                <li key={j.kode} className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ color: 'var(--text-strong)' }}>{j.nama}</strong>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{j.kode}</span> · Kelas {j.kodeKelas}
                      {j.ruangan ? ` · ${j.ruangan}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {j.jamMulai}–{j.jamSelesai}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
