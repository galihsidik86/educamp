import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useLaporanHonorDosen } from '@/lib/queries-akademik';
import { formatTanggal } from '@/lib/format';
import { KopInstitusi } from '@/components/KopInstitusi';

const JABATAN_LABEL: Record<string, string> = {
  asisten_ahli: 'Asisten Ahli',
  lektor: 'Lektor',
  lektor_kepala: 'Lektor Kepala',
  guru_besar: 'Guru Besar',
  tenaga_pengajar: 'Tenaga Pengajar',
};

export function LaporanHonorDosenCetak() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const tanggalMulai = sp.get('tanggalMulai') ?? '';
  const tanggalSelesai = sp.get('tanggalSelesai') ?? '';
  const dosenId = sp.get('dosenId') ?? '';
  const prodiId = sp.get('prodiId') ?? '';

  const { data, isLoading } = useLaporanHonorDosen({
    tanggalMulai, tanggalSelesai,
    dosenId: dosenId || undefined,
    prodiId: prodiId || undefined,
  });

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Data tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={14} />}>Kembali</Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>Cetak</Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <KopInstitusi subtitle="Bagian Akademik (BAAK)" />
          <h2 className="krs-cetak__title">LAPORAN KEHADIRAN MENGAJAR DOSEN</h2>
          <div className="krs-cetak__subtitle">Pengajuan Honor Mengajar — Bagian SDM</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr>
              <td>Periode Laporan</td><td>:</td>
              <td><strong>{formatTanggal(data.periode.tanggalMulai)} s.d. {formatTanggal(data.periode.tanggalSelesai)}</strong></td>
              <td>Tanggal Cetak</td><td>:</td><td>{tanggalCetak}</td>
            </tr>
            <tr>
              <td>Total Dosen</td><td>:</td>
              <td className="mono"><strong>{data.ringkasan.totalDosen}</strong></td>
              <td>Total Kelas</td><td>:</td>
              <td className="mono"><strong>{data.ringkasan.totalKelas}</strong></td>
            </tr>
            <tr>
              <td>Total Pertemuan</td><td>:</td>
              <td className="mono"><strong>{data.ringkasan.totalPertemuan}</strong></td>
              <td>Ekuivalen SKS-Pertemuan</td><td>:</td>
              <td className="mono"><strong>{data.ringkasan.totalSksPertemuan}</strong></td>
            </tr>
          </tbody>
        </table>

        {/* Rekap ringkas — tabel utama yang dikirim ke SDM */}
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rekap Honor Mengajar
        </h3>
        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th style={{ width: '4%' }}>No.</th>
              <th style={{ width: '12%' }}>NIDN</th>
              <th>Nama Dosen</th>
              <th style={{ width: '14%' }}>Jabatan</th>
              <th className="num" style={{ width: '7%' }}>Kelas</th>
              <th className="num" style={{ width: '9%' }}>Pertemuan</th>
              <th className="num" style={{ width: '12%' }}>SKS × Prtm</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={it.dosen.id}>
                <td className="num">{i + 1}</td>
                <td className="mono">{it.dosen.nidn}</td>
                <td>{it.dosen.gelarLengkap}</td>
                <td>{it.dosen.jabatan ? (JABATAN_LABEL[it.dosen.jabatan] ?? it.dosen.jabatan) : '—'}</td>
                <td className="num mono">{it.totalKelas}</td>
                <td className="num mono"><strong>{it.totalPertemuan}</strong></td>
                <td className="num mono"><strong>{it.totalSksPertemuan}</strong></td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr><td colSpan={7} className="center muted">Tidak ada data pertemuan dalam periode ini.</td></tr>
            )}
            {data.items.length > 0 && (
              <tr className="krs-cetak__total">
                <td colSpan={4} style={{ textAlign: 'right' }}><strong>TOTAL</strong></td>
                <td className="num mono"><strong>{data.ringkasan.totalKelas}</strong></td>
                <td className="num mono"><strong>{data.ringkasan.totalPertemuan}</strong></td>
                <td className="num mono"><strong>{data.ringkasan.totalSksPertemuan}</strong></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Detail per dosen */}
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rincian Kelas & Pertemuan
        </h3>
        {data.items.map((it) => (
          <div key={it.dosen.id} style={{ marginBottom: 'var(--space-4)', breakInside: 'avoid' }}>
            <div style={{ background: 'var(--surface-sunken)', padding: 'var(--space-2) var(--space-3)', marginBottom: 4, borderLeft: '3px solid var(--text-strong)' }}>
              <strong>{it.dosen.gelarLengkap}</strong>
              <span className="muted" style={{ marginLeft: 8 }}>NIDN {it.dosen.nidn}{it.dosen.jabatan ? ` · ${JABATAN_LABEL[it.dosen.jabatan] ?? it.dosen.jabatan}` : ''}</span>
            </div>
            <table className="krs-cetak__table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>No.</th>
                  <th style={{ width: '10%' }}>Kode MK</th>
                  <th>Nama Mata Kuliah</th>
                  <th style={{ width: '7%' }}>Kelas</th>
                  <th className="num" style={{ width: '6%' }}>SKS</th>
                  <th style={{ width: '34%' }}>Tanggal Pertemuan</th>
                  <th className="num" style={{ width: '8%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {it.kelas.map((k, i) => (
                  <tr key={k.kelasId}>
                    <td className="num">{i + 1}</td>
                    <td className="mono">{k.kodeMK}</td>
                    <td>{k.namaMK}<div className="muted" style={{ fontSize: '10px' }}>{k.prodi.kode} · {k.semesterKode}</div></td>
                    <td className="mono">{k.kodeKelas}</td>
                    <td className="num mono">{k.sks}</td>
                    <td style={{ fontSize: '10px' }}>
                      {k.pertemuan.map((p) => `P${p.pertemuanKe} (${formatTanggal(p.tanggal)})`).join(', ')}
                    </td>
                    <td className="num mono"><strong>{k.pertemuan.length}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="muted" style={{ fontSize: '10px', marginTop: 'var(--space-4)', padding: 'var(--space-3)', border: '1px dashed var(--text-strong)' }}>
          <strong>Catatan untuk SDM:</strong> Jumlah pertemuan di atas merupakan pertemuan yang sudah terlaksana
          (terdapat catatan absensi mahasiswa). Perhitungan nominal honor mengacu pada SK Rektor terkait
          tarif honor mengajar per pertemuan / per SKS yang berlaku.
        </div>

        <div className="krs-cetak__ttd">
          <div>
            <div>Mengetahui,</div>
            <div>Kepala Bagian SDM</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Kepala BAAK</div>
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
