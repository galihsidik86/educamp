import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Save, Check, X, Stethoscope, FileWarning, QrCode, KeyRound, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useDosenAbsensiPertemuan, useDosenAbsensiActions, useDosenPinStatus, type AbsensiStatus } from '@/lib/queries-dosen';
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

      {pertemuanId && <PinPanel pertemuanId={pertemuanId} />}

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

function PinPanel({ pertemuanId }: { pertemuanId: string }) {
  const { generatePin, clearPin } = useDosenAbsensiActions(undefined, pertemuanId);
  // Poll setiap 5 detik untuk lihat siapa yang sudah check-in
  const status = useDosenPinStatus(pertemuanId, { refetchInterval: 5000 });
  const [err, setErr] = useState<string | null>(null);
  const [durasi, setDurasi] = useState(15);
  const [showQr, setShowQr] = useState(true);
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!status.data?.expiresAt) { setRemaining(0); return; }
    const exp = new Date(status.data.expiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, exp - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [status.data?.expiresAt]);

  const generate = async () => {
    setErr(null);
    try { await generatePin.mutateAsync({ id: pertemuanId, durasiMenit: durasi }); status.refetch(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };
  const clear = async () => {
    if (!confirm('Hentikan self check-in untuk pertemuan ini?')) return;
    setErr(null);
    try { await clearPin.mutateAsync(pertemuanId); status.refetch(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const isActive = status.data?.isActive && remaining > 0;

  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
          <KeyRound size={16} className="muted" />
          <strong>Self Check-In via PIN/QR</strong>
          {status.data && status.data.hadirViaPin > 0 && (
            <span className="pill pill--success">{status.data.hadirViaPin} check-in via PIN</span>
          )}
        </div>
        {!isActive && (
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <label className="muted" style={{ fontSize: 'var(--text-sm)' }}>Durasi (menit):</label>
            <input
              type="number" min={1} max={180} value={durasi}
              onChange={(e) => setDurasi(Math.max(1, Math.min(180, Number(e.target.value))))}
              className="tz-input mono" style={{ width: 80, padding: 'var(--space-2)', textAlign: 'center' }}
            />
            <Button size="sm" variant="primary" leftIcon={<QrCode size={14} />} onClick={generate} disabled={generatePin.isPending}>
              {generatePin.isPending ? 'Generating…' : 'Generate PIN/QR'}
            </Button>
          </div>
        )}
      </div>

      {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

      {isActive && status.data?.pin && (
        <div className="row" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          {showQr && (
            <div style={{ padding: 'var(--space-3)', background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <QRCodeSVG value={status.data.pin} size={160} includeMargin={false} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>PIN Kehadiran</div>
            <div className="mono" style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '0.2em', color: 'var(--text-strong)' }}>
              {status.data.pin}
            </div>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>Berakhir dalam:</div>
              <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: remaining < 60_000 ? 'var(--danger-fg)' : 'var(--text-strong)' }}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
            </div>
            <div className="row" style={{ marginTop: 'var(--space-3)', gap: 8 }}>
              <Button size="sm" variant="ghost" onClick={() => setShowQr((s) => !s)}>{showQr ? 'Sembunyikan QR' : 'Tampilkan QR'}</Button>
              <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={14} />} onClick={generate} disabled={generatePin.isPending}>Generate ulang</Button>
              <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={clear}>Hentikan</Button>
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              Mahasiswa input PIN di menu <strong>Absensi → Self Check-In</strong> atau scan QR.
              {status.data && ` ${status.data.hadirViaPin} dari ${status.data.totalHadir} hadir via PIN.`}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
