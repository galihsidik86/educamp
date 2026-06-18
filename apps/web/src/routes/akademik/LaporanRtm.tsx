import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useRtmDetail, type StatusKeputusan } from '@/lib/queries-spmi';
import { formatTanggal } from '@/lib/format';
import { KopInstitusi } from '@/components/KopInstitusi';

const KEP_LABEL: Record<StatusKeputusan, string> = {
  open: 'Open', in_progress: 'Dilaksanakan', done: 'Selesai', cancelled: 'Dibatalkan',
};

export function LaporanRtm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useRtmDetail(id);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Data RTM tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/akademik/spmi/laporan')} leftIcon={<ArrowLeft size={14} />}>Kembali</Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>Cetak</Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <KopInstitusi subtitle="Sistem Penjaminan Mutu Internal" />
          <h2 className="krs-cetak__title">RISALAH RAPAT TINJAUAN MANAJEMEN</h2>
          <div className="krs-cetak__subtitle">No. {data.kode}</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>Kode RTM</td><td>:</td><td className="mono"><strong>{data.kode}</strong></td><td>Status</td><td>:</td><td>{data.status === 'selesai' ? 'Selesai' : 'Perencanaan'}</td></tr>
            <tr><td>Judul</td><td>:</td><td colSpan={4}><strong>{data.judul}</strong></td></tr>
            <tr><td>Tanggal</td><td>:</td><td colSpan={4}>{formatTanggal(data.tanggal)}</td></tr>
          </tbody>
        </table>

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agenda Rapat</h3>
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-4)', padding: 'var(--space-2)', border: '1px solid var(--text-strong)' }}>
          {data.agenda}
        </div>

        {data.peserta && (
          <>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peserta Rapat</h3>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-4)', padding: 'var(--space-2)', border: '1px solid var(--text-strong)' }}>
              {data.peserta}
            </div>
          </>
        )}

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notulen</h3>
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-4)', padding: 'var(--space-2)', border: '1px solid var(--text-strong)', minHeight: 80 }}>
          {data.notulen ?? '— Notulen belum diisi —'}
        </div>

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Keputusan Rapat ({data.keputusan?.length ?? 0})
        </h3>
        {(!data.keputusan || data.keputusan.length === 0) ? (
          <p className="muted">Tidak ada keputusan tercatat.</p>
        ) : (
          <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
            <thead>
              <tr>
                <th style={{ width: '5%' }}>No.</th>
                <th>Deskripsi Keputusan</th>
                <th style={{ width: '20%' }}>PIC</th>
                <th style={{ width: '12%' }}>Target Selesai</th>
                <th style={{ width: '12%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.keputusan.map((k, i) => (
                <tr key={k.id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    {k.deskripsi}
                    {k.catatan && <div className="muted" style={{ fontSize: '10px', marginTop: 2 }}>Catatan: {k.catatan}</div>}
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>
                    {k.picUser?.akademik?.nama ?? k.picUser?.email ?? k.picCatatan ?? '—'}
                  </td>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{k.targetSelesai ? formatTanggal(k.targetSelesai) : '—'}</td>
                  <td>{KEP_LABEL[k.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="krs-cetak__ttd">
          <div>
            <div>Ketua Rapat,</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Notulis,</div>
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
