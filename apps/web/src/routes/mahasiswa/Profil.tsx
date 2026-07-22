import { useState } from 'react';
import { Card, Alert, Button, Input } from '@/ds';
import { useNavigate } from 'react-router-dom';
import { IdCard, Pencil } from 'lucide-react';
import { useProfil, useUpdateProfil, type ProfilUpdate } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { PageLoadingSkeleton } from '@/components/Skeleton';

export function MahasiswaProfil() {
  const { data, isLoading, error } = useProfil();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <PageLoadingSkeleton />;
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
            <Button variant="ghost" size="sm" leftIcon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
              Edit Profil
            </Button>
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

      <Alert variant="info" title="Data identitas inti">
        NIM, nama, jenis kelamin, prodi, dan status hanya bisa diubah oleh BAAK. Kontak (alamat, telepon, tempat/tgl lahir) bisa Anda perbarui sendiri lewat <strong>Edit Profil</strong>.
      </Alert>

      <ChangePasswordCard />

      {editOpen && (
        <EditProfilModal
          initial={{
            tempatLahir: data.tempatLahir,
            tanggalLahir: data.tanggalLahir,
            alamat: data.alamat,
            telepon: data.telepon,
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function EditProfilModal({ initial, onClose }: { initial: ProfilUpdate; onClose: () => void }) {
  const update = useUpdateProfil();
  const [form, setForm] = useState<ProfilUpdate>({
    tempatLahir: initial.tempatLahir ?? '',
    tanggalLahir: initial.tanggalLahir ? String(initial.tanggalLahir).slice(0, 10) : '',
    alamat: initial.alamat ?? '',
    telepon: initial.telepon ?? '',
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await update.mutateAsync({
        tempatLahir: form.tempatLahir || null,
        tanggalLahir: form.tanggalLahir || null,
        alamat: form.alamat || null,
        telepon: form.telepon || null,
      });
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan');
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Profil" width={520}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Tempat lahir" value={form.tempatLahir ?? ''} onChange={(e) => setForm({ ...form, tempatLahir: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tanggal lahir" type="date" value={form.tanggalLahir ?? ''} onChange={(e) => setForm({ ...form, tanggalLahir: (e.target as HTMLInputElement).value })} />
          </div>
        </div>
        <Input label="Telepon" value={form.telepon ?? ''} onChange={(e) => setForm({ ...form, telepon: (e.target as HTMLInputElement).value })} placeholder="081234567890" />
        <Input label="Alamat" value={form.alamat ?? ''} onChange={(e) => setForm({ ...form, alamat: (e.target as HTMLInputElement).value })} />
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
    <div className="row" style={{ padding: 'var(--space-2) 0', borderBottom: '1px dashed var(--border-subtle)', alignItems: 'flex-start' }}>
      <div className="muted" style={{ minWidth: 220, fontSize: 'var(--text-sm)' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
