import { Card, Alert } from '@/ds';
import { useDosenProfil } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { formatStatus } from '@/lib/format';

export function DosenProfil() {
  const { data, isLoading, error } = useDosenProfil();
  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  const gelar = [data.gelarDepan, data.nama, data.gelarBelakang].filter(Boolean).join(' ');

  return (
    <div className="stack">
      <PageHead eyebrow="PROFIL DOSEN" title={gelar} subtitle={`${data.prodi.nama} · NIDN ${data.nidn}`} />

      <div className="grid-2col">
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Identitas</h3>
          <Row label="Nama lengkap">{gelar}</Row>
          <Row label="NIDN" mono>{data.nidn}</Row>
          <Row label="Email">{data.user.email}</Row>
          <Row label="Jabatan fungsional">{data.jabatanFungsional ? formatStatus(data.jabatanFungsional) : '—'}</Row>
          <Row label="Jabatan struktural">{data.jabatanStruktural ?? '—'}</Row>
          <Row label="DPA">{data.isDpa ? 'Ya' : 'Tidak'}</Row>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Aktivitas</h3>
          <Row label="Program Studi">{data.prodi.nama} ({data.prodi.kode})</Row>
          <Row label="Fakultas">{data.prodi.fakultas.nama}</Row>
          <Row label="Kelas diampu (total)" mono>{data._count.kelas}</Row>
          <Row label="Mahasiswa bimbingan" mono>{data._count.mahasiswaBimbingan}</Row>
          <Row label="Penelitian" mono>{data._count.penelitian}</Row>
          <Row label="Pengabdian" mono>{data._count.pengabdian}</Row>
        </Card>
      </div>

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
