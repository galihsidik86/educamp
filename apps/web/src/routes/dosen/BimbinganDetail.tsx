import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useBimbinganDetail, useValidasiKrs } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { PageLoadingSkeleton } from '@/components/Skeleton';
import { capitalize } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function DosenBimbinganDetail() {
  const { mahasiswaId } = useParams<{ mahasiswaId: string }>();
  const { data, isLoading, error } = useBimbinganDetail(mahasiswaId);
  const validasi = useValidasiKrs(mahasiswaId);
  const [catatan, setCatatan] = useState('');
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Mahasiswa tidak ditemukan atau bukan bimbingan Anda.</Alert>;

  const diajukan = data.items.filter((i) => i.status === 'diajukan');
  const canValidate = diajukan.length > 0;

  const act = async (action: 'setujui' | 'tolak') => {
    setActionErr(null); setActionOk(null);
    try {
      const r = await validasi.mutateAsync({ action, catatan: catatan.trim() || undefined });
      setActionOk(action === 'setujui' ? `Disetujui (${(r as any).updated} item).` : `Ditolak (${(r as any).updated} item).`);
      setCatatan('');
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : 'Gagal memvalidasi');
    }
  };

  return (
    <div className="stack">
      <Link to="/dosen/bimbingan" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar bimbingan
      </Link>

      <PageHead
        eyebrow={`KRS · SEMESTER ${data.semester.kode}`}
        title={data.mahasiswa.nama}
        subtitle={`NIM ${data.mahasiswa.nim} · ${data.mahasiswa.prodi.nama} · Angkatan ${data.mahasiswa.angkatan}`}
      />

      {actionErr && <Alert variant="danger" title="Gagal">{actionErr}</Alert>}
      {actionOk && <Alert variant="success" title="Berhasil">{actionOk}</Alert>}

      <div className="row" style={{ gap: 'var(--space-6)' }}>
        <Stat label="Total MK" value={data.items.length.toString()} />
        <Stat label="Total SKS" value={data.totalSks.toString()} />
        <Stat label="Perlu Validasi" value={diajukan.length.toString()} />
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode</th><th>Mata Kuliah</th>
              <th className="center">SKS</th><th>Kelas</th><th>Jadwal</th>
              <th>Dosen</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={7} className="muted center">Belum ada KRS pada semester ini.</td></tr>}
            {data.items.map((it) => (
              <tr key={it.id}>
                <td className="mono">{it.kelas.kodeMK}</td>
                <td>{it.kelas.namaMK}</td>
                <td className="num">{it.kelas.sks}</td>
                <td>{it.kelas.kodeKelas}</td>
                <td className="mono">
                  {it.kelas.hari ? `${capitalize(it.kelas.hari)}, ${it.kelas.jamMulai}–${it.kelas.jamSelesai}` : '—'}
                  {it.kelas.ruangan && <span className="muted"> · {it.kelas.ruangan}</span>}
                </td>
                <td>{it.kelas.dosen}</td>
                <td><StatusPill status={it.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canValidate && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Validasi KRS</h3>
          <p className="muted" style={{ marginTop: 0 }}>Tindakan ini akan mengubah status semua {diajukan.length} item berstatus "diajukan".</p>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan untuk mahasiswa (opsional)…"
            className="tz-input"
            style={{ width: '100%', minHeight: 80, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
          <div className="row" style={{ marginTop: 12, gap: 'var(--space-2)' }}>
            <Button variant="primary" leftIcon={<CheckCircle2 size={16} />} disabled={validasi.isPending} onClick={() => act('setujui')}>
              Setujui semua
            </Button>
            <Button variant="danger" leftIcon={<XCircle size={16} />} disabled={validasi.isPending} onClick={() => act('tolak')}>
              Tolak semua
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-strong)' }}>{value}</div>
    </div>
  );
}
