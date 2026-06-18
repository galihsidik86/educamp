import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, Alert, Select } from '@/ds';
import { NamaInstitusiText } from '@/components/KopInstitusi';
import { useAdminAbsensi, usePeriode } from '@/lib/queries-akademik';
import { useInstitusiPublic } from '@/lib/queries-institusi';
import { capitalize, formatTanggal } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };

export function AdminMahasiswaKehadiranCetak() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const periode = usePeriode();
  const [semesterId, setSemesterId] = useState<string>('');
  const absensi = useAdminAbsensi(id, semesterId || undefined);
  const inst = useInstitusiPublic();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (absensi.isLoading) return <p className="muted">Memuat…</p>;
  if (absensi.error || !absensi.data) return <Alert variant="danger" title="Gagal memuat">Data tidak tersedia.</Alert>;

  const m = absensi.data.mahasiswa;
  const sem = absensi.data.semester;
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const ttdName = inst.data?.kepalaBaakNama ?? '(.....................................)';

  // Rekap total
  const totalRingkasan = absensi.data.items.reduce((acc, k) => ({
    hadir: acc.hadir + k.ringkasan.hadir,
    izin: acc.izin + k.ringkasan.izin,
    sakit: acc.sakit + k.ringkasan.sakit,
    alpa: acc.alpa + k.ringkasan.alpa,
    totalDinilai: acc.totalDinilai + k.totalDinilai,
  }), { hadir: 0, izin: 0, sakit: 0, alpa: 0, totalDinilai: 0 });
  const persenTotal = totalRingkasan.totalDinilai > 0 ? Math.round((totalRingkasan.hadir / totalRingkasan.totalDinilai) * 100) : null;

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/akademik/mahasiswa')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <div style={{ minWidth: 240 }}>
          <Select label="" value={semesterId || sem.id} onChange={(e) => setSemesterId((e.target as HTMLSelectElement).value)}>
            {periode.data?.items.flatMap((ta) => ta.semester.map((s) => (
              <option key={s.id} value={s.id}>{s.jenis} {ta.kode} ({s.kode}){s.isAktif ? ' · aktif' : ''}</option>
            )))}
          </Select>
        </div>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>
          Cetak
        </Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <div className="krs-cetak__brand">
            <strong><NamaInstitusiText /></strong>
            <div>{m.fakultas.nama}</div>
            <div>Program Studi {m.prodi.nama}</div>
          </div>
          <h2 className="krs-cetak__title">REKAP KEHADIRAN MAHASISWA</h2>
          <div className="krs-cetak__subtitle">Semester {capitalize(sem.jenis)} {sem.tahunAjaran.kode} ({sem.kode})</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr>
              <td>NIM</td><td>:</td><td className="mono">{m.nim}</td>
              <td>Nama</td><td>:</td><td><strong>{m.nama}</strong></td>
            </tr>
            <tr>
              <td>Angkatan</td><td>:</td><td className="mono">{m.angkatan}</td>
              <td>Prodi</td><td>:</td><td>{m.prodi.nama}</td>
            </tr>
          </tbody>
        </table>

        {absensi.data.items.length === 0 && (
          <Alert variant="info" title="Tidak ada KRS disetujui">
            Mahasiswa belum memiliki kelas yang disetujui pada semester ini.
          </Alert>
        )}

        {absensi.data.items.length > 0 && (
          <>
            <h3 style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-base)' }}>Ringkasan per Mata Kuliah</h3>
            <table className="krs-cetak__table">
              <thead>
                <tr>
                  <th>No</th><th>Kode MK</th><th>Mata Kuliah</th><th>Kelas</th><th>SKS</th>
                  <th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpa</th>
                  <th>Total Pertemuan</th><th>% Hadir</th>
                </tr>
              </thead>
              <tbody>
                {absensi.data.items.map((k, i) => (
                  <tr key={k.kelasId}>
                    <td className="num">{i + 1}</td>
                    <td className="mono">{k.kodeMK}</td>
                    <td>{k.namaMK}</td>
                    <td className="mono">{k.kodeKelas}</td>
                    <td className="num">{k.sks}</td>
                    <td className="num">{k.ringkasan.hadir}</td>
                    <td className="num">{k.ringkasan.izin}</td>
                    <td className="num">{k.ringkasan.sakit}</td>
                    <td className="num">{k.ringkasan.alpa}</td>
                    <td className="num">{k.totalDinilai}/{k.totalPertemuan}</td>
                    <td className="num mono"><strong>{k.persentaseHadir != null ? `${k.persentaseHadir}%` : '—'}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="krs-cetak__total">
                  <td colSpan={5}>Total</td>
                  <td className="num">{totalRingkasan.hadir}</td>
                  <td className="num">{totalRingkasan.izin}</td>
                  <td className="num">{totalRingkasan.sakit}</td>
                  <td className="num">{totalRingkasan.alpa}</td>
                  <td className="num">{totalRingkasan.totalDinilai}</td>
                  <td className="num mono"><strong>{persenTotal != null ? `${persenTotal}%` : '—'}</strong></td>
                </tr>
              </tfoot>
            </table>

            <h3 style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-base)' }}>Detail per Pertemuan</h3>
            {absensi.data.items.map((k) => (
              <div key={k.kelasId} style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {k.kodeMK} · {k.namaMK} <span className="muted" style={{ fontWeight: 400 }}>· Kelas {k.kodeKelas} · {k.dosen}</span>
                </div>
                <table className="krs-cetak__table">
                  <thead>
                    <tr>
                      <th>Pertemuan</th><th>Tanggal</th><th>Topik</th><th>Status</th><th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.detail.map((p) => (
                      <tr key={p.pertemuanKe}>
                        <td className="num mono">{p.pertemuanKe}</td>
                        <td className="mono">{formatTanggal(p.tanggal)}</td>
                        <td>{p.topik ?? '—'}</td>
                        <td>{p.status ? STATUS_LABEL[p.status] ?? p.status : '—'}</td>
                        <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{p.catatan ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}

        <div className="krs-cetak__ttd">
          <div></div>
          <div>
            <div>{inst.data?.kota ?? 'Bogor'}, {tanggalCetak}</div>
            <div>{inst.data?.bagianAkademikNama ?? 'Kepala Bagian Akademik'}</div>
            <div className="krs-cetak__sign" style={{ height: 60 }}></div>
            <div><strong>{ttdName}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
