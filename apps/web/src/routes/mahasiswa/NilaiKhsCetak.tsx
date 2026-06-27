import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { NamaInstitusiText } from '@/components/KopInstitusi';
import { useKhs, useProfil } from '@/lib/queries';
import { formatIp } from '@/lib/format';

export function MahasiswaNilaiKhsCetak() {
  const navigate = useNavigate();
  const profil = useProfil();
  const khs = useKhs();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (profil.isLoading || khs.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data || !khs.data) return <p className="muted">Data tidak tersedia.</p>;

  // Gating EDOM: kalau ada semester yang terkunci, blokir cetak.
  const lockedSemesters = khs.data.semesters.filter((s) => s.locked);
  if (lockedSemesters.length > 0) {
    return (
      <div className="stack" style={{ maxWidth: 720, margin: 'var(--space-6) auto', padding: 'var(--space-4)' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/nilai')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <div style={{
          padding: 'var(--space-5)', background: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
        }}>
          <h2 style={{ marginTop: 0, color: 'var(--text-strong)' }}>KHS belum dapat dicetak</h2>
          <p>
            Lengkapi pengisian EDOM terlebih dahulu untuk{' '}
            <strong>{lockedSemesters.length} semester</strong> yang masih terkunci:
          </p>
          <ul>
            {lockedSemesters.map((s) => (
              <li key={s.semesterKode}>
                <strong>{s.semesterNama}</strong>{' '}
                <span className="muted">({s.pendingEdomCount} dari {s.totalKelas} kelas belum diisi)</span>
              </li>
            ))}
          </ul>
          <Button variant="primary" onClick={() => navigate('/mahasiswa/edom')}>
            Buka Halaman EDOM
          </Button>
        </div>
      </div>
    );
  }

  const dpa = profil.data.dpa
    ? [profil.data.dpa.gelarDepan, profil.data.dpa.nama, profil.data.dpa.gelarBelakang].filter(Boolean).join(' ')
    : '—';
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/nilai')} leftIcon={<ArrowLeft size={14} />}>
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
          <h2 className="krs-cetak__title">KARTU HASIL STUDI</h2>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>NIM</td><td>:</td><td className="mono">{profil.data.nim}</td>
                <td>Program Studi</td><td>:</td><td>{profil.data.prodi.nama}</td></tr>
            <tr><td>Nama</td><td>:</td><td>{profil.data.nama}</td>
                <td>Angkatan</td><td>:</td><td>{profil.data.angkatan}</td></tr>
            <tr><td>Dosen PA</td><td>:</td><td>{dpa}</td>
                <td colSpan={3}></td></tr>
          </tbody>
        </table>

        {khs.data.semesters.length === 0 && (
          <p className="muted">Belum ada nilai yang dirilis.</p>
        )}

        {khs.data.semesters.map((s) => (
          <div key={s.semesterKode} style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
              <h3 style={{ margin: 0 }}>
                {capFirst(s.semesterNama)} <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>({s.semesterKode})</span>
              </h3>
              <div className="mono" style={{ fontSize: 'var(--text-sm)' }}>
                IP: <strong>{formatIp(s.ip)}</strong> · SKS: <strong>{s.totalSks}</strong>
              </div>
            </div>
            <table className="krs-cetak__table">
              <thead>
                <tr>
                  <th>No</th><th>Kode</th><th>Mata Kuliah</th>
                  <th>SKS</th><th>Angka</th><th>Huruf</th><th>Bobot</th>
                </tr>
              </thead>
              <tbody>
                {s.items.map((it, i) => (
                  <tr key={it.kodeMK}>
                    <td className="num">{i + 1}</td>
                    <td className="mono">{it.kodeMK}</td>
                    <td>{it.namaMK}</td>
                    <td className="num">{it.sks}</td>
                    <td className="num">{it.nilaiAngka ?? '—'}</td>
                    <td className="num mono"><strong>{it.nilaiHuruf ?? '—'}</strong></td>
                    <td className="num">{it.bobot?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="krs-cetak__ttd">
          <div></div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Dosen Pembimbing Akademik</div>
            <div className="krs-cetak__sign"></div>
            <div><strong>{dpa}</strong></div>
            {profil.data.dpa && <div className="mono">NIDN. {profil.data.dpa.nidn}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const capFirst = (s: string) => s ? s[0]!.toUpperCase() + s.slice(1) : s;
