import { Fragment, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useTranskrip, useProfil } from '@/lib/queries';
import { formatIp } from '@/lib/format';

export function MahasiswaNilaiTranskripCetak() {
  const navigate = useNavigate();
  const profil = useProfil();
  const transkrip = useTranskrip();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  const grouped = useMemo(() => {
    if (!transkrip.data) return [];
    const map = new Map<string, { kode: string; nama: string; items: typeof transkrip.data.items; sks: number }>();
    for (const it of transkrip.data.items) {
      if (!map.has(it.semesterKode)) {
        map.set(it.semesterKode, { kode: it.semesterKode, nama: it.semesterNama, items: [], sks: 0 });
      }
      const g = map.get(it.semesterKode)!;
      g.items.push(it);
      g.sks += it.sks;
    }
    return [...map.values()].sort((a, b) => a.kode.localeCompare(b.kode));
  }, [transkrip.data]);

  if (profil.isLoading || transkrip.isLoading) return <p className="muted">Memuat…</p>;
  if (!profil.data || !transkrip.data) return <p className="muted">Data tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let no = 0;

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
            <strong>INSTITUT AGAMA ISLAM TAZKIA</strong>
            <div>{profil.data.prodi.fakultas.nama}</div>
            <div>Program Studi {profil.data.prodi.nama}</div>
          </div>
          <h2 className="krs-cetak__title">TRANSKRIP NILAI AKADEMIK</h2>
          <div className="krs-cetak__subtitle">Sementara</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>NIM</td><td>:</td><td className="mono">{profil.data.nim}</td>
                <td>Program Studi</td><td>:</td><td>{profil.data.prodi.nama}</td></tr>
            <tr><td>Nama</td><td>:</td><td>{profil.data.nama}</td>
                <td>Fakultas</td><td>:</td><td>{profil.data.prodi.fakultas.nama}</td></tr>
            <tr><td>Angkatan</td><td>:</td><td className="mono">{profil.data.angkatan}</td>
                <td>Status</td><td>:</td><td>{capFirst(profil.data.status)}</td></tr>
          </tbody>
        </table>

        {grouped.length === 0 && <p className="muted">Belum ada nilai finalized.</p>}

        <table className="krs-cetak__table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Mata Kuliah</th>
              <th>SKS</th>
              <th>Nilai</th>
              <th>Huruf</th>
              <th>Bobot</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <Fragment key={g.kode}>
                <tr>
                  <td colSpan={7} style={{ background: 'var(--surface-sunken)', fontWeight: 700 }}>
                    {capFirst(g.nama)} ({g.kode}) — {g.items.length} MK · {g.sks} SKS
                  </td>
                </tr>
                {g.items.map((it) => {
                  no += 1;
                  return (
                    <tr key={`${g.kode}-${it.kodeMK}`}>
                      <td className="num">{no}</td>
                      <td className="mono">{it.kodeMK}</td>
                      <td>{it.namaMK}</td>
                      <td className="num">{it.sks}</td>
                      <td className="num">{it.nilaiAngka ?? '—'}</td>
                      <td className="num mono"><strong>{it.nilaiHuruf ?? '—'}</strong></td>
                      <td className="num">{it.bobot?.toFixed(2) ?? '—'}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="krs-cetak__total">
              <td colSpan={3}>Total SKS Lulus</td>
              <td className="num">{transkrip.data.totalSksLulus}</td>
              <td colSpan={2}>Indeks Prestasi Kumulatif (IPK)</td>
              <td className="num"><strong>{formatIp(transkrip.data.ipk)}</strong></td>
            </tr>
          </tfoot>
        </table>

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

const capFirst = (s: string) => s ? s[0]!.toUpperCase() + s.slice(1) : s;
