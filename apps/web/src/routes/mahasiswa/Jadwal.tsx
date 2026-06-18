import { useMemo } from 'react';
import { Alert, Card } from '@/ds';
import { useJadwal } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { capitalize } from '@/lib/format';

const HARI = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const;
const SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function timeToRow(time: string): number {
  const [h] = time.split(':').map(Number);
  return Math.max(0, (h ?? 0) - 7);
}
function durationRows(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh! * 60 + em!) - (sh! * 60 + sm!);
  return Math.max(1, Math.round(diff / 60));
}

export function MahasiswaJadwal() {
  const { data, isLoading, error } = useJadwal();

  const blocksByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (data) {
      for (const j of data.jadwal) {
        const list = (map[j.hari] ??= []);
        list.push(j);
      }
    }
    return map;
  }, [data]);

  return (
    <div className="stack">
      <PageHead
        eyebrow={data ? `SEMESTER ${data.semester.jenis.toUpperCase()} ${data.semester.kode}` : ''}
        title="Jadwal Kuliah"
        subtitle="Hanya kelas yang KRS-nya sudah disetujui."
      />

      {error && <Alert variant="danger" title="Gagal memuat jadwal">Coba muat ulang.</Alert>}
      {isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat jadwal…</p></Card>}

      {data && data.jadwal.length === 0 ? (
        <Alert variant="info" title="Belum ada jadwal">
          Jadwal akan muncul setelah KRS Anda disetujui oleh Bagian Akademik.
        </Alert>
      ) : data && (
        <div className="schedule-grid" style={{ gridTemplateRows: `auto repeat(${SLOTS.length}, 56px)` }}>
          {/* header row */}
          <div className="schedule-grid__header"></div>
          {HARI.map((h) => (
            <div key={h} className="schedule-grid__header">{capitalize(h)}</div>
          ))}

          {/* time rows */}
          {SLOTS.map((time, rowIdx) => (
            <Row key={time} time={time} rowIdx={rowIdx} blocksByDay={blocksByDay as any} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ time, rowIdx, blocksByDay }: { time: string; rowIdx: number; blocksByDay: Record<string, Array<{ id: string; namaMK: string; kodeMK: string; ruangan: string | null; jamMulai: string; jamSelesai: string }>> }) {
  return (
    <>
      <div className="schedule-grid__time">{time}</div>
      {HARI.map((hari) => {
        const blocks = (blocksByDay[hari] ?? []).filter((b) => timeToRow(b.jamMulai) === rowIdx);
        return (
          <div key={hari} className="schedule-grid__cell">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="schedule-block"
                style={{
                  gridRow: `span ${durationRows(b.jamMulai, b.jamSelesai)}`,
                  position: 'absolute',
                  inset: 0,
                  height: `calc(${durationRows(b.jamMulai, b.jamSelesai)} * 56px - 4px)`,
                }}
              >
                <strong>{b.namaMK}</strong>
                <div className="muted">{b.kodeMK}{b.ruangan ? ` · ${b.ruangan}` : ''}</div>
                <div className="muted" style={{ fontFamily: 'var(--font-mono)' }}>{b.jamMulai}–{b.jamSelesai}</div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
