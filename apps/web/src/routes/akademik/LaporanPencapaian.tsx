import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useLaporanPencapaian, type StatusPencapaian } from '@/lib/queries-spmi';
import { KopInstitusi } from '@/components/KopInstitusi';

const KAT_LABEL: Record<string, string> = {
  pendidikan: 'Pendidikan', penelitian: 'Penelitian', pengabdian: 'Pengabdian',
  pengelolaan: 'Pengelolaan', sarpras: 'Sarpras', pembiayaan: 'Pembiayaan',
  spmi_tambahan: 'Standar Tambahan', non_akademik: 'Non-Akademik',
  standar_internasional: 'Standar Internasional',
};

const STATUS_LABEL: Record<StatusPencapaian, string> = {
  tercapai: 'Tercapai',
  cukup: 'Cukup',
  belum_tercapai: 'Belum Tercapai',
  belum_diukur: 'Belum Diukur',
};

export function LaporanPencapaian() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const periode = sp.get('periode') ?? undefined;
  const { data, isLoading } = useLaporanPencapaian(periode);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Data tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Group by kategori
  const byKat = data.items.reduce((acc, it) => {
    (acc[it.kategori] = acc[it.kategori] || []).push(it);
    return acc;
  }, {} as Record<string, typeof data.items>);

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/akademik/spmi/laporan')} leftIcon={<ArrowLeft size={14} />}>Kembali</Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>Cetak</Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <KopInstitusi subtitle="Sistem Penjaminan Mutu Internal" />
          <h2 className="krs-cetak__title">LAPORAN PENCAPAIAN STANDAR MUTU</h2>
          <div className="krs-cetak__subtitle">Periode: {data.periode}</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>Periode</td><td>:</td><td><strong>{data.periode}</strong></td><td>Total Standar</td><td>:</td><td className="mono"><strong>{data.totalStandar}</strong></td></tr>
            <tr><td>Persen Tercapai</td><td>:</td><td className="mono"><strong>{data.persenTercapai}%</strong></td><td>Tanggal Cetak</td><td>:</td><td>{tanggalCetak}</td></tr>
          </tbody>
        </table>

        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th>Ringkasan</th>
              <th className="num">Tercapai</th>
              <th className="num">Cukup</th>
              <th className="num">Belum Tercapai</th>
              <th className="num">Belum Diukur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Jumlah standar</td>
              <td className="num mono">{data.ringkasan.tercapai}</td>
              <td className="num mono">{data.ringkasan.cukup}</td>
              <td className="num mono">{data.ringkasan.belum_tercapai}</td>
              <td className="num mono">{data.ringkasan.belum_diukur}</td>
            </tr>
          </tbody>
        </table>

        {Object.entries(byKat).map(([kat, items]) => (
          <div key={kat} style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Kategori: {KAT_LABEL[kat] ?? kat}
            </h3>
            <table className="krs-cetak__table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>Kode</th>
                  <th>Standar</th>
                  <th style={{ width: '12%' }}>Target</th>
                  <th style={{ width: '10%' }}>Realisasi</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '12%' }}>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const target = it.targetMin != null ? `≥ ${it.targetMin}${it.satuan ? ` ${it.satuan}` : ''}`
                    : it.targetMax != null ? `≤ ${it.targetMax}${it.satuan ? ` ${it.satuan}` : ''}`
                    : '—';
                  return (
                    <tr key={it.id}>
                      <td className="mono"><strong>{it.kode}</strong></td>
                      <td>
                        <strong>{it.nama}</strong>
                        {it.prodi && <div className="muted" style={{ fontSize: '10px' }}>Prodi: {it.prodi.kode}</div>}
                      </td>
                      <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{target}</td>
                      <td className="num mono">{it.pengukuran?.nilai ?? '—'}</td>
                      <td>{it.pengukuran ? STATUS_LABEL[it.pengukuran.status] : 'Belum diukur'}</td>
                      <td style={{ fontSize: '10px' }}>{it.pengukuran?.catatan ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {data.items.length === 0 && (
          <p className="muted center">Tidak ada standar mutu pada periode ini.</p>
        )}

        <div className="krs-cetak__ttd">
          <div>
            <div>Mengetahui,</div>
            <div>Ketua LPM / Kepala SPMI</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Disiapkan oleh,</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: '10px', marginTop: 'var(--space-4)', textAlign: 'center' }}>
          Dokumen ini dihasilkan dari Sistem Informasi Akademik (SIAKAD) Tazkia · {new Date().toISOString().slice(0, 19).replace('T', ' ')}
        </div>
      </div>
    </div>
  );
}
