import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { NamaInstitusiText } from '@/components/KopInstitusi';
import { useKrs, useProfil } from '@/lib/queries';
import { capitalize } from '@/lib/format';

const HARI_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export function MahasiswaKrsCetak() {
  const navigate = useNavigate();
  const profil = useProfil();
  const krs = useKrs();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (profil.isLoading || krs.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data || !krs.data) return <p className="muted">Data tidak tersedia.</p>;

  const items = [...krs.data.items].sort((a, b) => {
    const ah = a.kelas.hari ? HARI_ORDER.indexOf(a.kelas.hari) : 99;
    const bh = b.kelas.hari ? HARI_ORDER.indexOf(b.kelas.hari) : 99;
    if (ah !== bh) return ah - bh;
    return (a.kelas.jamMulai ?? '').localeCompare(b.kelas.jamMulai ?? '');
  });

  const dpa = profil.data.dpa
    ? [profil.data.dpa.gelarDepan, profil.data.dpa.nama, profil.data.dpa.gelarBelakang].filter(Boolean).join(' ')
    : '—';

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/krs')} leftIcon={<ArrowLeft size={14} />}>
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
          <h2 className="krs-cetak__title">KARTU RENCANA STUDI</h2>
          <div className="krs-cetak__subtitle">Semester {krs.data.semester.kode}</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>NIM</td><td>:</td><td className="mono">{profil.data.nim}</td>
                <td>Program Studi</td><td>:</td><td>{profil.data.prodi.nama}</td></tr>
            <tr><td>Nama</td><td>:</td><td>{profil.data.nama}</td>
                <td>Angkatan</td><td>:</td><td>{profil.data.angkatan}</td></tr>
            <tr><td>Dosen PA</td><td>:</td><td>{dpa}</td>
                <td>Status</td><td>:</td><td>{capitalize(krs.data.status)}</td></tr>
          </tbody>
        </table>

        <table className="krs-cetak__table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Mata Kuliah</th>
              <th>SKS</th>
              <th>Kelas</th>
              <th>Jadwal</th>
              <th>Dosen</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id}>
                <td className="num">{i + 1}</td>
                <td className="mono">{it.kelas.kodeMK}</td>
                <td>{it.kelas.namaMK}</td>
                <td className="num">{it.kelas.sks}</td>
                <td>{it.kelas.kodeKelas}</td>
                <td className="mono">
                  {it.kelas.hari ? `${capitalize(it.kelas.hari)}, ${it.kelas.jamMulai}–${it.kelas.jamSelesai}` : '—'}
                  {it.kelas.ruangan ? ` · ${it.kelas.ruangan}` : ''}
                </td>
                <td>{it.kelas.dosen}</td>
              </tr>
            ))}
            <tr className="krs-cetak__total">
              <td colSpan={3}>Total SKS</td>
              <td className="num">{krs.data.totalSks}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        <div className="krs-cetak__ttd">
          <div>
            <div>Mengetahui,</div>
            <div>Dosen Pembimbing Akademik</div>
            <div className="krs-cetak__sign"></div>
            <div><strong>{dpa}</strong></div>
            {profil.data.dpa && <div className="mono">NIDN. {profil.data.dpa.nidn}</div>}
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Mahasiswa,</div>
            <div className="krs-cetak__sign"></div>
            <div><strong>{profil.data.nama}</strong></div>
            <div className="mono">NIM. {profil.data.nim}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
