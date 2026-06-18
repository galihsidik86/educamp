import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useAmiDetail, type KategoriTemuan, type StatusCapa } from '@/lib/queries-spmi';
import { formatTanggal } from '@/lib/format';
import { KopInstitusi } from '@/components/KopInstitusi';

const TEMUAN_LABEL: Record<KategoriTemuan, string> = {
  ktsm: 'KTS Major', kts: 'KTS Minor', observasi: 'Observasi', saran: 'Saran',
};

const CAPA_LABEL: Record<StatusCapa, string> = {
  rencana: 'Rencana', pelaksanaan: 'Pelaksanaan', verifikasi: 'Verifikasi',
  closed: 'Closed', ditolak: 'Ditolak',
};

export function LaporanAmi() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useAmiDetail(id);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Data AMI tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const ringkasanTemuan = {
    ktsm: data.temuan?.filter((t) => t.kategori === 'ktsm').length ?? 0,
    kts: data.temuan?.filter((t) => t.kategori === 'kts').length ?? 0,
    observasi: data.temuan?.filter((t) => t.kategori === 'observasi').length ?? 0,
    saran: data.temuan?.filter((t) => t.kategori === 'saran').length ?? 0,
  };

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/akademik/spmi/laporan')} leftIcon={<ArrowLeft size={14} />}>Kembali</Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>Cetak</Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <KopInstitusi subtitle="Sistem Penjaminan Mutu Internal" />
          <h2 className="krs-cetak__title">LAPORAN AUDIT MUTU INTERNAL</h2>
          <div className="krs-cetak__subtitle">No. {data.kode}</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>Kode AMI</td><td>:</td><td className="mono"><strong>{data.kode}</strong></td><td>Status</td><td>:</td><td>{data.status}</td></tr>
            <tr><td>Nama</td><td>:</td><td colSpan={4}><strong>{data.nama}</strong></td></tr>
            <tr><td>Periode</td><td>:</td><td>{data.periode}</td><td>Tanggal</td><td>:</td><td>{formatTanggal(data.tanggalMulai)}{data.tanggalSelesai && ` – ${formatTanggal(data.tanggalSelesai)}`}</td></tr>
          </tbody>
        </table>

        {data.ruangLingkup && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruang Lingkup</h3>
            <p>{data.ruangLingkup}</p>
          </div>
        )}

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tim Auditor</h3>
        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead>
            <tr><th style={{ width: '5%' }}>No.</th><th style={{ width: '15%' }}>NIDN</th><th>Nama</th><th style={{ width: '20%' }}>Peran</th></tr>
          </thead>
          <tbody>
            {(!data.auditor || data.auditor.length === 0) && (
              <tr><td colSpan={4} className="center muted">Belum ada auditor.</td></tr>
            )}
            {data.auditor?.map((a, i) => (
              <tr key={a.id}>
                <td className="num">{i + 1}</td>
                <td className="mono">{a.dosen.nidn}</td>
                <td>{[a.dosen.gelarDepan, a.dosen.nama, a.dosen.gelarBelakang].filter(Boolean).join(' ')}</td>
                <td>{a.peran}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lingkup Audit (Prodi)</h3>
        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead><tr><th style={{ width: '5%' }}>No.</th><th style={{ width: '15%' }}>Kode</th><th>Program Studi</th></tr></thead>
          <tbody>
            {(!data.lingkup || data.lingkup.length === 0) && (
              <tr><td colSpan={3} className="center muted">Belum ada prodi yang masuk lingkup.</td></tr>
            )}
            {data.lingkup?.map((l, i) => (
              <tr key={l.id}><td className="num">{i + 1}</td><td className="mono">{l.prodi.kode}</td><td>{l.prodi.nama}</td></tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ringkasan Temuan</h3>
        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead><tr><th>Kategori</th><th className="num">KTS Major</th><th className="num">KTS Minor</th><th className="num">Observasi</th><th className="num">Saran</th><th className="num">Total</th></tr></thead>
          <tbody>
            <tr>
              <td>Jumlah</td>
              <td className="num mono">{ringkasanTemuan.ktsm}</td>
              <td className="num mono">{ringkasanTemuan.kts}</td>
              <td className="num mono">{ringkasanTemuan.observasi}</td>
              <td className="num mono">{ringkasanTemuan.saran}</td>
              <td className="num mono"><strong>{(data.temuan?.length ?? 0)}</strong></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detail Temuan & Tindak Lanjut</h3>
        {(!data.temuan || data.temuan.length === 0) ? (
          <p className="muted">Belum ada temuan.</p>
        ) : (
          <table className="krs-cetak__table">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Kode</th>
                <th style={{ width: '10%' }}>Kategori</th>
                <th>Deskripsi Temuan</th>
                <th style={{ width: '20%' }}>Rekomendasi</th>
                <th style={{ width: '12%' }}>Status CAPA</th>
              </tr>
            </thead>
            <tbody>
              {data.temuan.map((t) => (
                <tr key={t.id}>
                  <td className="mono"><strong>{t.kode}</strong></td>
                  <td>{TEMUAN_LABEL[t.kategori]}</td>
                  <td>
                    {t.deskripsi}
                    {t.standar && <div className="muted" style={{ fontSize: '10px' }}>Standar: {t.standar.kode}</div>}
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>{t.rekomendasi ?? '—'}</td>
                  <td>{t.capa ? CAPA_LABEL[t.capa.status] : 'Belum ada'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Detail CAPA */}
        {data.temuan?.some((t) => t.capa) && (
          <>
            <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Rincian Tindak Lanjut (CAPA)
            </h3>
            {data.temuan.filter((t) => t.capa).map((t) => (
              <div key={t.id} style={{ border: '1px solid var(--text-strong)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="mono"><strong>Temuan {t.kode}</strong> — {TEMUAN_LABEL[t.kategori]}</div>
                <div style={{ marginTop: 4 }}><strong>Akar masalah:</strong> {t.capa!.akarMasalah ?? '—'}</div>
                <div><strong>Rencana tindakan:</strong> {t.capa!.rencanaTindakan}</div>
                {t.capa!.realisasiTindakan && <div><strong>Realisasi:</strong> {t.capa!.realisasiTindakan}</div>}
                <div className="row" style={{ gap: 'var(--space-4)', marginTop: 4, fontSize: 'var(--text-sm)' }}>
                  <span>Target: <span className="mono">{formatTanggal(t.capa!.targetSelesai)}</span></span>
                  {t.capa!.tanggalSelesai && <span>Selesai: <span className="mono">{formatTanggal(t.capa!.tanggalSelesai)}</span></span>}
                  <span>Status: <strong>{CAPA_LABEL[t.capa!.status]}</strong></span>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="krs-cetak__ttd">
          <div>
            <div>Ketua Tim Auditor,</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Ketua LPM / Kepala SPMI</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: '10px', marginTop: 'var(--space-4)', textAlign: 'center' }}>
          Dokumen ini dihasilkan dari SIAKAD Tazkia · {new Date().toISOString().slice(0, 19).replace('T', ' ')}
        </div>
      </div>
    </div>
  );
}
