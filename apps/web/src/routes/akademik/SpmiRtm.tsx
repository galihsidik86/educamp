import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Plus, TrendingUp, Trash2, Calendar, ListChecks } from 'lucide-react';
import type { TextareaHTMLAttributes } from 'react';
import {
  useRtmList, useRtmActions,
  type Rtm, type StatusRtm,
} from '@/lib/queries-spmi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

const STATUS_LABEL: Record<StatusRtm, string> = {
  perencanaan: 'Perencanaan',
  selesai: 'Selesai',
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

export function AkademikSpmiRtm() {
  const [status, setStatus] = useState<StatusRtm | ''>('');
  const { data, isLoading, error } = useRtmList({ status: status || undefined });
  const actions = useRtmActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="PENINGKATAN"
        title="Rapat Tinjauan Manajemen (RTM)"
        subtitle="Forum tinjauan strategis manajemen atas capaian standar mutu, AMI, dan keputusan tindak lanjut."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Jadwalkan RTM
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusRtm | '')}>
            <option value="">Semua</option>
            <option value="perencanaan">Perencanaan</option>
            <option value="selesai">Selesai</option>
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(208,166,86,0.10)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <TrendingUp size={28} />
            </div>
            <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>Belum ada RTM dijadwalkan</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center', maxWidth: 380 }}>
              Forum tinjauan strategis manajemen untuk meningkatkan kinerja mutu. Jadwalkan rapat pertama Anda.
            </p>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)} style={{ marginTop: 'var(--space-2)' }}>
              Jadwalkan RTM
            </Button>
          </div>
        </Card>
      )}
      {data && data.items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-3)' }}>
          {data.items.map((r) => (
            <Card key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="mono muted" style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}>{r.kode}</div>
                  <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 2 }}>{r.judul}</strong>
                </div>
                <Badge variant={r.status === 'selesai' ? 'success' : 'neutral'} dot>{STATUS_LABEL[r.status]}</Badge>
              </div>
              <div className="row muted" style={{ gap: 6, fontSize: 'var(--text-sm)' }}>
                <Calendar size={14} />{formatTanggal(r.tanggal)}
              </div>
              <div className="row" style={{ gap: 6, padding: 'var(--space-2)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
                <ListChecks size={14} className="muted" />
                <span className="muted">Keputusan:</span>
                <strong className="mono" style={{ color: 'var(--text-strong)' }}>{r._count?.keputusan ?? 0}</strong>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 'auto', paddingTop: 'var(--space-1)' }}>
                <Link to={`/akademik/spmi/rtm/${r.id}`} style={{ flex: 1 }}>
                  <Button variant="primary" size="sm" leftIcon={<TrendingUp size={14} />} style={{ width: '100%' }}>Buka Detail</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => {
                    if (!confirm(`Hapus RTM ${r.kode}?`)) return;
                    actions.remove.mutate(r.id, {
                      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
                    });
                  }}
                >
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateRtmModal open={createOpen} onClose={() => setCreateOpen(false)} onErr={setActErr} />
    </div>
  );
}

function CreateRtmModal({ open, onClose, onErr }: { open: boolean; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useRtmActions();
  const [body, setBody] = useState<Partial<Rtm>>({});

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Jadwalkan RTM" width={560}>
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
        <Input label="Kode" value={body.kode ?? ''} onChange={(e) => setBody({ ...body, kode: (e.target as HTMLInputElement).value })} required placeholder="RTM-2026-01" />
        <Input label="Judul" value={body.judul ?? ''} onChange={(e) => setBody({ ...body, judul: (e.target as HTMLInputElement).value })} required placeholder="RTM Semester Ganjil 2025/2026" />
        <Input label="Tanggal" type="date" value={body.tanggal?.slice(0, 10) ?? ''} onChange={(e) => setBody({ ...body, tanggal: (e.target as HTMLInputElement).value })} required />
        <Textarea label="Agenda" rows={4} value={body.agenda ?? ''} onChange={(e) => setBody({ ...body, agenda: (e.target as HTMLTextAreaElement).value })} required placeholder="1. Tinjauan capaian standar mutu&#10;2. Tindak lanjut temuan AMI&#10;3. ..." />
        <Textarea label="Peserta (opsional)" rows={2} value={body.peserta ?? ''} onChange={(e) => setBody({ ...body, peserta: (e.target as HTMLTextAreaElement).value })} placeholder="Rektor, Wakil Rektor I, Dekan, Kaprodi" />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
