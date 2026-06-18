import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import {
  Plus, Trash2, UserPlus, Building2, FileWarning,
  Wrench, CheckCircle2, ArrowLeft, ClipboardCheck, Send,
} from 'lucide-react';
import type { TextareaHTMLAttributes } from 'react';
import {
  useAmiDetail, useAmiActions,
  type StatusAmi, type KategoriTemuan, type StatusCapa,
  type Temuan, type Capa,
} from '@/lib/queries-spmi';
import { useAdminDosen, useProdi } from '@/lib/queries-akademik';
import { useStandarMutu } from '@/lib/queries-spmi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_LABEL: Record<StatusAmi, string> = {
  perencanaan: 'Perencanaan', pelaksanaan: 'Pelaksanaan', selesai: 'Selesai', ditangguhkan: 'Ditangguhkan',
};

const TEMUAN_LABEL: Record<KategoriTemuan, string> = {
  ktsm: 'KTS Major', kts: 'KTS Minor', observasi: 'Observasi', saran: 'Saran',
};

const TEMUAN_COLOR: Record<KategoriTemuan, string> = {
  ktsm: 'var(--danger-fg)', kts: 'var(--warning-fg)', observasi: 'var(--muted-fg)', saran: 'var(--accent)',
};

const CAPA_LABEL: Record<StatusCapa, string> = {
  rencana: 'Rencana', pelaksanaan: 'Pelaksanaan', verifikasi: 'Verifikasi', closed: 'Closed', ditolak: 'Ditolak',
};

const CAPA_COLOR: Record<StatusCapa, string> = {
  rencana: 'var(--muted-fg)', pelaksanaan: 'var(--warning-fg)',
  verifikasi: 'var(--accent)', closed: 'var(--success-fg)', ditolak: 'var(--danger-fg)',
};

function Textarea({ label, ...rest }: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</label>}
      <textarea
        {...rest}
        className="tz-input"
        style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', ...(rest.style ?? {}) }}
      />
    </div>
  );
}

export function AkademikSpmiAmiDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useAmiDetail(id);
  const actions = useAmiActions();
  const [addAuditorOpen, setAddAuditorOpen] = useState(false);
  const [addLingkupOpen, setAddLingkupOpen] = useState(false);
  const [addTemuanOpen, setAddTemuanOpen] = useState(false);
  const [capaFor, setCapaFor] = useState<Temuan | null>(null);
  const [editCapa, setEditCapa] = useState<Capa | null>(null);
  const [verifFor, setVerifFor] = useState<Capa | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <Link to="/akademik/spmi/ami" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ArrowLeft size={14} /> Kembali ke daftar AMI
      </Link>

      {isLoading && <p className="muted">Memuat…</p>}
      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {data && (
        <>
          <PageHead
            eyebrow={`AMI · ${data.kode}`}
            title={data.nama}
            subtitle={`Periode ${data.periode} · ${STATUS_LABEL[data.status]}`}
            right={
              <Select
                value={data.status}
                onChange={(e) => actions.update.mutate(
                  { id: data.id, body: { status: (e.target as HTMLSelectElement).value as StatusAmi } },
                  { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                )}
              >
                <option value="perencanaan">Perencanaan</option>
                <option value="pelaksanaan">Pelaksanaan</option>
                <option value="selesai">Selesai</option>
                <option value="ditangguhkan">Ditangguhkan</option>
              </Select>
            }
          />

          {data.ruangLingkup && (
            <Card>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ruang lingkup</div>
              <div>{data.ruangLingkup}</div>
            </Card>
          )}

          {/* Pelaporan SPME (Permenristekdikti 39/2025) */}
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Pelaporan ke SPME (BAN-PT / LAM)
                </div>
                <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', marginTop: 4 }}>
                  {data.dilaporkanKeSpme ? (
                    <Badge variant="success" dot>Sudah dilaporkan{data.dilaporkanKeSpmePada ? ` · ${formatTanggal(data.dilaporkanKeSpmePada)}` : ''}</Badge>
                  ) : (
                    <Badge variant="neutral" dot>Belum dilaporkan</Badge>
                  )}
                </div>
                {data.dampakAkreditasi && (
                  <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <strong>Dampak akreditasi:</strong> {data.dampakAkreditasi}
                  </div>
                )}
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                  Permenristekdikti 39/2025: audit mutu harus transparan dan hasilnya berpengaruh langsung pada akreditasi serta pemeringkatan.
                </div>
              </div>
              <Button
                variant={data.dilaporkanKeSpme ? 'ghost' : 'primary'}
                size="sm"
                leftIcon={<Send size={14} />}
                onClick={() => {
                  if (data.dilaporkanKeSpme) {
                    if (!confirm('Batalkan status dilaporkan ke SPME?')) return;
                    actions.update.mutate(
                      { id: data.id, body: { dilaporkanKeSpme: false, dilaporkanKeSpmePada: null } },
                      { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                    );
                  } else {
                    const dampak = prompt('Catatan dampak ke akreditasi/pemeringkatan (opsional):') ?? '';
                    actions.update.mutate(
                      { id: data.id, body: { dilaporkanKeSpme: true, dilaporkanKeSpmePada: new Date().toISOString(), dampakAkreditasi: dampak || undefined } },
                      { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                    );
                  }
                }}
              >
                {data.dilaporkanKeSpme ? 'Batalkan' : 'Tandai Dilaporkan'}
              </Button>
            </div>
          </Card>

          {/* Auditor */}
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <strong style={{ color: 'var(--text-strong)' }}>Tim Auditor ({data.auditor?.length ?? 0})</strong>
              <Button variant="ghost" size="sm" leftIcon={<UserPlus size={14} />} onClick={() => setAddAuditorOpen(true)}>Tambah Auditor</Button>
            </div>
            {(!data.auditor || data.auditor.length === 0) && <p className="muted">Belum ada auditor.</p>}
            {data.auditor && data.auditor.length > 0 && (
              <table className="tz-table">
                <thead>
                  <tr><th>NIDN</th><th>Nama</th><th>Peran</th><th></th></tr>
                </thead>
                <tbody>
                  {data.auditor.map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{a.dosen.nidn}</td>
                      <td>{[a.dosen.gelarDepan, a.dosen.nama, a.dosen.gelarBelakang].filter(Boolean).join(' ')}</td>
                      <td><span className="pill" style={{ background: 'var(--surface-sunken)' }}>{a.peran}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />}
                          onClick={() => actions.removeAuditor.mutate(
                            { amiId: data.id, auditorId: a.id },
                            { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                          )}
                        >Hapus</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Lingkup Prodi */}
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <strong style={{ color: 'var(--text-strong)' }}>Lingkup Prodi ({data.lingkup?.length ?? 0})</strong>
              <Button variant="ghost" size="sm" leftIcon={<Building2 size={14} />} onClick={() => setAddLingkupOpen(true)}>Tambah Prodi</Button>
            </div>
            {(!data.lingkup || data.lingkup.length === 0) && <p className="muted">Belum ada prodi yang masuk lingkup.</p>}
            {data.lingkup && data.lingkup.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {data.lingkup.map((l) => (
                  <span key={l.id} className="pill row" style={{ gap: 'var(--space-1)', alignItems: 'center', background: 'var(--surface-sunken)' }}>
                    {l.prodi.nama} ({l.prodi.kode})
                    <button
                      onClick={() => actions.removeLingkup.mutate(
                        { amiId: data.id, lingkupId: l.id },
                        { onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal') },
                      )}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger-fg)', padding: 0 }}
                      aria-label="Hapus"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Temuan */}
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <strong style={{ color: 'var(--text-strong)' }}>Temuan Audit ({data.temuan?.length ?? 0})</strong>
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddTemuanOpen(true)}>Tambah Temuan</Button>
            </div>
            {(!data.temuan || data.temuan.length === 0) && <p className="muted">Belum ada temuan.</p>}
            {data.temuan && data.temuan.length > 0 && (
              <div className="stack">
                {data.temuan.map((t) => (
                  <div key={t.id} style={{ padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${TEMUAN_COLOR[t.kategori]}` }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                          <span className="mono" style={{ fontWeight: 700 }}>{t.kode}</span>
                          <span className="pill" style={{ background: TEMUAN_COLOR[t.kategori], color: '#fff' }}>{TEMUAN_LABEL[t.kategori]}</span>
                          {t.standar && <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>Standar: {t.standar.kode}</span>}
                        </div>
                        <div style={{ marginTop: 4 }}>{t.deskripsi}</div>
                        {t.rekomendasi && (
                          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                            <strong>Rekomendasi:</strong> {t.rekomendasi}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        {!t.capa && (
                          <Button variant="primary" size="sm" leftIcon={<Wrench size={14} />} onClick={() => setCapaFor(t)}>
                            Buat CAPA
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />}
                          onClick={() => {
                            if (!confirm(`Hapus temuan ${t.kode}?`)) return;
                            actions.removeTemuan.mutate(t.id, {
                              onError: (er: any) => setActErr(er instanceof ApiError ? er.message : 'Gagal'),
                            });
                          }}
                        >Hapus</Button>
                      </div>
                    </div>
                    {t.capa && (
                      <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                            <Wrench size={14} className="muted" />
                            <strong style={{ fontSize: 'var(--text-sm)' }}>Tindak Lanjut (CAPA)</strong>
                            <span style={{ color: CAPA_COLOR[t.capa.status], fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                              {CAPA_LABEL[t.capa.status]}
                            </span>
                            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                              Target: {formatTanggal(t.capa.targetSelesai)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            <Button variant="ghost" size="sm" onClick={() => setEditCapa(t.capa!)}>Edit</Button>
                            {t.capa.status === 'verifikasi' && (
                              <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />} onClick={() => setVerifFor(t.capa!)}>
                                Verifikasi
                              </Button>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 'var(--text-sm)' }}><strong>Rencana:</strong> {t.capa.rencanaTindakan}</div>
                        {t.capa.realisasiTindakan && (
                          <div style={{ marginTop: 4, fontSize: 'var(--text-sm)' }}><strong>Realisasi:</strong> {t.capa.realisasiTindakan}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {data && (
        <>
          <AddAuditorModal open={addAuditorOpen} onClose={() => setAddAuditorOpen(false)} amiId={data.id} onErr={setActErr} />
          <AddLingkupModal open={addLingkupOpen} onClose={() => setAddLingkupOpen(false)} amiId={data.id} onErr={setActErr} />
          <AddTemuanModal open={addTemuanOpen} onClose={() => setAddTemuanOpen(false)} amiId={data.id} onErr={setActErr} />
          <CapaFormModal temuan={capaFor} onClose={() => setCapaFor(null)} onErr={setActErr} />
          <EditCapaModal capa={editCapa} onClose={() => setEditCapa(null)} onErr={setActErr} />
          <VerifCapaModal capa={verifFor} onClose={() => setVerifFor(null)} onErr={setActErr} />
        </>
      )}
    </div>
  );
}

function AddAuditorModal({ open, onClose, amiId, onErr }: { open: boolean; onClose: () => void; amiId: string; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const dosen = useAdminDosen();
  const [dosenId, setDosenId] = useState('');
  const [peran, setPeran] = useState('auditor');

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Tambah Auditor" width={500}>
      <div className="stack">
        <Select label="Dosen" value={dosenId} onChange={(e) => setDosenId((e.target as HTMLSelectElement).value)}>
          <option value="">Pilih dosen…</option>
          {dosen.data?.items.map((d) => (
            <option key={d.id} value={d.id}>{d.nidn} — {d.nama}</option>
          ))}
        </Select>
        <Select label="Peran" value={peran} onChange={(e) => setPeran((e.target as HTMLSelectElement).value)}>
          <option value="ketua">Ketua Auditor</option>
          <option value="auditor">Auditor</option>
        </Select>
        <Button
          variant="primary"
          disabled={!dosenId}
          onClick={() => actions.addAuditor.mutate(
            { amiId, dosenId, peran },
            {
              onSuccess: () => { onClose(); setDosenId(''); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          )}
        >
          Tambah
        </Button>
      </div>
    </Modal>
  );
}

function AddLingkupModal({ open, onClose, amiId, onErr }: { open: boolean; onClose: () => void; amiId: string; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const prodi = useProdi();
  const [prodiId, setProdiId] = useState('');

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Tambah Prodi ke Lingkup" width={500}>
      <div className="stack">
        <Select label="Prodi" value={prodiId} onChange={(e) => setProdiId((e.target as HTMLSelectElement).value)}>
          <option value="">Pilih prodi…</option>
          {prodi.data?.items.map((p) => (
            <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>
          ))}
        </Select>
        <Button
          variant="primary"
          disabled={!prodiId}
          onClick={() => actions.addLingkup.mutate(
            { amiId, prodiId },
            {
              onSuccess: () => { onClose(); setProdiId(''); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          )}
        >
          Tambah
        </Button>
      </div>
    </Modal>
  );
}

function AddTemuanModal({ open, onClose, amiId, onErr }: { open: boolean; onClose: () => void; amiId: string; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const standar = useStandarMutu({ aktif: 'true' });
  const [body, setBody] = useState<Partial<Temuan>>({ kategori: 'kts' });

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Tambah Temuan Audit" width={600}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.addTemuan.mutate(
            { amiId, body },
            {
              onSuccess: () => { onClose(); setBody({ kategori: 'kts' }); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          );
        }}
      >
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Kode temuan" value={body.kode ?? ''} onChange={(e) => setBody({ ...body, kode: (e.target as HTMLInputElement).value })} placeholder="TMN-2026-01-001" required />
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Kategori" value={body.kategori ?? 'kts'} onChange={(e) => setBody({ ...body, kategori: (e.target as HTMLSelectElement).value as KategoriTemuan })}>
              <option value="ktsm">KTS Major</option>
              <option value="kts">KTS Minor</option>
              <option value="observasi">Observasi</option>
              <option value="saran">Saran</option>
            </Select>
          </div>
        </div>
        <Select label="Standar (opsional)" value={body.standarId ?? ''} onChange={(e) => setBody({ ...body, standarId: (e.target as HTMLSelectElement).value || null })}>
          <option value="">— Tidak terkait standar —</option>
          {standar.data?.items.map((s) => (
            <option key={s.id} value={s.id}>{s.kode} — {s.nama}</option>
          ))}
        </Select>
        <Textarea label="Deskripsi temuan" rows={3} value={body.deskripsi ?? ''} onChange={(e) => setBody({ ...body, deskripsi: (e.target as HTMLTextAreaElement).value })} required />
        <Textarea label="Rekomendasi" rows={2} value={body.rekomendasi ?? ''} onChange={(e) => setBody({ ...body, rekomendasi: (e.target as HTMLTextAreaElement).value })} />
        <Input label="URL bukti (opsional)" value={body.buktiUrl ?? ''} onChange={(e) => setBody({ ...body, buktiUrl: (e.target as HTMLInputElement).value })} />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function CapaFormModal({ temuan, onClose, onErr }: { temuan: Temuan | null; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const dosen = useAdminDosen();
  const [body, setBody] = useState<Partial<Capa>>({});

  if (!temuan) return null;
  return (
    <Modal open={!!temuan} onClose={onClose} title={`Buat CAPA — ${temuan.kode}`} width={600}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.createCapa.mutate(
            { temuanId: temuan.id, body },
            {
              onSuccess: () => { onClose(); setBody({}); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          );
        }}
      >
        <Textarea label="Akar masalah" rows={2} value={body.akarMasalah ?? ''} onChange={(e) => setBody({ ...body, akarMasalah: (e.target as HTMLTextAreaElement).value })} />
        <Textarea label="Rencana tindakan" rows={3} value={body.rencanaTindakan ?? ''} onChange={(e) => setBody({ ...body, rencanaTindakan: (e.target as HTMLTextAreaElement).value })} required />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="PIC Dosen (opsional)" value={body.picDosenId ?? ''} onChange={(e) => setBody({ ...body, picDosenId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— Tidak ditugaskan —</option>
              {dosen.data?.items.map((d) => (
                <option key={d.id} value={d.id}>{d.nidn} — {d.nama}</option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Target selesai" type="date" value={body.targetSelesai?.slice(0, 10) ?? ''} onChange={(e) => setBody({ ...body, targetSelesai: (e.target as HTMLInputElement).value })} required />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan CAPA</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditCapaModal({ capa, onClose, onErr }: { capa: Capa | null; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const [body, setBody] = useState<Partial<Capa>>({});

  if (!capa) return null;
  const init = body.status ? body : { ...capa, ...body };
  return (
    <Modal open={!!capa} onClose={onClose} title={`Update CAPA — ${CAPA_LABEL[capa.status]}`} width={600}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.updateCapa.mutate(
            { capaId: capa.id, body },
            {
              onSuccess: () => { onClose(); setBody({}); },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
            },
          );
        }}
      >
        <Select label="Status" value={init.status ?? capa.status} onChange={(e) => setBody({ ...body, status: (e.target as HTMLSelectElement).value as StatusCapa })}>
          <option value="rencana">Rencana</option>
          <option value="pelaksanaan">Pelaksanaan</option>
          <option value="verifikasi">Siap diverifikasi</option>
          <option value="ditolak">Ditolak</option>
        </Select>
        <Textarea label="Akar masalah" rows={2} value={init.akarMasalah ?? ''} onChange={(e) => setBody({ ...body, akarMasalah: (e.target as HTMLTextAreaElement).value })} />
        <Textarea label="Rencana tindakan" rows={2} value={init.rencanaTindakan ?? ''} onChange={(e) => setBody({ ...body, rencanaTindakan: (e.target as HTMLTextAreaElement).value })} />
        <Textarea label="Realisasi tindakan" rows={3} value={init.realisasiTindakan ?? ''} onChange={(e) => setBody({ ...body, realisasiTindakan: (e.target as HTMLTextAreaElement).value })} />
        <Input label="URL bukti realisasi" value={init.bukti ?? ''} onChange={(e) => setBody({ ...body, bukti: (e.target as HTMLInputElement).value })} placeholder="Tautan dokumen/foto bukti" />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Target selesai" type="date" value={(init.targetSelesai ?? '').slice(0, 10)} onChange={(e) => setBody({ ...body, targetSelesai: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tanggal selesai" type="date" value={(init.tanggalSelesai ?? '').slice(0, 10)} onChange={(e) => setBody({ ...body, tanggalSelesai: (e.target as HTMLInputElement).value || null })} />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function VerifCapaModal({ capa, onClose, onErr }: { capa: Capa | null; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useAmiActions();
  const [catatan, setCatatan] = useState('');

  if (!capa) return null;
  return (
    <Modal open={!!capa} onClose={onClose} title="Verifikasi CAPA" width={500}>
      <div className="stack">
        <Alert variant="info">
          Setujui jika bukti realisasi sudah mencerminkan implementasi rencana tindakan. Jika ditolak, CAPA akan kembali ke status <strong>pelaksanaan</strong>.
        </Alert>
        <Textarea label="Catatan verifikasi" rows={3} value={catatan} onChange={(e) => setCatatan((e.target as HTMLTextAreaElement).value)} />
        <div className="row" style={{ gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            onClick={() => actions.verifikasiCapa.mutate(
              { capaId: capa.id, setuju: false, catatan },
              {
                onSuccess: () => { onClose(); setCatatan(''); },
                onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
              },
            )}
          >
            Tolak
          </Button>
          <Button
            variant="primary"
            leftIcon={<CheckCircle2 size={14} />}
            onClick={() => actions.verifikasiCapa.mutate(
              { capaId: capa.id, setuju: true, catatan },
              {
                onSuccess: () => { onClose(); setCatatan(''); },
                onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
              },
            )}
          >
            Setujui & Closed
          </Button>
        </div>
      </div>
    </Modal>
  );
}
