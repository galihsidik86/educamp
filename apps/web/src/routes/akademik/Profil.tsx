import { Card, Alert } from '@/ds';
import { useAkademikProfil } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { PageLoadingSkeleton } from '@/components/Skeleton';

export function AkademikProfil() {
  const { data, isLoading, error } = useAkademikProfil();
  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  return (
    <div className="stack">
      <PageHead eyebrow="PROFIL AKADEMIK" title={data.nama} subtitle={data.jabatan ?? undefined} />
      <Card>
        <Row label="Email">{data.user.email}</Row>
        <Row label="NIP" mono>{data.nip ?? '—'}</Row>
        <Row label="Jabatan">{data.jabatan ?? '—'}</Row>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="row" style={{ padding: 'var(--space-2) 0', borderBottom: '1px dashed var(--border-subtle)' }}>
      <div className="muted" style={{ minWidth: 220, fontSize: 'var(--text-sm)' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
