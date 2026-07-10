import { useState } from 'react';
import { Alert, Card, Input, Select } from '@/ds';
import { Target, TrendingUp } from 'lucide-react';
import { useLaporanObe, type AspekCpl } from '@/lib/queries-obe';
import { useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Skeleton } from '@/components/Skeleton';

const ASPEK_LABEL: Record<AspekCpl, string> = {
  sikap: 'Sikap',
  pengetahuan: 'Pengetahuan',
  ketrampilan_umum: 'Keterampilan Umum',
  ketrampilan_khusus: 'Keterampilan Khusus',
};

export function LaporanObe() {
  const prodi = useProdi();
  const [prodiId, setProdiId] = useState('');
  const [angkatanInput, setAngkatanInput] = useState('');
  const angkatan = angkatanInput ? Number(angkatanInput) : undefined;
  const { data, isLoading, error } = useLaporanObe(prodiId || undefined, angkatan);

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAPORAN OBE"
        title="Capaian Pembelajaran Lulusan"
        subtitle="Rekap capaian CPL per prodi & angkatan, dihitung dari nilai CPMK mahasiswa secara tertimbang. Untuk laporan akreditasi BAN-PT."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 280 }}>
          <Select label="Prodi" value={prodiId} onChange={(e) => setProdiId((e.target as HTMLSelectElement).value)}>
            <option value="">— pilih prodi —</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 180 }}>
          <Input label="Angkatan (opsional)" type="number" min={2000} max={2100} value={angkatanInput} onChange={(e) => setAngkatanInput((e.target as HTMLInputElement).value)} placeholder="cth: 2021" />
        </div>
      </div>

      {!prodiId && (
        <Alert variant="info" title="Pilih prodi">Pilih prodi untuk melihat laporan capaian CPL.</Alert>
      )}

      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && (
        <>
          <div className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Card>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Total Mahasiswa</div>
              <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{data.totalMahasiswa}</div>
            </Card>
            <Card>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Total CPL</div>
              <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{data.cpl.length}</div>
            </Card>
            <Card>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Filter Angkatan</div>
              <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{data.angkatan ?? 'Semua'}</div>
            </Card>
          </div>

          {data.cpl.length === 0 && (
            <Alert variant="info" title="Belum ada CPL untuk prodi ini">Tambahkan CPL di menu OBE/CPL dulu.</Alert>
          )}

          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
              Capaian per CPL
            </div>
            <div className="tz-table-wrap">
              <table className="tz-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Aspek</th>
                    <th>Deskripsi</th>
                    <th className="num">CPMK</th>
                    <th className="num">Mhs Dinilai</th>
                    <th className="num">Rata-rata Skor</th>
                    <th className="num">% Tercapai</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cpl.map((c) => (
                    <tr key={c.cpl.id}>
                      <td className="mono"><strong>{c.cpl.kode}</strong></td>
                      <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{ASPEK_LABEL[c.cpl.aspek]}</td>
                      <td>{c.cpl.deskripsi.slice(0, 80)}{c.cpl.deskripsi.length > 80 && '…'}</td>
                      <td className="num mono">{c.jumlahCpmk}</td>
                      <td className="num mono">{c.mhsDinilai}</td>
                      <td className="num mono">
                        {c.rataRataSkor != null ? (
                          <strong style={{ color: c.rataRataSkor >= 56 ? 'var(--success-fg)' : 'var(--danger-fg)' }}>
                            {c.rataRataSkor.toFixed(2)}
                          </strong>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td className="num mono">
                        {c.persenTercapai != null ? (
                          <span style={{ color: c.persenTercapai >= 70 ? 'var(--success-fg)' : c.persenTercapai >= 50 ? 'var(--warning-fg)' : 'var(--danger-fg)' }}>
                            {c.persenTercapai}%
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            <Target size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Rata-rata skor CPL = Σ(nilai_CPMK × bobot_mapping) / Σ(bobot_mapping) per mahasiswa, lalu dirata-ratakan.
            <br />
            <TrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            % Tercapai = persentase mahasiswa dengan skor CPL ≥ 56 (ambang nilai C).
          </div>
        </>
      )}
    </div>
  );
}
