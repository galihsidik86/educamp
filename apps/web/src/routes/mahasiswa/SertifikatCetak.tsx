import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { QRCodeSVG } from 'qrcode.react';
import { useMahasiswaSertifikatDetail, type JenisSertifikat } from '@/lib/queries-sertifikat';
import { formatTanggal } from '@/lib/format';
import { NamaInstitusiText } from '@/components/KopInstitusi';

const JENIS_TITLE: Record<JenisSertifikat, string> = {
  kkn: 'SERTIFIKAT KULIAH KERJA NYATA',
  mbkm: 'SERTIFIKAT MERDEKA BELAJAR KAMPUS MERDEKA',
  edom: 'SERTIFIKAT EVALUASI DOSEN OLEH MAHASISWA',
  workshop: 'SERTIFIKAT WORKSHOP',
  panitia: 'SERTIFIKAT KEPANITIAAN',
  asisten: 'SERTIFIKAT ASISTEN',
  lain: 'SERTIFIKAT',
};

export function MahasiswaSertifikatCetak() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMahasiswaSertifikatDetail(id);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Sertifikat tidak tersedia.</p>;

  const verifUrl = `${window.location.origin}/verifikasi-sertifikat/${data.verifikasiToken}`;
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/sertifikat')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>
          Cetak
        </Button>
      </div>

      <div className="krs-cetak__sheet" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
        <header style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontFamily: 'Spectral, serif', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
            <NamaInstitusiText />
          </div>
          <div className="muted">{data.mahasiswa.prodi.fakultas.nama}</div>
        </header>

        <div style={{ borderTop: '2px solid var(--text-strong)', borderBottom: '2px solid var(--text-strong)', padding: 'var(--space-3) 0', margin: 'var(--space-4) 0' }}>
          <h1 style={{ fontFamily: 'Spectral, serif', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0, letterSpacing: '0.1em' }}>
            {JENIS_TITLE[data.jenis]}
          </h1>
          <div className="mono muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            No. {data.nomorSertifikat}
          </div>
        </div>

        <p style={{ margin: 'var(--space-4) 0', fontSize: 'var(--text-base)' }}>
          Diberikan kepada:
        </p>

        <div style={{ margin: 'var(--space-4) 0' }}>
          <h2 style={{ fontFamily: 'Spectral, serif', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>
            {data.mahasiswa.nama}
          </h2>
          <div className="mono muted" style={{ marginTop: 'var(--space-2)' }}>
            NIM {data.mahasiswa.nim}
            {' · '}{data.mahasiswa.prodi.nama} ({data.mahasiswa.prodi.jenjang.toUpperCase()})
          </div>
        </div>

        <div style={{ margin: 'var(--space-5) auto', maxWidth: 600, fontSize: 'var(--text-base)', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 var(--space-3)' }}>
            <strong>{data.judul}</strong>
          </p>
          {data.deskripsi && (
            <p style={{ margin: 0 }}>{data.deskripsi}</p>
          )}
          {data.periode && (
            <p className="muted mono" style={{ marginTop: 'var(--space-2)' }}>Periode: {data.periode}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'var(--space-6)', padding: '0 var(--space-4)' }}>
          {/* QR section kiri */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: 'var(--space-2)', background: 'white', border: '1px solid #999', display: 'inline-block' }}>
              <QRCodeSVG value={verifUrl} size={96} includeMargin={false} />
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>Pindai untuk verifikasi</div>
            <div className="mono muted" style={{ fontSize: '10px', wordBreak: 'break-all', maxWidth: 130 }}>
              {data.verifikasiToken}
            </div>
          </div>

          {/* TTD section kanan */}
          <div style={{ textAlign: 'center' }}>
            <div>Bogor, {tanggalCetak}</div>
            <div>{data.ttdJabatan ?? 'Kepala Bagian Akademik'}</div>
            <div style={{ height: 60 }} />
            <div><strong>{data.ttdNama ?? '(...........................................)'}</strong></div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-5)' }}>
          Sertifikat ini diterbitkan secara digital. Keasliannya dapat diverifikasi pada laman {verifUrl}
        </div>
      </div>
    </div>
  );
}
