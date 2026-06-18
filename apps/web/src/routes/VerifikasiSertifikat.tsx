import { useParams } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ShieldCheck, ShieldAlert, Award } from 'lucide-react';
import { useVerifikasiSertifikat, type JenisSertifikat } from '@/lib/queries-sertifikat';
import { formatTanggal, formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useInstitusiPublic } from '@/lib/queries-institusi';

const JENIS_LABEL: Record<JenisSertifikat, string> = {
  kkn: 'KKN', mbkm: 'MBKM', edom: 'EDOM',
  workshop: 'Workshop', panitia: 'Kepanitiaan', asisten: 'Asisten', lain: 'Lain',
};

export function VerifikasiSertifikat() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useVerifikasiSertifikat(token);
  const inst = useInstitusiPublic();
  const namaInstitusi = (inst.data?.nama || 'Institut Agama Islam Tazkia').toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-sunken)', padding: 'var(--space-6) var(--space-4)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }} className="stack">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'Spectral, serif', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
            {namaInstitusi}
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>Verifikasi Sertifikat Digital</div>
        </div>

        {isLoading && (
          <Card>
            <p className="muted" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>Memverifikasi token…</p>
          </Card>
        )}

        {error && (
          <Card>
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <ShieldAlert size={48} style={{ color: 'var(--danger-fg)' }} />
              <h2 style={{ margin: 'var(--space-3) 0 var(--space-2)', color: 'var(--danger-fg)' }}>
                Sertifikat Tidak Valid
              </h2>
              <p className="muted">
                {error instanceof ApiError ? error.message : 'Sertifikat dengan token ini tidak ditemukan atau sudah dicabut.'}
              </p>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>
                Pastikan Anda memindai QR code dari sertifikat resmi {inst.data?.nama || 'Institut Agama Islam Tazkia'}.
              </div>
            </div>
          </Card>
        )}

        {data && (
          <>
            <Card style={{ borderTop: '4px solid var(--success-fg)' }}>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
                <ShieldCheck size={36} style={{ color: 'var(--success-fg)' }} />
                <div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--success-fg)' }}>
                    Sertifikat Asli
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    Terverifikasi sesuai database resmi institusi.
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Award size={20} className="muted" />
                <strong style={{ color: 'var(--text-strong)' }}>Detail Sertifikat</strong>
              </div>
              <table className="krs-cetak__bio" style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ width: 160 }}>Nomor Sertifikat</td><td>:</td><td className="mono"><strong>{data.sertifikat.nomorSertifikat}</strong></td></tr>
                  <tr><td>Jenis</td><td>:</td><td>{JENIS_LABEL[data.sertifikat.jenis]}</td></tr>
                  <tr><td>Judul</td><td>:</td><td><strong>{data.sertifikat.judul}</strong></td></tr>
                  {data.sertifikat.deskripsi && (
                    <tr><td>Deskripsi</td><td>:</td><td>{data.sertifikat.deskripsi}</td></tr>
                  )}
                  {data.sertifikat.periode && (
                    <tr><td>Periode</td><td>:</td><td>{data.sertifikat.periode}</td></tr>
                  )}
                  <tr><td>Tanggal Terbit</td><td>:</td><td>{formatTanggal(data.sertifikat.tanggalTerbit)}</td></tr>
                </tbody>
              </table>
            </Card>

            <Card>
              <strong style={{ color: 'var(--text-strong)' }}>Penerima Sertifikat</strong>
              <table className="krs-cetak__bio" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                <tbody>
                  <tr><td style={{ width: 160 }}>NIM</td><td>:</td><td className="mono"><strong>{data.penerima.nim}</strong></td></tr>
                  <tr><td>Nama Lengkap</td><td>:</td><td><strong>{data.penerima.nama}</strong></td></tr>
                  <tr><td>Program Studi</td><td>:</td><td>{data.penerima.prodi}</td></tr>
                  <tr><td>Fakultas</td><td>:</td><td>{data.institusi.fakultas}</td></tr>
                </tbody>
              </table>
            </Card>

            <div className="muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
              Diverifikasi pada {formatTanggalWaktu(data.verifiedAt)}.
              <br />
              Data ditampilkan dari sistem informasi akademik resmi {data.institusi.nama}.
            </div>
          </>
        )}

        {!isLoading && !error && !data && !token && (
          <Alert variant="warning" title="Token tidak ditemukan">
            URL verifikasi tidak lengkap. Pastikan Anda menggunakan link/QR code dari sertifikat resmi.
          </Alert>
        )}
      </div>
    </div>
  );
}
