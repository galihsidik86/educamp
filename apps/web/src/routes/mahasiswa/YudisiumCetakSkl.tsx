import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { NamaInstitusiText } from '@/components/KopInstitusi';
import { QRCodeSVG } from 'qrcode.react';
import { useYudisium, useProfil } from '@/lib/queries';
import { formatIp, formatTanggal } from '@/lib/format';
import { useInstitusiPublic } from '@/lib/queries-institusi';

const PREDIKAT_LABEL: Record<string, string> = {
  cumlaude: 'Cumlaude',
  sangat_memuaskan: 'Sangat Memuaskan',
  memuaskan: 'Memuaskan',
  tidak_lulus: 'Belum Lulus',
};

export function MahasiswaYudisiumCetakSkl() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profil = useProfil();
  const inst = useInstitusiPublic();
  const namaInst = inst.data?.nama || 'Institut Agama Islam Tazkia';
  const list = useYudisium();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (profil.isLoading || list.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data || !list.data) return <p className="muted">Data tidak tersedia.</p>;

  const y = list.data.items.find((it) => it.id === id);
  if (!y) return <p className="muted">Pendaftaran tidak ditemukan.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/yudisium')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>
          Cetak
        </Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <div className="krs-cetak__brand">
            <strong><NamaInstitusiText /></strong>
            <div>{profil.data.prodi.fakultas.nama}</div>
            <div>Program Studi {profil.data.prodi.nama}</div>
          </div>
          <h2 className="krs-cetak__title">SURAT KETERANGAN LULUS</h2>
          {y.noSkl && <div className="krs-cetak__subtitle">No. {y.noSkl}</div>}
        </header>

        <p style={{ margin: '0 0 var(--space-3)', textIndent: '2em', lineHeight: 1.7 }}>
          Yang bertanda tangan di bawah ini, Kepala Bagian Akademik {namaInst}, dengan ini menerangkan bahwa:
        </p>

        <table className="krs-cetak__bio" style={{ marginBottom: 'var(--space-4)' }}>
          <tbody>
            <tr><td>NIM</td><td>:</td><td className="mono" colSpan={4}>{profil.data.nim}</td></tr>
            <tr><td>Nama</td><td>:</td><td colSpan={4}><strong>{profil.data.nama}</strong></td></tr>
            <tr><td>Tempat, tgl lahir</td><td>:</td><td colSpan={4}>{profil.data.tempatLahir ?? '—'}{profil.data.tanggalLahir ? `, ${formatTanggal(profil.data.tanggalLahir)}` : ''}</td></tr>
            <tr><td>Program Studi</td><td>:</td><td colSpan={4}>{profil.data.prodi.nama}</td></tr>
            <tr><td>Fakultas</td><td>:</td><td colSpan={4}>{profil.data.prodi.fakultas.nama}</td></tr>
            <tr><td>Angkatan</td><td>:</td><td className="mono" colSpan={4}>{profil.data.angkatan}</td></tr>
          </tbody>
        </table>

        <p style={{ margin: '0 0 var(--space-3)', textIndent: '2em', lineHeight: 1.7 }}>
          telah menyelesaikan seluruh kewajiban akademik dan dinyatakan LULUS dengan hasil sebagai berikut:
        </p>

        <table className="krs-cetak__bio" style={{ marginBottom: 'var(--space-4)' }}>
          <tbody>
            <tr>
              <td>Total SKS Lulus</td><td>:</td><td className="mono" colSpan={4}>{y.sksLulus} SKS</td>
            </tr>
            <tr>
              <td>Indeks Prestasi Kumulatif</td><td>:</td><td className="mono" colSpan={4}><strong>{formatIp(y.ipk)}</strong></td>
            </tr>
            <tr>
              <td>Predikat Kelulusan</td><td>:</td><td colSpan={4}><strong>{y.predikat ? PREDIKAT_LABEL[y.predikat] : '—'}</strong></td>
            </tr>
            {y.tanggalLulus && (
              <tr>
                <td>Tanggal Lulus</td><td>:</td><td colSpan={4}>{formatTanggal(y.tanggalLulus)}</td>
              </tr>
            )}
            {y.noIjazah && (
              <tr>
                <td>Nomor Ijazah</td><td>:</td><td className="mono" colSpan={4}>{y.noIjazah}</td>
              </tr>
            )}
          </tbody>
        </table>

        <p style={{ margin: '0 0 var(--space-5)', textIndent: '2em', lineHeight: 1.7 }}>
          Surat keterangan ini dibuat sebagai keterangan resmi sementara, sambil menunggu penerbitan ijazah. Apabila di kemudian hari terdapat kekeliruan, akan diadakan perbaikan sebagaimana mestinya.
        </p>

        <div className="krs-cetak__ttd">
          {y.verifikasiToken ? (
            <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)' }}>
              <div style={{ padding: 'var(--space-2)', background: 'white', display: 'inline-block', border: '1px solid #999' }}>
                <QRCodeSVG value={`${window.location.origin}/verifikasi/${y.verifikasiToken}`} size={96} includeMargin={false} />
              </div>
              <div className="muted" style={{ marginTop: 4 }}>Pindai untuk verifikasi</div>
              <div className="mono muted" style={{ fontSize: '10px', wordBreak: 'break-all', maxWidth: 120 }}>
                {window.location.origin}/verifikasi/{y.verifikasiToken}
              </div>
            </div>
          ) : <div></div>}
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Kepala Bagian Akademik</div>
            <div className="krs-cetak__sign"></div>
            <div><strong>(...........................................)</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
