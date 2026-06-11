import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Save, Check, X, Stethoscope, FileWarning } from 'lucide-react';
import { useDosenAbsensiPertemuan, useDosenAbsensiActions, type AbsensiStatus } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_OPTIONS: Array<{ value: AbsensiStatus; label: string; variant: 'primary' | 'secondary' | 'ghost' | 'danger'; icon: React.ReactNode }> = [
  { value: 'hadir', label: 'Hadir', variant: 'primary',   icon: <Check size={14} /> },
  { value: 'izin',  label: 'Izin',  variant: 'secondary', icon: <FileWarning size={14} /> },
  { value: 'sakit', label: 'Sakit', variant: 'secondary', icon: <Stethoscope size={14} /> },
  { value: 'alpa',  label: 'Alpa',  variant: 'danger',    icon: <X size={14} /> },
];

export function DosenAbsensiPertemuan() {
  const { kelasId, pertemuanId } = useParams<{ kelasId: string; pertemuanId: string }>();
  const { data, isLoading } = useDosenAbsensiPertemuan(pertemuanId);
  const { setAbsensi } = useDosenAbsensiActions(kelasId, pertemuanId);

  // Local state of statuses, keyed by mahasiswaId.
  const [statuses, setStatuses] = useState<Record<string, AbsensiStatus>>({});
  const [actErr, setActErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const init: Record<string, AbsensiStatus> = {};
    for (const p of data.peserta) {
      init[p.mahasiswaId] = (p.status ?? 'alpa') as AbsensiStatus;
    }
    setStatuses(init);
  }, [data]);

  const setBulk = (status: AbsensiStatus) => {
    if (!data) return;
    setStatuses(Object.fromEntries(data.peserta.map((p) => [p.mahasiswaId, status])));
  };

  const save = async () => {
    if (!pertemuanId || !data) return;
    setActErr(null);
    setSavedMsg(null);
    try {
      const items = Object.entries(statuses).map(([mahasiswaId, status]) => ({ mahasiswaId, status }));
      const res = await setAbsensi.mutateAsync({ pertemuanId, items });
      setSavedMsg(`${(res as any).updated} mahasiswa tersimpan.`);
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Pertemuan tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link
        to={`/dosen/absensi/${kelasId}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar pertemuan
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={`Pertemuan ${data.pertemuan.pertemuanKe}`}
        subtitle={`${formatTanggalWaktu(data.pertemuan.tanggal)}${data.pertemuan.topik ? ' · ' + data.pertemuan.topik : ''}`}
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {savedMsg && <Alert variant="success" title="Tersimpan">{savedMsg}</Alert>}

      <Card>
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Tandai semua sebagai:</span>
          {STATUS_OPTIONS.map((opt) => (
            <Button key={opt.value} size="sm" variant="ghost" onClick={() => setBulk(opt.value)} leftIcon={opt.icon}>
              {opt.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>NIM</th>
              <th>Nama</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.peserta.length === 0 && (
              <tr><td colSpan={4} className="muted center">Belum ada peserta KRS disetujui di kelas ini.</td></tr>
            )}
            {data.peserta.map((p, i) => (
              <tr key={p.mahasiswaId}>
                <td className="num mono">{i + 1}</td>
                <td className="mono">{p.nim}</td>
                <td>{p.nama}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = statuses[p.mahasiswaId] === opt.value;
                      return (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={active ? opt.variant : 'ghost'}
                          onClick={() => setStatuses((s) => ({ ...s, [p.mahasiswaId]: opt.value }))}
                          leftIcon={opt.icon}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="primary" leftIcon={<Save size={16} />} disabled={setAbsensi.isPending || data.peserta.length === 0} onClick={save}>
          {setAbsensi.isPending ? 'Menyimpan…' : 'Simpan absensi'}
        </Button>
      </div>
    </div>
  );
}
