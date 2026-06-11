import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Select } from '@/ds';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import {
  useAkademikKrs, useAkademikKrsDetail, useAkademikValidasiKrs,
  useProdi,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { capitalize } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AdminValidasiKrsList() {
  const [filters, setFilters] = useState({ status: 'diajukan', prodiId: '' });
  const { data, isLoading, error } = useAkademikKrs(filters);
  const prodi = useProdi();
  const perlu = data?.items.filter((i) => i.perluValidasi).length ?? 0;

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Validasi KRS"
        subtitle="Kelola pengajuan KRS lintas mahasiswa semester aktif."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {perlu > 0 && filters.status !== 'diajukan' && (
        <Alert variant="info" title={`${perlu} mahasiswa menunggu validasi`}>
          Ganti filter status ke "diajukan" untuk fokus pada antrian.
        </Alert>
      )}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status KRS" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            <option value="draft">Draft</option>
            <option value="diajukan">Diajukan</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th><th>Nama</th><th>Prodi</th>
              <th className="center">Angkatan</th>
              <th>DPA</th><th>Status</th>
              <th className="num">MK</th>
              <th className="num">SKS</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Tidak ada data.</td></tr>}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.nim}</td>
                <td>{m.nama}</td>
                <td>{m.prodi.nama}</td>
                <td className="center mono">{m.angkatan}</td>
                <td>{m.dpa ?? <span className="muted">—</span>}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <StatusPill status={m.krsStatus} />
                    {m.isPrsRevisi && (
                      <span className="pill pill--prs" title="Revisi saat PRS">
                        Revisi PRS
                      </span>
                    )}
                  </div>
                </td>
                <td className="num">{m.krsTotal}</td>
                <td className="num">{m.krsSks}</td>
                <td className="num">
                  <Link to={`/akademik/krs/${m.id}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
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

export function AdminValidasiKrsDetail() {
  const { mahasiswaId } = useParams<{ mahasiswaId: string }>();
  const { data, isLoading, error } = useAkademikKrsDetail(mahasiswaId);
  const validasi = useAkademikValidasiKrs(mahasiswaId);
  const [catatan, setCatatan] = useState('');
  const [actErr, setActErr] = useState<string | null>(null);
  const [actOk, setActOk] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Mahasiswa tidak ditemukan.</Alert>;

  const diajukan = data.items.filter((i) => i.status === 'diajukan');
  const prsTambah = data.items.filter((i) => i.tipe === 'prs-tambah');
  const prsDrop = data.items.filter((i) => i.tipe === 'prs-drop');
  const isPrsContext = prsTambah.length > 0 || prsDrop.length > 0;

  const act = async (action: 'setujui' | 'tolak') => {
    setActErr(null); setActOk(null);
    try {
      const r = await validasi.mutateAsync({ action, catatan: catatan.trim() || undefined });
      setActOk(`${action === 'setujui' ? 'Disetujui' : 'Ditolak'} (${(r as any).updated} item).`);
      setCatatan('');
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  return (
    <div className="stack">
      <Link to="/akademik/krs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar
      </Link>

      <PageHead
        eyebrow="VALIDASI KRS"
        title={data.mahasiswa.nama}
        subtitle={`NIM ${data.mahasiswa.nim} · ${data.mahasiswa.prodi.nama} · Angkatan ${data.mahasiswa.angkatan}${data.mahasiswa.dpa ? ' · DPA: ' + data.mahasiswa.dpa.nama : ''}`}
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {actOk && <Alert variant="success" title="Berhasil">{actOk}</Alert>}
      {isPrsContext && (
        <Alert variant="info" title="Pengajuan revisi PRS">
          Mahasiswa mengajukan perubahan saat periode PRS:
          {prsTambah.length > 0 && <> <strong>{prsTambah.length}</strong> tambah</>}
          {prsTambah.length > 0 && prsDrop.length > 0 && ' · '}
          {prsDrop.length > 0 && <> <strong>{prsDrop.length}</strong> drop</>}
          . Validasi hanya berlaku untuk item berstatus "diajukan"; drop sudah final.
        </Alert>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode</th><th>Mata Kuliah</th>
              <th className="center">SKS</th><th>Kelas</th>
              <th>Jadwal</th><th>Dosen</th><th>Tipe</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={8} className="muted center">Belum ada KRS.</td></tr>}
            {data.items.map((it) => (
              <tr key={it.id} style={{ opacity: it.tipe === 'prs-drop' ? 0.65 : 1 }}>
                <td className="mono">{it.kelas.kodeMK}</td>
                <td style={{ textDecoration: it.tipe === 'prs-drop' ? 'line-through' : 'none' }}>{it.kelas.namaMK}</td>
                <td className="num">{it.kelas.sks}</td>
                <td>{it.kelas.kodeKelas}</td>
                <td className="mono">
                  {it.kelas.hari ? `${capitalize(it.kelas.hari)}, ${it.kelas.jamMulai}–${it.kelas.jamSelesai}` : '—'}
                  {it.kelas.ruangan && <span className="muted"> · {it.kelas.ruangan}</span>}
                </td>
                <td>{it.kelas.dosen}</td>
                <td>
                  {it.tipe === 'prs-tambah' && <span className="pill pill--prs">PRS Tambah</span>}
                  {it.tipe === 'prs-drop' && <span className="pill pill--drop">PRS Drop</span>}
                  {it.tipe === 'krs' && <span className="muted">KRS</span>}
                </td>
                <td><StatusPill status={it.status} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>SKS efektif (tidak termasuk drop)</td>
              <td className="num"><strong>{data.sksEfektif}</strong></td>
              <td colSpan={5} className="muted">Total seluruh entri: {data.totalSks}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {diajukan.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>
            {isPrsContext ? `Validasi ${diajukan.length} perubahan PRS` : `Validasi ${diajukan.length} item`}
          </h3>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan untuk mahasiswa (opsional)…"
            className="tz-input"
            style={{ width: '100%', minHeight: 80, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
          <div className="row" style={{ marginTop: 12, gap: 'var(--space-2)' }}>
            <Button variant="primary" leftIcon={<CheckCircle2 size={16} />} disabled={validasi.isPending} onClick={() => act('setujui')}>
              {isPrsContext ? 'Setujui perubahan' : 'Setujui semua'}
            </Button>
            <Button variant="danger" leftIcon={<XCircle size={16} />} disabled={validasi.isPending} onClick={() => act('tolak')}>
              {isPrsContext ? 'Tolak perubahan' : 'Tolak semua'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
