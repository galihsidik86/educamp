import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useSuratDetail, useProfil } from '@/lib/queries';
import { formatTanggal } from '@/lib/format';

export function MahasiswaSuratCetak() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profil = useProfil();
  const surat = useSuratDetail(id);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (profil.isLoading || surat.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data || !surat.data) return <p className="muted">Data tidak tersedia.</p>;
  const s = surat.data;
  if (s.status !== 'selesai') {
    return <p className="muted">Surat belum terbit (nomor surat belum dikeluarkan).</p>;
  }

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/surat')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>
          Cetak
        </Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <div className="krs-cetak__brand">
            <strong>INSTITUT AGAMA ISLAM TAZKIA</strong>
            <div>{profil.data.prodi.fakultas.nama}</div>
            <div>Program Studi {profil.data.prodi.nama}</div>
          </div>
          <h2 className="krs-cetak__title">{s.judul.toUpperCase()}</h2>
          {s.nomorSurat && <div className="krs-cetak__subtitle">No. {s.nomorSurat}</div>}
        </header>

        <p style={{ margin: '0 0 var(--space-3)', textIndent: '2em', lineHeight: 1.7 }}>
          Yang bertanda tangan di bawah ini, Kepala Bagian Akademik Institut Agama Islam Tazkia, dengan ini menerangkan bahwa:
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
          Benar adalah mahasiswa{profil.data.jenisKelamin === 'P' ? '/i' : ''} aktif Institut Agama Islam Tazkia dengan keperluan sebagai berikut:
        </p>

        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--surface-sunken)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 'var(--space-4)',
          whiteSpace: 'pre-wrap',
          fontSize: 'var(--text-sm)',
        }}>
          {s.keperluan}
        </div>

        <p style={{ margin: '0 0 var(--space-5)', textIndent: '2em', lineHeight: 1.7 }}>
          Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.
        </p>

        <div className="krs-cetak__ttd">
          <div></div>
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
