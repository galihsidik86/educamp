import { Card } from '@/ds';

export function Placeholder({ title, fase }: { title: string; fase: number }) {
  return (
    <div className="stack">
      <h1 style={{ margin: 0, color: 'var(--text-strong)' }}>{title}</h1>
      <Card>
        <p className="muted" style={{ margin: 0 }}>
          Modul ini direncanakan pada <strong>Fase {fase}</strong>. Skema database, auth, dan routing sudah siap —
          implementasi akan menambahkan endpoint API dan tampilan layar di sini.
        </p>
      </Card>
    </div>
  );
}
