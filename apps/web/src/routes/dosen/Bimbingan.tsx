import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Input } from '@/ds';
import { useBimbingan } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { ChevronRight, Search } from 'lucide-react';

export function DosenBimbingan() {
  const { data, isLoading, error } = useBimbingan();
  const perluValidasi = data?.items.filter((i) => i.perluValidasi).length ?? 0;
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((m) =>
      m.nim.toLowerCase().includes(query) ||
      m.nama.toLowerCase().includes(query) ||
      m.prodi.nama.toLowerCase().includes(query),
    );
  }, [data, q]);

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

      {data && data.items.length > 0 && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari NIM, nama, atau prodi…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      )}
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada mahasiswa yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
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
            {items.map((m) => (
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
