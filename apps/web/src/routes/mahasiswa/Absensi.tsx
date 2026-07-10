import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronDown, ChevronRight, Printer, CalendarClock, KeyRound, Search } from 'lucide-react';
import { useMahasiswaAbsensi } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu, formatTanggal, capitalize } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa',
};

export function MahasiswaAbsensi() {
  const { data, isLoading, error } = useMahasiswaAbsensi();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const canPrint = (data?.items.length ?? 0) > 0;

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((k) =>
      k.namaMK.toLowerCase().includes(query) ||
      k.kodeMK.toLowerCase().includes(query) ||
      k.dosen.toLowerCase().includes(query),
    );
  }, [data, q]);

  return (
    <div className="stack">
      <PageHead
        eyebrow="AKADEMIK"
        title="Presensi"
        subtitle="Rekap kehadiran Anda untuk setiap kelas semester aktif."
        right={
          <div className="row" style={{ gap: 4 }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<KeyRound size={14} />}
              onClick={() => navigate('/mahasiswa/absensi/pin')}
            >
              Self Check-In
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canPrint}
              leftIcon={<Printer size={14} />}
              onClick={() => navigate('/mahasiswa/absensi/cetak')}
            >
              Cetak Rekap
            </Button>
          </div>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada kelas">
          Anda belum memiliki kelas dengan KRS disetujui di semester aktif.
        </Alert>
      )}

      {data && data.items.length > 0 && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari mata kuliah atau dosen…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      )}
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada kelas yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <div className="stack">
        {items.map((k) => {
          const isOpen = open[k.kelasId] ?? false;
          const persen = k.persentaseHadir;
          return (
            <Card key={k.kelasId} hover>
              <div
                className="row"
                role="button"
                tabIndex={0}
                style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setOpen((s) => ({ ...s, [k.kelasId]: !isOpen }))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((s) => ({ ...s, [k.kelasId]: !isOpen })); } }}
              >
                <div>
                  <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {k.kodeMK} · Kelas {k.kodeKelas} · {k.sks} SKS
                  </div>
                  <strong style={{ color: 'var(--text-strong)' }}>{k.namaMK}</strong>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    Dosen: {k.dosen}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-strong)' }}>
                      {persen != null ? `${persen}%` : '—'}
                    </div>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                      {k.ringkasan.hadir} hadir / {k.totalDinilai} dinilai
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={18} className="muted" /> : <ChevronRight size={18} className="muted" />}
                </div>
              </div>

              {isOpen && (
                <>
                  <div className="row" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                    <Pill label="Hadir" value={k.ringkasan.hadir} />
                    <Pill label="Izin"  value={k.ringkasan.izin} />
                    <Pill label="Sakit" value={k.ringkasan.sakit} />
                    <Pill label="Alpa"  value={k.ringkasan.alpa} />
                    <span className="muted" style={{ alignSelf: 'center' }}>
                      Total pertemuan: <strong style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{k.totalPertemuan}</strong>
                    </span>
                  </div>

                  {k.detail.length > 0 && (
                    <div className="tz-table-wrap" style={{ marginTop: 'var(--space-3)' }}>
                      <table className="tz-table">
                        <thead>
                          <tr>
                            <th className="num">#</th>
                            <th>Tanggal</th>
                            <th>Topik</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {k.detail.map((d) => (
                            <tr key={d.pertemuanKe}>
                              <td className="num mono">{d.pertemuanKe}</td>
                              <td className="mono">
                                {formatTanggalWaktu(d.tanggal)}
                                {d.tanggalAsli && (
                                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                                    <CalendarClock size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                                    Dipindah dari {formatTanggal(d.tanggalAsli)}
                                  </div>
                                )}
                              </td>
                              <td>
                                {d.topik ?? <span className="muted">—</span>}
                                {d.alasanReschedule && (
                                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                                    Alasan: {d.alasanReschedule}
                                  </div>
                                )}
                              </td>
                              <td>
                                {d.status
                                  ? <span className={`pill ${pillForStatus(d.status)}`}>{STATUS_LABEL[d.status] ?? capitalize(d.status)}</span>
                                  : <span className="muted">Belum diisi</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-strong)' }}>{value}</div>
    </div>
  );
}

function pillForStatus(status: string): string {
  switch (status) {
    case 'hadir': return 'pill--success';
    case 'izin':  return 'pill--info';
    case 'sakit': return 'pill--warning';
    case 'alpa':  return 'pill--danger';
    default:      return 'pill--neutral';
  }
}
