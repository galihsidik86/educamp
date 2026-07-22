import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Plus, ClipboardCheck, Trash2, Users, Building2, FileWarning } from 'lucide-react';
import type { TextareaHTMLAttributes } from 'react';
import {
  useAmiList, useAmiActions,
  type Ami, type StatusAmi,
} from '@/lib/queries-spmi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { DataPair } from '@/components/DataPair';
import { Skeleton } from '@/components/Skeleton';

const STATUS_LABEL: Record<StatusAmi, string> = {
  perencanaan: 'Perencanaan',
  pelaksanaan: 'Pelaksanaan',
  selesai: 'Selesai',
  ditangguhkan: 'Ditangguhkan',
};

const STATUS_VARIANT: Record<StatusAmi, 'neutral' | 'warning' | 'success' | 'danger'> = {
  perencanaan: 'neutral',
  pelaksanaan: 'warning',
  selesai: 'success',
  ditangguhkan: 'danger',
};

function Textarea({ label, ...rest }: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>{label}</label>}
      <textarea
        {...rest}
        className="tz-input"
        style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', ...(rest.style ?? {}) }}
      />
    </div>
  );
}

export function AkademikSpmiAmi() {
  const [status, setStatus] = useState<StatusAmi | ''>('');
  const { data, isLoading, error } = useAmiList({ status: status || undefined });
  const actions = useAmiActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="EVALUASI"
        title="Audit Mutu Internal (AMI)"
        subtitle="Siklus audit periodik atas implementasi standar mutu. Tetapkan auditor, lingkup prodi, dan catat temuan."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Buat AMI
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusAmi | '')}>
            <option value="">Semua</option>
            <option value="perencanaan">Perencanaan</option>
            <option value="pelaksanaan">Pelaksanaan</option>
            <option value="selesai">Selesai</option>
            <option value="ditangguhkan">Ditangguhkan</option>
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={<ClipboardCheck size={28} />}
          title="Belum ada AMI"
          desc="Jadwalkan audit mutu internal untuk mengevaluasi pelaksanaan standar."
          cta={{ label: 'Buat AMI', onClick: () => setCreateOpen(true) }}
        />
      )}
      {data && data.items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-3)' }}>
          {data.items.map((a) => (
            <AmiCard
              key={a.id}
              ami={a}
              onDelete={() => {
                if (!confirm(`Hapus AMI ${a.kode}? Termasuk semua temuan & CAPA.`)) return;
                actions.remove.mutate(a.id, {
                  onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
                });
              }}
            />
          ))}
        </div>
      )}

      <CreateAmiModal open={createOpen} onClose={() => setCreateOpen(false)} onErr={setActErr} />
    </div>
  );
}

function AmiCard({ ami, onDelete }: { ami: Ami; onDelete: () => void }) {
  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="mono muted" style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}>{ami.kode}</div>
          <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 2 }}>{ami.nama}</strong>
        </div>
        <Badge variant={STATUS_VARIANT[ami.status]} dot>{STATUS_LABEL[ami.status]}</Badge>
      </div>

      <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        Periode {ami.periode} · {formatTanggal(ami.tanggalMulai)}
        {ami.tanggalSelesai && <> – {formatTanggal(ami.tanggalSelesai)}</>}
      </div>

      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap', padding: 'var(--space-2)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
        <DataPair icon={<Users size={14} />} label="Auditor" value={ami.auditor?.length ?? 0} />
        <DataPair icon={<Building2 size={14} />} label="Lingkup" value={ami.lingkup?.length ?? 0} />
        <DataPair icon={<FileWarning size={14} />} label="Temuan" value={ami._count?.temuan ?? 0} tone={(ami._count?.temuan ?? 0) > 0 ? "accent" : "default"} />
      </div>

      <div className="row" style={{ gap: 6, marginTop: 'auto', paddingTop: 'var(--space-1)' }}>
        <Link to={`/akademik/spmi/ami/${ami.id}`} style={{ flex: 1 }}>
          <Button variant="primary" size="sm" leftIcon={<ClipboardCheck size={14} />} style={{ width: '100%' }}>Buka Detail</Button>
        </Link>
        <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={onDelete}>Hapus</Button>
      </div>
    </Card>
  );
}


function EmptyState({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(208,166,86,0.10)', color: 'var(--accent)',
          display: 'grid', placeItems: 'center',
        }}>
          {icon}
        </div>
        <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>{title}</strong>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center', maxWidth: 380 }}>{desc}</p>
        {cta && (
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={cta.onClick} style={{ marginTop: 'var(--space-2)' }}>
            {cta.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

function CreateAmiModal({ open, onClose, onErr }: { open: boolean; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const [body, setBody] = useState<Partial<Ami>>({});

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Buat AMI" width={560}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.create.mutate(body, {
            onSuccess: () => { onClose(); setBody({}); },
            onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
          });
        }}
      >
        <Input label="Kode" value={body.kode ?? ''} onChange={(e) => setBody({ ...body, kode: (e.target as HTMLInputElement).value })} required placeholder="AMI-2026-01" />
        <Input label="Nama" value={body.nama ?? ''} onChange={(e) => setBody({ ...body, nama: (e.target as HTMLInputElement).value })} required placeholder="AMI Semester Ganjil 2025/2026" />
        <Input label="Periode" value={body.periode ?? ''} onChange={(e) => setBody({ ...body, periode: (e.target as HTMLInputElement).value })} required placeholder="2025/2026 Ganjil" />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Tanggal mulai" type="date" value={body.tanggalMulai?.slice(0, 10) ?? ''} onChange={(e) => setBody({ ...body, tanggalMulai: (e.target as HTMLInputElement).value })} required />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tanggal selesai" type="date" value={body.tanggalSelesai?.slice(0, 10) ?? ''} onChange={(e) => setBody({ ...body, tanggalSelesai: (e.target as HTMLInputElement).value || null })} />
          </div>
        </div>
        <Textarea label="Ruang lingkup" rows={3} value={body.ruangLingkup ?? ''} onChange={(e) => setBody({ ...body, ruangLingkup: (e.target as HTMLTextAreaElement).value })} placeholder="Audit standar pendidikan untuk semua prodi S1…" />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
