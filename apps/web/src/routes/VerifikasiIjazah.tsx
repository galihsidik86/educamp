import { useParams } from 'react-router-dom';
import { Alert, Card } from '@/ds';
import { ShieldCheck, ShieldAlert, GraduationCap, Award } from 'lucide-react';
import { useVerifikasiIjazah } from '@/lib/queries-verifikasi';
import { formatTanggal, formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useInstitusiPublic } from '@/lib/queries-institusi';

const PREDIKAT_LABEL: Record<string, string> = {
  cumlaude: 'Cum Laude',
  sangat_memuaskan: 'Sangat Memuaskan',
  memuaskan: 'Memuaskan',
};

const JENJANG_LABEL: Record<string, string> = {
  d3: 'Diploma III',
  d4: 'Diploma IV',
  s1: 'Sarjana (S1)',
  s2: 'Magister (S2)',
  s3: 'Doktor (S3)',
  profesi: 'Profesi',
};

export function VerifikasiIjazah() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useVerifikasiIjazah(token);
  const inst = useInstitusiPublic();
  const namaInstitusi = (inst.data?.nama || 'Institut Agama Islam Tazkia').toUpperCase();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-sunken)',
      padding: 'var(--space-6) var(--space-4)',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }} className="stack">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'Spectral, serif', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
            {namaInstitusi}
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>Verifikasi Keaslian Ijazah</div>
        </div>

        {isLoading && (
          <Card>
            <p className="muted" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              Memverifikasi token…
            </p>
          </Card>
        )}

        {error && (
          <Card>
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <ShieldAlert size={48} style={{ color: 'var(--danger-fg)' }} />
              <h2 style={{ margin: 'var(--space-3) 0 var(--space-2)', color: 'var(--danger-fg)' }}>
                Token Tidak Valid
              </h2>
              <p className="muted">
                {error instanceof ApiError
                  ? error.message
                  : 'Data lulusan dengan token ini tidak ditemukan dalam sistem.'}
              </p>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-3)' }}>
                Pastikan Anda memindai QR code dari ijazah/SKL resmi {inst.data?.nama || 'Institut Agama Islam Tazkia'}.
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
                    Ijazah Asli
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    Data lulusan terverifikasi sesuai database resmi institusi.
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <GraduationCap size={20} className="muted" />
                <strong style={{ color: 'var(--text-strong)' }}>Data Lulusan</strong>
              </div>
              <table className="krs-cetak__bio" style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ width: 160 }}>Nama Lengkap</td><td>:</td><td><strong>{data.lulusan.nama}</strong></td></tr>
                  <tr><td>NIM</td><td>:</td><td className="mono">{data.lulusan.nim}</td></tr>
                  <tr><td>Tempat, tgl lahir</td><td>:</td><td>{data.lulusan.tempatLahir ?? '—'}{data.lulusan.tanggalLahir ? `, ${formatTanggal(data.lulusan.tanggalLahir)}` : ''}</td></tr>
                  <tr><td>Jenis Kelamin</td><td>:</td><td>{data.lulusan.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                  <tr><td>Tahun Masuk</td><td>:</td><td className="mono">{data.lulusan.tahunMasuk}</td></tr>
                </tbody>
              </table>
            </Card>

            <Card>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Award size={20} className="muted" />
                <strong style={{ color: 'var(--text-strong)' }}>Data Pendidikan</strong>
              </div>
              <table className="krs-cetak__bio" style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ width: 160 }}>Program Studi</td><td>:</td><td><strong>{data.pendidikan.prodi}</strong> ({data.pendidikan.kodeProdi})</td></tr>
                  <tr><td>Jenjang</td><td>:</td><td>{JENJANG_LABEL[data.pendidikan.jenjang] ?? data.pendidikan.jenjang}</td></tr>
                  <tr><td>Fakultas</td><td>:</td><td>{data.institusi.fakultas}</td></tr>
                  <tr><td>IPK</td><td>:</td><td className="mono"><strong>{data.pendidikan.ipk.toFixed(2)}</strong></td></tr>
                  <tr><td>SKS Lulus</td><td>:</td><td className="mono">{data.pendidikan.sksLulus}</td></tr>
                  <tr><td>Predikat</td><td>:</td><td>{data.pendidikan.predikat ? PREDIKAT_LABEL[data.pendidikan.predikat] ?? data.pendidikan.predikat : '—'}</td></tr>
                </tbody>
              </table>
            </Card>

            <Card>
              <strong style={{ color: 'var(--text-strong)' }}>Data Ijazah</strong>
              <table className="krs-cetak__bio" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                <tbody>
                  <tr><td style={{ width: 160 }}>No. Ijazah</td><td>:</td><td className="mono">{data.ijazah.noIjazah ?? '—'}</td></tr>
                  <tr><td>No. SKL</td><td>:</td><td className="mono">{data.ijazah.noSkl ?? '—'}</td></tr>
                  <tr><td>Tanggal Lulus</td><td>:</td><td>{data.ijazah.tanggalLulus ? formatTanggal(data.ijazah.tanggalLulus) : '—'}</td></tr>
                  <tr><td>Periode Wisuda</td><td>:</td><td>{data.ijazah.periodeWisuda}</td></tr>
                </tbody>
              </table>
            </Card>

            <div className="muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
              Diverifikasi pada {formatTanggalWaktu(data.verifiedAt)}.
              <br />
              Data ini ditampilkan dari sistem informasi akademik resmi {data.institusi.nama}.
              <br />
              Untuk pertanyaan, hubungi BAAK Tazkia.
            </div>
          </>
        )}

        {!isLoading && !error && !data && !token && (
          <Alert variant="warning" title="Token tidak ditemukan">
            URL verifikasi tidak lengkap. Pastikan Anda menggunakan link/QR code dari ijazah resmi.
          </Alert>
        )}
      </div>
    </div>
  );
}
