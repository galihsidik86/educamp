import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Trash2, ArrowLeft, ClipboardEdit, CheckCircle2 } from 'lucide-react';
import type { TextareaHTMLAttributes } from 'react';
import {
  useRtmDetail, useRtmActions,
  type StatusRtm, type StatusKeputusan, type Keputusan,
} from '@/lib/queries-spmi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const KEP_LABEL: Record<StatusKeputusan, string> = {
  open: 'Open', in_progress: 'Dilaksanakan', done: 'Selesai', cancelled: 'Dibatalkan',
};

const KEP_COLOR: Record<StatusKeputusan, string> = {
  open: 'var(--muted-fg)', in_progress: 'var(--warning-fg)',
  done: 'var(--success-fg)', cancelled: 'var(--danger-fg)',
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

export function AkademikSpmiRtmDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useRtmDetail(id);
  const actions = useRtmActions();
  const [editNotulen, setEditNotulen] = useState<string | null>(null);
  const [addKeputusanOpen, setAddKeputusanOpen] = useState(false);
  const [editKeputusan, setEditKeputusan] = useState<Keputusan | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <Link to="/akademik/spmi/rtm" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ArrowLeft size={14} /> Kembali ke daftar RTM
      </Link>

      {isLoading && <p className="muted">Memuat…</p>}
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {data && (
        <>
          <PageHead
            eyebrow={`RTM · ${data.kode}`}
            title={data.judul}
            subtitle={`${formatTanggal(data.tanggal)} · ${data.status === 'selesai' ? 'Selesai' : 'Perencanaan'}`}
            right={
              <Select
                value={data.status}
                onChange={(e) => actions.update.mutate(
                  { id: data.id, body: { status: (e.target as HTMLSelectElement).value as StatusRtm } },
                  { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                )}
              >
                <option value="perencanaan">Perencanaan</option>
                <option value="selesai">Selesai</option>
              </Select>
            }
          />

          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agenda</div>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{data.agenda}</div>
          </Card>

          {data.peserta && (
            <Card>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Peserta</div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{data.peserta}</div>
            </Card>
          )}

          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <strong style={{ color: 'var(--text-strong)' }}>Notulen Rapat</strong>
              <Button variant="ghost" size="sm" leftIcon={<ClipboardEdit size={14} />} onClick={() => setEditNotulen(data.notulen ?? '')}>
                {data.notulen ? 'Edit' : 'Tambah'}
              </Button>
            </div>
            {data.notulen ? (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{data.notulen}</div>
            ) : <p className="muted">Notulen belum diisi.</p>}
          </Card>

          {/* Keputusan */}
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <strong style={{ color: 'var(--text-strong)' }}>Keputusan Rapat ({data.keputusan?.length ?? 0})</strong>
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddKeputusanOpen(true)}>
                Tambah Keputusan
              </Button>
            </div>
            {(!data.keputusan || data.keputusan.length === 0) && <p className="muted">Belum ada keputusan tercatat.</p>}
            {data.keputusan && data.keputusan.length > 0 && (
              <div className="stack">
                {data.keputusan.map((k, i) => {
                  const isOverdue = k.targetSelesai && new Date(k.targetSelesai) < new Date() && k.status !== 'done' && k.status !== 'cancelled';
                  return (
                    <div key={k.id} style={{ padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${KEP_COLOR[k.status]}` }}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                            <strong>{i + 1}.</strong>
                            <span style={{ color: KEP_COLOR[k.status], fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                              {KEP_LABEL[k.status]}
                            </span>
                            {k.targetSelesai && (
                              <span className="muted mono" style={{ fontSize: 'var(--text-xs)', color: isOverdue ? 'var(--danger-fg)' : undefined }}>
                                Target: {formatTanggal(k.targetSelesai)}{isOverdue ? ' · OVERDUE' : ''}
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: 4 }}>{k.deskripsi}</div>
                          {(k.picUser || k.picCatatan) && (
                            <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                              <strong>PIC:</strong> {k.picUser?.akademik?.nama ?? k.picUser?.email ?? k.picCatatan}
                            </div>
                          )}
                          {k.catatan && (
                            <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                              <strong>Catatan:</strong> {k.catatan}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          <Button variant="ghost" size="sm" leftIcon={<ClipboardEdit size={14} />} onClick={() => setEditKeputusan(k)}>Edit</Button>
                          {k.status !== 'done' && k.status !== 'cancelled' && (
                            <Button variant="ghost" size="sm" leftIcon={<CheckCircle2 size={14} />}
                              onClick={() => actions.updateKeputusan.mutate(
                                { keputusanId: k.id, body: { status: 'done' } },
                                { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                              )}
                            >Tandai Selesai</Button>
                          )}
                          <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />}
                            onClick={() => {
                              if (!confirm('Hapus keputusan ini?')) return;
                              actions.removeKeputusan.mutate(k.id, {
                                onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal'),
                              });
                            }}
                          >Hapus</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {data && (
        <>
          <NotulenModal
            rtmId={data.id}
            initial={editNotulen}
            onClose={() => setEditNotulen(null)}
            onErr={setActErr}
          />
          <KeputusanModal
            mode="add"
            rtmId={data.id}
            open={addKeputusanOpen}
            onClose={() => setAddKeputusanOpen(false)}
            onErr={setActErr}
          />
          <KeputusanModal
            mode="edit"
            rtmId={data.id}
            initial={editKeputusan}
            onClose={() => setEditKeputusan(null)}
            onErr={setActErr}
          />
        </>
      )}
    </div>
  );
}

function NotulenModal({ rtmId, initial, onClose, onErr }: { rtmId: string; initial: string | null; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useRtmActions();
  const [notulen, setNotulen] = useState(initial ?? '');

  if (initial === null) return null;
  return (
    <Modal open={true} onClose={onClose} title="Notulen RTM" width={680}>
      <div className="stack">
        <Textarea rows={10} value={notulen} onChange={(e) => setNotulen((e.target as HTMLTextAreaElement).value)} placeholder="Catatan jalannya rapat, dokumentasi diskusi, keputusan, dll." />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            onClick={() => actions.update.mutate(
              { id: rtmId, body: { notulen } },
              {
                onSuccess: onClose,
                onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
              },
            )}
          >
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function KeputusanModal({
  mode, rtmId, open, initial, onClose, onErr,
}: {
  mode: 'add' | 'edit';
  rtmId: string;
  open?: boolean;
  initial?: Keputusan | null;
  onClose: () => void;
  onErr: (s: string) => void;
}) {
  const actions = useRtmActions();
  const [body, setBody] = useState<Partial<Keputusan>>({});

  const isOpen = mode === 'add' ? !!open : !!initial;
  if (!isOpen) return null;

  const init = mode === 'edit' && initial ? { ...initial, ...body } : body;

  return (
    <Modal open={isOpen} onClose={() => { onClose(); setBody({}); }} title={mode === 'add' ? 'Tambah Keputusan' : 'Edit Keputusan'} width={560}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === 'add') {
            actions.addKeputusan.mutate(
              { rtmId, body },
              {
                onSuccess: () => { onClose(); setBody({}); },
                onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
              },
            );
          } else if (initial) {
            actions.updateKeputusan.mutate(
              { keputusanId: initial.id, body },
              {
                onSuccess: () => { onClose(); setBody({}); },
                onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
              },
            );
          }
        }}
      >
        <Textarea label="Deskripsi keputusan" rows={3} value={init.deskripsi ?? ''} onChange={(e) => setBody({ ...body, deskripsi: (e.target as HTMLTextAreaElement).value })} required />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="PIC (catatan free text)" value={init.picCatatan ?? ''} onChange={(e) => setBody({ ...body, picCatatan: (e.target as HTMLInputElement).value })} placeholder="Wakil Rektor I" />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Target selesai" type="date" value={(init.targetSelesai ?? '').slice(0, 10)} onChange={(e) => setBody({ ...body, targetSelesai: (e.target as HTMLInputElement).value || null })} />
          </div>
        </div>
        {mode === 'edit' && (
          <Select label="Status" value={init.status ?? 'open'} onChange={(e) => setBody({ ...body, status: (e.target as HTMLSelectElement).value as StatusKeputusan })}>
            <option value="open">Open</option>
            <option value="in_progress">Dilaksanakan</option>
            <option value="done">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </Select>
        )}
        <Textarea label="Catatan" rows={2} value={init.catatan ?? ''} onChange={(e) => setBody({ ...body, catatan: (e.target as HTMLTextAreaElement).value })} />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={() => { onClose(); setBody({}); }}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
