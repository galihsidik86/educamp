import { Link } from 'react-router-dom';
import { Alert } from '@/ds';
import { useBimbingan } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { ChevronRight } from 'lucide-react';

export function DosenBimbingan() {
  const { data, isLoading, error } = useBimbingan();
  const perluValidasi = data?.items.filter((i) => i.perluValidasi).length ?? 0;

  return (
    <div className="stack">
      <PageHead
        eyebrow="BIMBINGAN AKADEMIK (DPA)"
        title="Mahasiswa Bimbingan"
        subtitle={`Validasi KRS yang diajukan oleh mahasiswa bimbingan Anda.`}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      {perluValidasi > 0 && (
        <Alert variant="warning" title={`${perluValidasi} mahasiswa menunggu validasi KRS`}>
          Periksa KRS yang berstatus "diajukan" — setujui atau tolak dengan catatan.
        </Alert>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th><th>Nama</th><th>Prodi</th>
              <th className="center">Angkatan</th>
              <th>Status KRS</th>
              <th className="num">MK</th>
              <th className="num">SKS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && (
              <tr><td colSpan={8} className="muted center">Belum ada mahasiswa bimbingan.</td></tr>
            )}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.nim}</td>
                <td>{m.nama}</td>
                <td>{m.prodi.nama}</td>
                <td className="center mono">{m.angkatan}</td>
                <td>
                  <StatusPill status={m.krsStatus} />
                  {m.perluValidasi && <span style={{ marginLeft: 6, color: 'var(--warning-fg)', fontSize: 'var(--text-2xs)' }}>· perlu validasi</span>}
                </td>
                <td className="num">{m.krsTotal}</td>
                <td className="num">{m.krsSks}</td>
                <td className="num">
                  <Link to={`/dosen/bimbingan/${m.id}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
                    Detail <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
