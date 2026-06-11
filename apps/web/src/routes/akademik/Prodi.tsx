import { Alert } from '@/ds';
import { useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';

export function AdminProdi() {
  const { data, isLoading, error } = useProdi();

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA"
        title="Program Studi"
        subtitle="Daftar prodi & fakultas yang aktif di STMIK Tazkia."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode</th><th>Nama Prodi</th><th>Jenjang</th><th>Fakultas</th>
              <th className="num">Mahasiswa</th><th className="num">Dosen</th><th className="num">Mata Kuliah</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="muted center">Memuat…</td></tr>}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.kode}</td>
                <td>{p.nama}</td>
                <td style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{p.jenjang}</td>
                <td>{p.fakultas.nama}</td>
                <td className="num">{p._count.mahasiswa}</td>
                <td className="num">{p._count.dosen}</td>
                <td className="num">{p._count.mataKuliah}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
