import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import type { TextareaHTMLAttributes } from 'react';

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
import { Plus, Copy, Trash2, BarChart3, MessageSquare } from 'lucide-react';
import { Badge } from '@/ds';
import {
  useSurveiList, useSurveiActions, useSurveiDetail, useSurveiHasil,
  type Survei, type KategoriSurvei, type StatusSurvei, type JenisPertanyaan,
} from '@/lib/queries-spmi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';

const KATEGORI: Array<{ v: KategoriSurvei; label: string }> = [
  { v: 'layanan_akademik', label: 'Layanan Akademik' },
  { v: 'layanan_keuangan', label: 'Layanan Keuangan' },
  { v: 'layanan_sarpras', label: 'Sarana Prasarana' },
  { v: 'layanan_perpustakaan', label: 'Perpustakaan' },
  { v: 'layanan_kemahasiswaan', label: 'Kemahasiswaan' },
  { v: 'dosen_pembimbing', label: 'Dosen Pembimbing' },
  { v: 'lulusan', label: 'Lulusan/Alumni' },
  { v: 'pengguna_lulusan', label: 'Pengguna Lulusan' },
  { v: 'lain', label: 'Lain' },
];

export function AkademikSpmiSurvei() {
  const [status, setStatus] = useState<StatusSurvei | ''>('');
  const { data, isLoading, error } = useSurveiList({ status: status || undefined });
  const actions = useSurveiActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [hasilFor, setHasilFor] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="SURVEI KEPUASAN"
        title="Kelola Survei"
        subtitle="Survei kepuasan stakeholder — anonim & dapat dibagikan via tautan publik / QR."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Buat Survei
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusSurvei | '')}>
            <option value="">Semua</option>
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
            <option value="ditutup">Ditutup</option>
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(208,166,86,0.10)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <MessageSquare size={28} />
            </div>
            <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>Belum ada survei kepuasan</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center', maxWidth: 380 }}>
              Buat survei untuk mengukur kepuasan stakeholder (mahasiswa, dosen, alumni, pengguna lulusan).
            </p>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)} style={{ marginTop: 'var(--space-2)' }}>
              Buat Survei
            </Button>
          </div>
        </Card>
      )}
      {data && data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Status</th>
                <th className="num">Pertanyaan</th>
                <th className="num">Response</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td className="mono"><strong>{s.kode}</strong></td>
                  <td>{s.judul}</td>
                  <td>{KATEGORI.find((k) => k.v === s.kategori)?.label ?? s.kategori}</td>
                  <td>
                    <Badge variant={s.status === 'publish' ? 'success' : s.status === 'ditutup' ? 'danger' : 'neutral'} dot>
                      {s.status === 'publish' ? 'Publish' : s.status === 'ditutup' ? 'Ditutup' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="num mono">{s._count?.pertanyaan ?? 0}</td>
                  <td className="num mono">{s._count?.response ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" leftIcon={<Copy size={14} />} onClick={() => copyLink(s.tokenPublic)}>Salin Link</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDetailFor(s.id)}>Pertanyaan</Button>
                    <Button variant="ghost" size="sm" leftIcon={<BarChart3 size={14} />} onClick={() => setHasilFor(s.id)}>Hasil</Button>
                    {s.status === 'draft' && (
                      <Button variant="primary" size="sm" onClick={() => actions.update.mutate({ id: s.id, body: { status: 'publish' } }, {
                        onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal publish'),
                      })}>Publish</Button>
                    )}
                    {s.status === 'publish' && (
                      <Button variant="ghost" size="sm" onClick={() => actions.update.mutate({ id: s.id, body: { status: 'ditutup' } }, {
                        onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
                      })}>Tutup</Button>
                    )}
                    {s.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={14} />}
                        onClick={() => {
                          if (!confirm(`Hapus survei ${s.kode}?`)) return;
                          actions.remove.mutate(s.id, {
                            onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
                          });
                        }}
                      >
                        Hapus
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateSurveiModal open={createOpen} onClose={() => setCreateOpen(false)} onErr={setActErr} />
      <PertanyaanModal surveiId={detailFor} onClose={() => setDetailFor(null)} onErr={setActErr} />
      <HasilModal surveiId={hasilFor} onClose={() => setHasilFor(null)} />
    </div>
  );
}

function copyLink(token: string) {
  const url = `${window.location.origin}/survei/${token}`;
  navigator.clipboard.writeText(url);
  alert(`Tautan publik disalin:\n${url}`);
}

function CreateSurveiModal({ open, onClose, onErr }: { open: boolean; onClose: () => void; onErr: (s: string) => void }) {
  const actions = useSurveiActions();
  const [body, setBody] = useState<Partial<Survei>>({ kategori: 'layanan_akademik', target: 'mahasiswa' });

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Buat Survei Kepuasan" width={560}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          actions.create.mutate(body, {
            onSuccess: () => { onClose(); setBody({ kategori: 'layanan_akademik', target: 'mahasiswa' }); },
            onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal'),
          });
        }}
      >
        <Input label="Kode" value={body.kode ?? ''} onChange={(e) => setBody({ ...body, kode: (e.target as HTMLInputElement).value })} required />
        <Input label="Judul" value={body.judul ?? ''} onChange={(e) => setBody({ ...body, judul: (e.target as HTMLInputElement).value })} required />
        <Textarea label="Deskripsi" rows={2} value={body.deskripsi ?? ''} onChange={(e) => setBody({ ...body, deskripsi: (e.target as HTMLTextAreaElement).value })} />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Kategori" value={body.kategori ?? 'layanan_akademik'} onChange={(e) => setBody({ ...body, kategori: (e.target as HTMLSelectElement).value as KategoriSurvei })}>
              {KATEGORI.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Target responden" value={body.target ?? 'mahasiswa'} onChange={(e) => setBody({ ...body, target: (e.target as HTMLSelectElement).value })}>
              <option value="mahasiswa">Mahasiswa</option>
              <option value="dosen">Dosen</option>
              <option value="alumni">Alumni</option>
              <option value="pengguna_lulusan">Pengguna lulusan</option>
              <option value="umum">Umum</option>
            </Select>
          </div>
        </div>
        <Input label="Periode (opsional)" placeholder="2026-1" value={body.periode ?? ''} onChange={(e) => setBody({ ...body, periode: (e.target as HTMLInputElement).value })} />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function PertanyaanModal({ surveiId, onClose, onErr }: { surveiId: string | null; onClose: () => void; onErr: (s: string) => void }) {
  const { data } = useSurveiDetail(surveiId ?? undefined);
  const actions = useSurveiActions();
  const [pertanyaan, setPertanyaan] = useState('');
  const [jenis, setJenis] = useState<JenisPertanyaan>('likert');
  const [opsi, setOpsi] = useState('');
  const [wajib, setWajib] = useState(true);

  if (!surveiId) return null;
  const locked = data?.status !== 'draft';
  return (
    <Modal open={!!surveiId} onClose={onClose} title={`Pertanyaan — ${data?.judul ?? ''}`} width={680}>
      <div className="stack">
        {locked && <Alert variant="info">Survei sudah dipublish — tidak dapat menambah/mengubah pertanyaan.</Alert>}
        {data?.pertanyaan && data.pertanyaan.length > 0 && (
          <div className="stack">
            {data.pertanyaan.map((p, i) => (
              <Card key={p.id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{i + 1}. {p.pertanyaan}</strong>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {p.jenis} {p.wajib && '· wajib'}
                      {p.jenis === 'pilihan' && p.opsi && ` · ${p.opsi.length} opsi`}
                    </div>
                  </div>
                  {!locked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={14} />}
                      onClick={() => actions.removePertanyaan.mutate(p.id, {
                        onError: (e: any) => onErr(e instanceof ApiError ? e.message : 'Gagal'),
                      })}
                    >Hapus</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        {!locked && (
          <Card>
            <strong>Tambah pertanyaan</strong>
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <Textarea rows={2} value={pertanyaan} onChange={(e) => setPertanyaan((e.target as HTMLTextAreaElement).value)} placeholder="Tulis pertanyaan…" />
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <Select label="Jenis" value={jenis} onChange={(e) => setJenis((e.target as HTMLSelectElement).value as JenisPertanyaan)}>
                    <option value="likert">Likert (1-5)</option>
                    <option value="pilihan">Pilihan ganda</option>
                    <option value="open">Esai bebas</option>
                  </Select>
                </div>
                <label className="row" style={{ gap: 'var(--space-1)', alignItems: 'center', marginTop: 22 }}>
                  <input type="checkbox" checked={wajib} onChange={(e) => setWajib(e.target.checked)} />
                  <span>Wajib dijawab</span>
                </label>
              </div>
              {jenis === 'pilihan' && (
                <Input label="Opsi (pisah dengan koma)" value={opsi} onChange={(e) => setOpsi((e.target as HTMLInputElement).value)} placeholder="Sangat baik, Baik, Cukup, Kurang" />
              )}
              <Button
                variant="primary"
                disabled={!pertanyaan.trim()}
                onClick={() => {
                  const opsiArr = jenis === 'pilihan' ? opsi.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                  actions.addPertanyaan.mutate(
                    { surveiId, body: { pertanyaan, jenis, wajib, opsi: opsiArr ?? null, urutan: (data?.pertanyaan?.length ?? 0) + 1 } },
                    {
                      onSuccess: () => { setPertanyaan(''); setOpsi(''); },
                      onError: (e: any) => onErr(e instanceof ApiError ? e.message : 'Gagal'),
                    },
                  );
                }}
              >
                Tambah
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}

function HasilModal({ surveiId, onClose }: { surveiId: string | null; onClose: () => void }) {
  const { data, isLoading } = useSurveiHasil(surveiId ?? undefined);

  if (!surveiId) return null;
  return (
    <Modal open={!!surveiId} onClose={onClose} title="Hasil Survei" width={720}>
      {isLoading && <p className="muted">Memuat…</p>}
      {data && (
        <div className="stack">
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Total Response
            </div>
            <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.totalResponse}</div>
          </Card>
          {data.hasil.map((h) => (
            <Card key={h.pertanyaanId}>
              <strong>{h.urutan}. {h.pertanyaan}</strong>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{h.jenis} · {h.n} jawaban</div>
              {h.jenis === 'likert' && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <div className="mono" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Rata-rata: {h.rataRata}/5</div>
                  <div className="row" style={{ gap: 'var(--space-2)', marginTop: 4, flexWrap: 'wrap' }}>
                    {h.distribusi && Object.entries(h.distribusi).map(([n, count]) => (
                      <div key={n} className="pill" style={{ background: 'var(--surface-sunken)' }}>
                        {n}: <span className="mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {h.jenis === 'pilihan' && h.distribusi && (
                <table className="tz-table" style={{ marginTop: 'var(--space-2)' }}>
                  <tbody>
                    {Object.entries(h.distribusi).map(([opt, count]) => (
                      <tr key={opt}><td>{opt}</td><td className="num mono">{count}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {h.jenis === 'open' && h.sample && (
                <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
                  {h.sample.slice(0, 10).map((teks, i) => (
                    <div key={i} className="muted" style={{ padding: 'var(--space-2)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
                      "{teks}"
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
