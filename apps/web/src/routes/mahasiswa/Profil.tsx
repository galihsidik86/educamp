import { Card, Alert, Button } from '@/ds';
import { useNavigate } from 'react-router-dom';
import { IdCard } from 'lucide-react';
import { useProfil } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { formatTanggal } from '@/lib/format';

export function MahasiswaProfil() {
  const { data, isLoading, error } = useProfil();
  const navigate = useNavigate();

  if (isLoading) return <p className="muted">Memuat profil…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat profil">Coba muat ulang.</Alert>;

  const dpa = data.dpa
    ? [data.dpa.gelarDepan, data.dpa.nama, data.dpa.gelarBelakang].filter(Boolean).join(' ')
    : '—';

  return (
    <div className="stack">
      <PageHead
        eyebrow="PROFIL MAHASISWA"
        title={data.nama}
        subtitle={`NIM ${data.nim} · ${data.prodi.nama}`}
        right={
          <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
            <StatusPill status={data.status} />
            <Button variant="ghost" size="sm" leftIcon={<IdCard size={14} />} onClick={() => navigate('/mahasiswa/profil/kartu')}>
              Cetak Kartu
            </Button>
          </div>
        }
      />

      <div className="grid-2col">
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Identitas</h3>
          <Row label="Nama">{data.nama}</Row>
          <Row label="NIM" mono>{data.nim}</Row>
          <Row label="Email">{data.user.email}</Row>
          <Row label="Jenis kelamin">{data.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</Row>
          <Row label="Tempat, tanggal lahir">{data.tempatLahir ?? '—'}{data.tanggalLahir ? `, ${formatTanggal(data.tanggalLahir)}` : ''}</Row>
          <Row label="Telepon">{data.telepon ?? '—'}</Row>
          <Row label="Alamat">{data.alamat ?? '—'}</Row>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Akademik</h3>
          <Row label="Program Studi">{data.prodi.nama} ({data.prodi.kode})</Row>
          <Row label="Fakultas">{data.prodi.fakultas.nama}</Row>
          <Row label="Angkatan" mono>{data.angkatan}</Row>
          <Row label="Status mahasiswa"><StatusPill status={data.status} /></Row>
          <Row label="Dosen Pembimbing Akademik">{dpa}</Row>
        </Card>
      </div>

      <Alert variant="info" title="Edit profil belum tersedia">
        Perubahan data identitas hubungi BAAK. Untuk ganti password, gunakan formulir di bawah.
      </Alert>

      <ChangePasswordCard />
    </div>
  );
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="row" style={{ padding: 'var(--space-2) 0', borderBottom: '1px dashed var(--border-subtle)', alignItems: 'flex-start' }}>
      <div className="muted" style={{ minWidth: 220, fontSize: 'var(--text-sm)' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
