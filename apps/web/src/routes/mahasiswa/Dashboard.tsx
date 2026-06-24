import { Card, StatCard, Alert } from '@/ds';
import { GraduationCap, Wallet, ClipboardList, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDashboard } from '@/lib/queries';
import { formatRupiah, formatIp, formatTanggalWaktu, capitalize } from '@/lib/format';
import { DashboardHero } from '@/components/DashboardHero';
import { PengumumanWidget } from '@/components/PengumumanWidget';

export function MahasiswaDashboard() {
  const { state } = useAuth();
  const { data, isLoading, error } = useDashboard();

  if (state.status !== 'authenticated' || !state.user.mahasiswa) return null;
  const m = state.user.mahasiswa;

  return (
    <div className="stack">
      <DashboardHero
        eyebrow={data ? `SEMESTER ${data.semester.nama.toUpperCase()}` : 'PORTAL MAHASISWA'}
        title={`Assalamu'alaikum, ${m.nama.split(' ')[0]}`}
        subtitle={`${m.prodi.nama} · Angkatan ${m.angkatan}`}
        right={<>NIM {m.nim}</>}
      />

      {error && <Alert variant="danger" title="Gagal memuat dashboard">Coba muat ulang halaman.</Alert>}

      {data?.semester.krsSelesai && (
        <Alert variant="warning" title="Pengisian KRS aktif">
          Batas pengisian KRS — ditutup {formatTanggalWaktu(data.semester.krsSelesai)}.
        </Alert>
      )}

      <div className="kpi-grid">
        <StatCard label="IP Semester" value={isLoading ? '…' : formatIp(data?.ipSemester)} icon={<GraduationCap size={20} />} />
        <StatCard label="IPK" value={isLoading ? '…' : formatIp(data?.ipk)} icon={<GraduationCap size={20} />} />
        <StatCard label="SKS Diambil" value={isLoading ? '…' : (data?.sksAmbil ?? 0)} icon={<ClipboardList size={20} />} />
        <StatCard
          label="Tagihan Aktif"
          value={isLoading ? '…' : formatRupiah(data?.tagihanTotal ?? 0)}
          icon={<Wallet size={20} />}
        />
      </div>

      <div className="grid-2col">
        <Card>
          <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>
            <CalendarDays size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Jadwal hari ini ({data ? capitalize(data.today) : '—'})
          </h3>
          <div style={{ marginTop: 12 }}>
            {!data || data.jadwalHariIni.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Tidak ada jadwal hari ini.</p>
            ) : (
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.jadwalHariIni.map((j) => (
                  <li key={j.kode} className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: 'var(--text-strong)' }}>{j.nama}</strong>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{j.kode}</span> · Kelas {j.kodeKelas}
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

        <PengumumanWidget items={data?.pengumuman ?? []} seeAllPath="/mahasiswa/pengumuman" />
      </div>
    </div>
  );
}
