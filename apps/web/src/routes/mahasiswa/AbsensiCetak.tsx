import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { NamaInstitusiText } from '@/components/KopInstitusi';
import { useMahasiswaAbsensi, useProfil } from '@/lib/queries';
import { formatTanggalWaktu, capitalize } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa',
};

export function MahasiswaAbsensiCetak() {
  const navigate = useNavigate();
  const profil = useProfil();
  const absensi = useMahasiswaAbsensi();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (profil.isLoading || absensi.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data || !absensi.data) return <p className="muted">Data tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/absensi')} leftIcon={<ArrowLeft size={14} />}>
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
          <h2 className="krs-cetak__title">REKAP ABSENSI</h2>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>NIM</td><td>:</td><td className="mono">{profil.data.nim}</td>
                <td>Program Studi</td><td>:</td><td>{profil.data.prodi.nama}</td></tr>
            <tr><td>Nama</td><td>:</td><td>{profil.data.nama}</td>
                <td>Angkatan</td><td>:</td><td>{profil.data.angkatan}</td></tr>
          </tbody>
        </table>

        {absensi.data.items.length === 0 && (
          <p className="muted">Belum ada data absensi.</p>
        )}

        <table className="krs-cetak__table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Mata Kuliah</th>
              <th>SKS</th>
              <th>Hadir</th>
              <th>Izin</th>
              <th>Sakit</th>
              <th>Alpa</th>
              <th>Total</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {absensi.data.items.map((k, i) => (
              <tr key={k.kelasId}>
                <td className="num">{i + 1}</td>
                <td className="mono">{k.kodeMK}</td>
                <td>{k.namaMK} <span className="muted">({k.kodeKelas})</span></td>
                <td className="num">{k.sks}</td>
                <td className="num">{k.ringkasan.hadir}</td>
                <td className="num">{k.ringkasan.izin}</td>
                <td className="num">{k.ringkasan.sakit}</td>
                <td className="num">{k.ringkasan.alpa}</td>
                <td className="num">{k.totalDinilai}</td>
                <td className="num"><strong>{k.persentaseHadir != null ? `${k.persentaseHadir}%` : '—'}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        {absensi.data.items.map((k) => (
          k.detail.length > 0 ? (
            <div key={k.kelasId} style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ margin: '0 0 var(--space-2)' }}>
                {k.kodeMK} — {k.namaMK} <span className="muted">({k.kodeKelas})</span>
              </h4>
              <table className="krs-cetak__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tanggal</th>
                    <th>Topik</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {k.detail.map((d) => (
                    <tr key={d.pertemuanKe}>
                      <td className="num mono">{d.pertemuanKe}</td>
                      <td className="mono">{formatTanggalWaktu(d.tanggal)}</td>
                      <td>{d.topik ?? '—'}</td>
                      <td>{d.status ? STATUS_LABEL[d.status] ?? capitalize(d.status) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null
        ))}

        <div className="krs-cetak__ttd">
          <div></div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Kepala Bagian Akademik</div>
            <div className="krs-cetak__sign"></div>
            <div><strong>(.....................................)</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
