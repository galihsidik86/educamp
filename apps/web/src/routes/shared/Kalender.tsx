import { useState } from 'react';
import { Alert, Card, Select } from '@/ds';
import { CalendarDays } from 'lucide-react';
import { useKalenderShared, type EventKalender } from '@/lib/queries-kalender';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';

const JENIS_LABEL: Record<EventKalender['jenis'], string> = {
  ujian: 'Ujian',
  libur: 'Libur',
  registrasi: 'Registrasi',
  wisuda: 'Wisuda',
  akademik: 'Akademik',
  lain: 'Lain',
};

export function KalenderShared() {
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');
  const { data, isLoading, error } = useKalenderShared(
    scope === 'upcoming' ? { upcoming: 30 } : {},
  );

  const grouped = groupByMonth(data?.items ?? []);

  return (
    <div className="stack">
      <PageHead
        eyebrow="KALENDER"
        title="Kalender Akademik"
        subtitle="Jadwal kampus: UTS/UAS, periode KRS, libur, wisuda, dan event akademik lain."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Tampilkan" value={scope} onChange={(e) => setScope((e.target as HTMLSelectElement).value as 'upcoming' | 'all')}>
            <option value="upcoming">Mendatang (30 event)</option>
            <option value="all">Semua</option>
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada event">Kalender akademik untuk periode ini belum diisi.</Alert>
      )}

      <div className="stack">
        {grouped.map(([monthLabel, items]) => (
          <div key={monthLabel}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--space-2)' }}>
              {monthLabel}
            </div>
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              {items.map((e) => (
                <Card key={e.id}>
                  <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 64, textAlign: 'center' }}>
                      <div className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{dayShort(e.tanggalMulai)}</div>
                      <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, lineHeight: 1 }}>{dayNum(e.tanggalMulai)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                        <CalendarDays size={14} className="muted" />
                        <strong>{e.judul}</strong>
                        <span className="pill pill--neutral">{JENIS_LABEL[e.jenis]}</span>
                      </div>
                      <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                        {formatTanggal(e.tanggalMulai)}
                        {e.tanggalSelesai && ` → ${formatTanggal(e.tanggalSelesai)}`}
                      </div>
                      {e.deskripsi && <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{e.deskripsi}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByMonth(items: EventKalender[]): Array<[string, EventKalender[]]> {
  const map = new Map<string, EventKalender[]>();
  for (const e of items) {
    const d = new Date(e.tanggalMulai);
    const key = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function dayNum(s: string): string { return String(new Date(s).getDate()).padStart(2, '0'); }
function dayShort(s: string): string {
  return new Date(s).toLocaleDateString('id-ID', { weekday: 'short' }).slice(0, 3).toUpperCase();
}
