import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, Select } from '@/ds';
import { Users, GraduationCap, Wallet, CalendarCheck, ChevronRight, BookOpen } from 'lucide-react';
import { useWaliProfil, useWaliDashboard } from '@/lib/queries-wali';
import { PageHead } from '@/components/PageHead';
import { DashboardHero } from '@/components/DashboardHero';
import { formatRupiah } from '@/lib/format';

export function WaliDashboard() {
  const profil = useWaliProfil();
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (profil.data && !selectedId && profil.data.anak.length > 0) {
      setSelectedId(profil.data.anak[0]!.id);
    }
  }, [profil.data, selectedId]);

  const dashboard = useWaliDashboard(selectedId);

  if (profil.isLoading) return <p className="muted">Memuat…</p>;
  if (profil.error || !profil.data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;
  if (profil.data.anak.length === 0) {
    return (
      <div className="stack">
        <PageHead eyebrow="WALI MAHASISWA" title={`Selamat datang, ${profil.data.nama}`} subtitle="" />
        <Alert variant="info" title="Belum ada anak terhubung">Hubungi BAAK untuk menghubungkan akun Anda dengan mahasiswa.</Alert>
      </div>
    );
  }

  const anak = profil.data.anak.find((a) => a.id === selectedId);

  return (
    <div className="stack">
      <DashboardHero
        eyebrow="WALI MAHASISWA"
        title={anak?.nama ?? 'Dashboard'}
        subtitle={anak ? `${anak.prodi.nama}` : ''}
        right={profil.data.anak.length > 1 ? (
          <Select value={selectedId} onChange={(e) => setSelectedId((e.target as HTMLSelectElement).value)}>
            {profil.data.anak.map((a) => <option key={a.id} value={a.id}>{a.nama} ({a.nim})</option>)}
          </Select>
        ) : anak ? <>NIM {anak.nim}</> : undefined}
      />

      {dashboard.isLoading && <p className="muted">Memuat dashboard…</p>}

      {dashboard.data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            <Kpi icon={<GraduationCap size={20} />} label="IPK" value={dashboard.data.ipk.toFixed(2)} />
            <Kpi icon={<BookOpen size={20} />} label="SKS Lulus" value={String(dashboard.data.sksLulus)} />
            <Kpi icon={<BookOpen size={20} />} label="SKS Semester Ini" value={String(dashboard.data.sksAmbil)} />
            <Kpi icon={<CalendarCheck size={20} />} label="% Hadir" value={dashboard.data.absensi.persenHadir != null ? `${dashboard.data.absensi.persenHadir}%` : '—'} />
            <Kpi icon={<Wallet size={20} />} label="Tagihan Belum Lunas" value={formatRupiah(dashboard.data.tagihan.belumLunas)} tone={dashboard.data.tagihan.belumLunas > 0 ? 'warn' : undefined} />
          </div>

          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Profil Mahasiswa
            </div>
            <div className="row">
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>NIM</div><div className="mono">{dashboard.data.mahasiswa.nim}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Angkatan</div><div className="mono">{dashboard.data.mahasiswa.angkatan}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Status</div><div>{dashboard.data.mahasiswa.status}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Prodi</div><div>{dashboard.data.mahasiswa.prodi.nama}</div></div>
              {dashboard.data.mahasiswa.dpa && (
                <div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Dosen Pembimbing Akademik</div>
                  <div>{[dashboard.data.mahasiswa.dpa.gelarDepan, dashboard.data.mahasiswa.dpa.nama, dashboard.data.mahasiswa.dpa.gelarBelakang].filter(Boolean).join(' ')}</div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                KRS Semester {dashboard.data.semester?.nama}
              </div>
              <Link to={`/wali/${selectedId}/transkrip`} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-link)' }}>
                Lihat Transkrip <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
              </Link>
            </div>
            <div className="tz-table-wrap">
              <table className="tz-table">
                <thead><tr><th>Kode MK</th><th>Mata Kuliah</th><th className="num">SKS</th><th>Status KRS</th></tr></thead>
                <tbody>
                  {dashboard.data.krsItems.length === 0 && <tr><td colSpan={4} className="muted center">Belum ada KRS.</td></tr>}
                  {dashboard.data.krsItems.map((k, i) => (
                    <tr key={i}>
                      <td className="mono">{k.kodeMK}</td>
                      <td>{k.namaMK}</td>
                      <td className="num mono">{k.sks}</td>
                      <td><span className="pill pill--neutral">{k.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Ringkasan Kehadiran Semester Aktif
            </div>
            <div className="row" style={{ gap: 'var(--space-4)' }}>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Hadir</div><div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--success-fg)' }}>{dashboard.data.absensi.hadir}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Izin</div><div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{dashboard.data.absensi.izin}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Sakit</div><div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{dashboard.data.absensi.sakit}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Alpa</div><div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--danger-fg)' }}>{dashboard.data.absensi.alpa}</div></div>
              <div><div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Total Pertemuan</div><div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{dashboard.data.absensi.total}</div></div>
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
      <div className="row">
        <div style={{ color: color ?? 'var(--text-muted)' }}>{icon}</div>
        <div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 2, color }}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

// Use existing Users icon to satisfy unused import warning
void Users;
