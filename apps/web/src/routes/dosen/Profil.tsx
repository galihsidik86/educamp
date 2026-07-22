import { useState } from 'react';
import { Card, Alert, Button, Input } from '@/ds';
import { Pencil } from 'lucide-react';
import { useDosenProfil, useUpdateDosenProfil, type DosenProfilUpdate } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { PageLoadingSkeleton } from '@/components/Skeleton';

export function DosenProfil() {
  const { data, isLoading, error } = useDosenProfil();
  const [editOpen, setEditOpen] = useState(false);
  if (isLoading) return <PageLoadingSkeleton />;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  const gelar = [data.gelarDepan, data.nama, data.gelarBelakang].filter(Boolean).join(' ');

  return (
    <div className="stack">
      <PageHead
        eyebrow="PROFIL DOSEN"
        title={gelar}
        subtitle={`${data.prodi.nama} · NIDN ${data.nidn}`}
        right={
          <Button variant="ghost" size="sm" leftIcon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
            Edit Profil
          </Button>
        }
      />

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

      <Alert variant="info" title="Data identitas inti">
        NIDN, email, prodi, dan jabatan hanya bisa diubah oleh BAAK/SDM. Anda bisa update nama & gelar lewat <strong>Edit Profil</strong>.
      </Alert>

      <ChangePasswordCard />

      {editOpen && (
        <EditDosenProfilModal
          initial={{ nama: data.nama, gelarDepan: data.gelarDepan, gelarBelakang: data.gelarBelakang }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function EditDosenProfilModal({ initial, onClose }: { initial: DosenProfilUpdate; onClose: () => void }) {
  const update = useUpdateDosenProfil();
  const [form, setForm] = useState<DosenProfilUpdate>({
    nama: initial.nama ?? '',
    gelarDepan: initial.gelarDepan ?? '',
    gelarBelakang: initial.gelarBelakang ?? '',
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await update.mutateAsync({
        nama: form.nama,
        gelarDepan: form.gelarDepan || null,
        gelarBelakang: form.gelarBelakang || null,
      });
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan');
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Profil Dosen" width={520}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Input label="Nama lengkap (tanpa gelar)" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Gelar depan" value={form.gelarDepan ?? ''} onChange={(e) => setForm({ ...form, gelarDepan: (e.target as HTMLInputElement).value })} placeholder="Dr., Prof." />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Gelar belakang" value={form.gelarBelakang ?? ''} onChange={(e) => setForm({ ...form, gelarBelakang: (e.target as HTMLInputElement).value })} placeholder="M.Kom., S.T., M.T." />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" disabled={update.isPending}>{update.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
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
