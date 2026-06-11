import { Alert, StatCard, Card } from '@/ds';
import { Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useKeuangan } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatRupiah, formatTanggal, formatStatus } from '@/lib/format';

export function MahasiswaKeuangan() {
  const { data, isLoading, error } = useKeuangan();

  return (
    <div className="stack">
      <PageHead eyebrow="KEUANGAN" title="Tagihan & Pembayaran" subtitle="Status keuangan semester aktif & riwayat." />

      {error && <Alert variant="danger" title="Gagal memuat data">Coba muat ulang.</Alert>}

      {data && (
        <div className="kpi-grid">
          <StatCard label="Total Tagihan" value={formatRupiah(data.ringkasan.totalTagihan)} icon={<Wallet size={20} />} />
          <StatCard label="Sudah Dibayar" value={formatRupiah(data.ringkasan.totalDibayar)} icon={<CheckCircle2 size={20} />} />
          <StatCard label="Sisa Tagihan" value={formatRupiah(data.ringkasan.totalSisa)} icon={<AlertCircle size={20} />} />
        </div>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Jenis</th><th>Deskripsi</th><th>Semester</th>
              <th className="num">Jumlah</th><th className="num">Dibayar</th><th className="num">Sisa</th>
              <th>Jatuh Tempo</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Belum ada tagihan.</td></tr>}
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td>{formatStatus(t.jenis)}</td>
                <td>{t.deskripsi}</td>
                <td className="mono" style={{ textTransform: 'capitalize' }}>{t.semester}</td>
                <td className="num">{formatRupiah(t.jumlah)}</td>
                <td className="num">{formatRupiah(t.dibayar)}</td>
                <td className="num"><strong>{formatRupiah(t.sisa)}</strong></td>
                <td>{formatTanggal(t.jatuhTempo)}</td>
                <td><StatusPill status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: '8px 0 0', color: 'var(--text-strong)' }}>Riwayat Pembayaran</h3>
      <div className="card-list">
        {data?.items.flatMap((t) =>
          t.pembayaran.map((p) => (
            <Card key={p.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <p className="card-list-item__title">{t.deskripsi}</p>
                  <div className="card-list-item__meta">
                    <span>{formatTanggal(p.tanggalBayar)}</span>
                    <span>{formatStatus(p.metode)}</span>
                    {p.catatan && <span>{p.catatan}</span>}
                  </div>
                </div>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--success-fg)' }}>{formatRupiah(p.jumlah)}</strong>
              </div>
            </Card>
          )),
        )}
        {data && data.items.every((t) => t.pembayaran.length === 0) && (
          <Card><p className="muted" style={{ margin: 0 }}>Belum ada pembayaran tercatat.</p></Card>
        )}
      </div>
    </div>
  );
}
