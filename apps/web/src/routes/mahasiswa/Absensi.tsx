import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { useMahasiswaAbsensi } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu, capitalize } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa',
};

export function MahasiswaAbsensi() {
  const { data, isLoading, error } = useMahasiswaAbsensi();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const canPrint = (data?.items.length ?? 0) > 0;

  return (
    <div className="stack">
      <PageHead
        eyebrow="AKADEMIK"
        title="Absensi"
        subtitle="Rekap kehadiran Anda untuk setiap kelas semester aktif."
        right={
          <Button
            variant="ghost"
            size="sm"
            disabled={!canPrint}
            leftIcon={<Printer size={14} />}
            onClick={() => navigate('/mahasiswa/absensi/cetak')}
          >
            Cetak Rekap
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada kelas">
          Anda belum memiliki kelas dengan KRS disetujui di semester aktif.
        </Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => {
          const isOpen = open[k.kelasId] ?? false;
          const persen = k.persentaseHadir;
          return (
            <Card key={k.kelasId}>
              <div
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setOpen((s) => ({ ...s, [k.kelasId]: !isOpen }))}
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
                              <td className="mono">{formatTanggalWaktu(d.tanggal)}</td>
                              <td>{d.topik ?? <span className="muted">—</span>}</td>
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
