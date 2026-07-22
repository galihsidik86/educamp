import { useState } from 'react';
import { Alert, Card, Select, StatCard } from '@/ds';
import { GraduationCap, Users, BarChart3, Award, Activity, ClipboardList } from 'lucide-react';
import { useAkreditasi, useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Skeleton } from '@/components/Skeleton';

const STATUS_LABEL: Record<string, string> = {
  aktif: 'Aktif',
  cuti: 'Cuti',
  lulus: 'Lulus',
  drop_out: 'Drop out',
  mengundurkan_diri: 'Mengundurkan diri',
};

export function AkademikAkreditasi() {
  const [prodiId, setProdiId] = useState<string>('');
  const prodi = useProdi();
  const { data, isLoading, error } = useAkreditasi(prodiId || undefined);

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAPORAN"
        title="Dashboard Akreditasi"
        subtitle="Indikator kunci untuk persiapan akreditasi BAN-PT: rasio dosen-mahasiswa, IPK rata-rata, masa studi, dan EDOM."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <Select label="Filter prodi" value={prodiId} onChange={(e) => setProdiId((e.target as HTMLSelectElement).value)}>
            <option value="">Semua prodi</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && (
        <>
          <div className="kpi-grid">
            <StatCard icon={<Users size={20} />} label="Total mahasiswa" value={data.ringkasan.totalMahasiswa.toString()} />
            <StatCard icon={<GraduationCap size={20} />} label="Total dosen" value={data.ringkasan.totalDosen.toString()} />
            <StatCard icon={<BarChart3 size={20} />} label="Rasio dosen : mhs" value={data.ringkasan.rasioDosenMahasiswa != null ? `1 : ${data.ringkasan.rasioDosenMahasiswa}` : '—'} />
            <StatCard icon={<Award size={20} />} label="IPK rata-rata" value={data.ringkasan.ipkRataRata != null ? data.ringkasan.ipkRataRata.toFixed(2) : '—'} />
            <StatCard icon={<Activity size={20} />} label="Masa studi rata-rata" value={data.ringkasan.masaStudiRataRataBulan != null ? `${(data.ringkasan.masaStudiRataRataBulan / 12).toFixed(1)} thn` : '—'} />
            <StatCard icon={<ClipboardList size={20} />} label="EDOM rata-rata" value={data.ringkasan.edomRataRata != null ? data.ringkasan.edomRataRata.toFixed(2) : '—'} />
            <StatCard icon={<GraduationCap size={20} />} label="Tingkat kelulusan" value={`${data.ringkasan.tingkatKelulusanPersen.toFixed(2)}%`} />
          </div>

          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Distribusi status mahasiswa
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              {Object.entries(data.statusBreakdown).map(([s, n]) => (
                <div key={s} style={{ padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{STATUS_LABEL[s] ?? s}</div>
                  <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{n}</div>
                </div>
              ))}
              {Object.keys(data.statusBreakdown).length === 0 && <span className="muted">Tidak ada data.</span>}
            </div>
          </Card>

          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Breakdown per program studi
            </div>
            <div className="tz-table-wrap">
              <table className="tz-table">
                <thead>
                  <tr>
                    <th>Prodi</th>
                    <th>Fakultas</th>
                    <th className="num">Mhs</th>
                    <th className="num">Dosen</th>
                    <th className="num">Rasio</th>
                    <th className="num">IPK</th>
                    <th className="num">Masa studi</th>
                    <th className="num">EDOM</th>
                    <th className="num">Aktif</th>
                    <th className="num">Lulus</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perProdi.length === 0 && <tr><td colSpan={10} className="muted center">Tidak ada data.</td></tr>}
                  {data.perProdi.map((p) => (
                    <tr key={p.prodi.id}>
                      <td>
                        <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{p.prodi.kode}</div>
                        <strong>{p.prodi.nama}</strong>
                      </td>
                      <td>{p.prodi.fakultas.nama}</td>
                      <td className="num mono">{p.totalMhs}</td>
                      <td className="num mono">{p.totalDosen}</td>
                      <td className="num mono">{p.rasioDosenMhs != null ? `1:${p.rasioDosenMhs}` : '—'}</td>
                      <td className="num mono"><strong>{p.ipkRataRata != null ? p.ipkRataRata.toFixed(2) : '—'}</strong></td>
                      <td className="num mono">{p.masaStudiRataRataBulan != null ? `${(p.masaStudiRataRataBulan / 12).toFixed(1)} thn` : '—'}</td>
                      <td className="num mono">{p.edomRataRata != null ? p.edomRataRata.toFixed(2) : '—'}</td>
                      <td className="num mono">{p.statusBreakdown['aktif'] ?? 0}</td>
                      <td className="num mono">{p.statusBreakdown['lulus'] ?? 0}</td>
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

