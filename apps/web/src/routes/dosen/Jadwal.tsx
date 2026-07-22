import { Alert, Card } from '@/ds';
import { useDosenJadwal } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { capitalize } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const;
const SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const timeToRow = (t: string) => Math.max(0, (Number(t.split(':')[0]) || 0) - 7);
const durationRows = (s: string, e: string) => {
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  return Math.max(1, Math.round(((eh! * 60 + em!) - (sh! * 60 + sm!)) / 60));
};

export function DosenJadwal() {
  const { data, isLoading, error } = useDosenJadwal();

  const blocksByDay: Record<string, NonNullable<typeof data>['jadwal']> = {} as any;
  if (data) for (const j of data.jadwal) (blocksByDay[j.hari] ??= []).push(j);

  return (
    <div className="stack">
      <PageHead
        eyebrow={data ? `SEMESTER ${data.semester.jenis.toUpperCase()} ${data.semester.kode}` : ''}
        title="Jadwal Mengajar"
        subtitle="Kelas yang Anda ampu pada semester aktif."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.jadwal.length === 0 ? (
        <Alert variant="info" title="Belum ada kelas">Anda belum diberi penugasan mengajar di semester ini.</Alert>
      ) : data && (
        <div className="schedule-grid" style={{ gridTemplateRows: `auto repeat(${SLOTS.length}, 56px)` }}>
          <div className="schedule-grid__header" />
          {HARI.map((h) => <div key={h} className="schedule-grid__header">{capitalize(h)}</div>)}

          {SLOTS.map((time, rowIdx) => (
            <>
              <div key={`t-${time}`} className="schedule-grid__time">{time}</div>
              {HARI.map((hari) => {
                const blocks = (blocksByDay[hari] ?? []).filter((b) => timeToRow(b.jamMulai) === rowIdx);
                return (
                  <div key={`${hari}-${time}`} className="schedule-grid__cell">
                    {blocks.map((b) => (
                      <div
                        key={b.id}
                        className="schedule-block"
                        style={{
                          position: 'absolute', inset: 0,
                          height: `calc(${durationRows(b.jamMulai, b.jamSelesai)} * 56px - 4px)`,
                        }}
                      >
                        <strong>{b.namaMK}</strong>
                        <div className="muted">{b.kodeMK} · Kelas {b.kodeKelas}{b.ruangan ? ` · ${b.ruangan}` : ''}</div>
                        <div className="muted" style={{ fontFamily: 'var(--font-mono)' }}>{b.jamMulai}–{b.jamSelesai}</div>
                        <div className="muted">{b.pesertaCount} mhs</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      )}
    </div>
  );
}
