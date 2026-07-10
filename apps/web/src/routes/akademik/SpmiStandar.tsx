import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, ProgressBar, Select } from '@/ds';
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
import { Plus, Activity, Trash2, ClipboardEdit, Target } from 'lucide-react';
import {
  useStandarMutu, useStandarMutuActions,
  type StandarMutu, type KategoriStandar, type SumberDataStandar, type StatusPencapaian,
} from '@/lib/queries-spmi';
import { useProdiRef as useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { ApiError } from '@/lib/api';

const KATEGORI: Array<{ v: KategoriStandar; label: string }> = [
  { v: 'pendidikan', label: 'Pendidikan' },
  { v: 'penelitian', label: 'Penelitian' },
  { v: 'pengabdian', label: 'Pengabdian' },
  { v: 'pengelolaan', label: 'Pengelolaan' },
  { v: 'sarpras', label: 'Sarpras' },
  { v: 'pembiayaan', label: 'Pembiayaan' },
  { v: 'spmi_tambahan', label: 'Standar tambahan' },
  { v: 'non_akademik', label: 'Non-akademik' },
  { v: 'standar_internasional', label: 'Standar Internasional' },
];

const SUMBER: Array<{ v: SumberDataStandar; label: string; desc: string }> = [
  { v: 'manual', label: 'Manual', desc: 'Input nilai pengukuran secara manual' },
  { v: 'ipk_lulusan', label: 'IPK Lulusan', desc: 'Rata-rata IPK dari Yudisium' },
  { v: 'masa_studi', label: 'Masa Studi', desc: 'Rata-rata masa studi lulusan (tahun)' },
  { v: 'tingkat_kelulusan', label: 'Tingkat Kelulusan (%)', desc: 'Persentase mhs lulus / total mhs' },
  { v: 'edom_dosen', label: 'EDOM Dosen', desc: 'Rata-rata penilaian EDOM (skala 100)' },
  { v: 'kehadiran_dosen', label: 'Kehadiran Dosen (%)', desc: 'Pertemuan terlaksana / terjadwal' },
  { v: 'kehadiran_mahasiswa', label: 'Kehadiran Mahasiswa (%)', desc: 'Hadir+izin+sakit / total absensi' },
  { v: 'rasio_dosen_mhs', label: 'Rasio Dosen:Mhs', desc: 'Jumlah mhs aktif per dosen' },
  { v: 'bkd_compliance', label: 'BKD Compliance (%)', desc: 'Dosen lapor & disetujui BKD' },
  { v: 'capaian_cpl', label: 'Capaian CPL', desc: 'Rata-rata nilai CPMK' },
];

const STATUS_VARIANT: Record<StatusPencapaian, 'success' | 'warning' | 'danger' | 'neutral'> = {
  tercapai: 'success',
  cukup: 'warning',
  belum_tercapai: 'danger',
  belum_diukur: 'neutral',
};

const STATUS_LABEL: Record<StatusPencapaian, string> = {
  tercapai: 'Tercapai',
  cukup: 'Cukup',
  belum_tercapai: 'Belum tercapai',
  belum_diukur: 'Belum diukur',
};

export function AkademikSpmiStandar() {
  const [kategori, setKategori] = useState<KategoriStandar | ''>('');
  const { data, isLoading, error } = useStandarMutu({ kategori: kategori || undefined });
  const actions = useStandarMutuActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<StandarMutu | null>(null);
  const [ukurFor, setUkurFor] = useState<StandarMutu | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="PENETAPAN"
        title="Standar Mutu"
        subtitle="Tetapkan target & ambang capaian setiap standar. Sumber data otomatis akan menghitung pencapaian dari modul SIAKAD terkait."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Tambah Standar
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 220 }}>
          <Select label="Kategori" value={kategori} onChange={(e) => setKategori((e.target as HTMLSelectElement).value as KategoriStandar | '')}>
            <option value="">Semua kategori</option>
            {KATEGORI.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.items.length === 0 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(208,166,86,0.10)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}>
              <Target size={24} />
            </div>
            <strong style={{ color: 'var(--text-strong)' }}>Belum ada standar mutu</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
              Klik tombol "Tambah Standar" di atas untuk menetapkan standar mutu pertama Anda.
            </p>
          </div>
        </Card>
      )}

      {data && data.items.length > 0 && (() => {
        // Group by kategori
        const grouped = data.items.reduce<Record<string, typeof data.items>>((acc, s) => {
          (acc[s.kategori] = acc[s.kategori] || []).push(s);
          return acc;
        }, {});
        const ordered = KATEGORI.filter((k) => grouped[k.v]?.length);
        return (
          <div className="stack">
            {ordered.map((k) => (
              <div key={k.v}>
                <div className="row" style={{ alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
                  <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-base)' }}>{k.label}</strong>
                  <Badge variant="neutral">{grouped[k.v]!.length} standar</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
                  {grouped[k.v]!.map((s) => (
                    <StandarCardItem
                      key={s.id}
                      standar={s}
                      onUkur={() => setUkurFor(s)}
                      onEdit={() => setEditFor(s)}
                      onDelete={() => {
                        if (!confirm(`Hapus standar ${s.kode}?`)) return;
                        actions.remove.mutate(s.id, {
                          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal hapus'),
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <StandarFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(body) => actions.create.mutate(body as any, {
          onSuccess: () => setCreateOpen(false),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
        })}
        title="Tambah Standar Mutu"
      />

      <StandarFormModal
        open={!!editFor}
        onClose={() => setEditFor(null)}
        initial={editFor ?? undefined}
        onSubmit={(body) => editFor && actions.update.mutate({ id: editFor.id, body: body as any }, {
          onSuccess: () => setEditFor(null),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
        })}
        title="Edit Standar Mutu"
      />

      <UkurModal
        std={ukurFor}
        onClose={() => setUkurFor(null)}
        onAuto={(periode) => ukurFor && actions.ukur.mutate({ id: ukurFor.id, periode }, {
          onSuccess: () => setUkurFor(null),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal ukur'),
        })}
        onManual={(periode, nilai, catatan) => ukurFor && actions.pengukuranManual.mutate(
          { id: ukurFor.id, periode, nilai, catatan },
          {
            onSuccess: () => setUkurFor(null),
            onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal input'),
          },
        )}
        onDeletePengukuran={(periode) => ukurFor && actions.pengukuranHapus.mutate(
          { id: ukurFor.id, periode },
          { onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal hapus') },
        )}
      />
    </div>
  );
}

function StandarCardItem({
  standar, onUkur, onEdit, onDelete,
}: {
  standar: StandarMutu;
  onUkur: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const last = standar.pengukuran?.[0];
  // Hitung % capaian untuk progress bar (relatif terhadap target)
  let pct: number | null = null;
  if (last) {
    if (standar.targetMin != null && standar.targetMin > 0) {
      pct = Math.min(100, (last.nilai / standar.targetMin) * 100);
    } else if (standar.targetMax != null && standar.targetMax > 0) {
      // Lower-is-better: 100% bila <= targetMax, 0% bila jauh di atas
      pct = Math.min(100, Math.max(0, (standar.targetMax / Math.max(last.nilai, 0.01)) * 100));
    }
  }
  const target = standar.targetMin != null
    ? `≥ ${standar.targetMin}${standar.satuan ? ` ${standar.satuan}` : ''}`
    : standar.targetMax != null
      ? `≤ ${standar.targetMax}${standar.satuan ? ` ${standar.satuan}` : ''}`
      : '—';
  const sumberLabel = SUMBER.find((x) => x.v === standar.sumberData)?.label ?? standar.sumberData;
  const isAuto = standar.sumberData !== 'manual';
  const progressVariant = last ? (last.status === 'tercapai' ? 'success' : last.status === 'cukup' ? 'accent' : 'primary') : 'primary';
  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <div>
          <div className="mono muted" style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}>{standar.kode}</div>
          <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 2 }}>{standar.nama}</strong>
        </div>
        {last && <Badge variant={STATUS_VARIANT[last.status]} dot>{STATUS_LABEL[last.status]}</Badge>}
        {!last && <Badge variant="neutral" dot>Belum diukur</Badge>}
      </div>

      {standar.prodi && (
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Prodi: {standar.prodi.nama} ({standar.prodi.kode})</div>
      )}

      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <Badge variant={isAuto ? 'accent' : 'neutral'}>{isAuto ? 'Auto' : 'Manual'} · {sumberLabel}</Badge>
      </div>

      <div style={{ background: 'var(--surface-sunken)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
          <span className="muted">Target</span>
          <span className="mono" style={{ color: 'var(--text-strong)', fontWeight: 600 }}>{target}</span>
        </div>
        {last && (
          <>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginTop: 4 }}>
              <span className="muted">Realisasi · {last.periode}</span>
              <span className="mono" style={{ color: 'var(--text-strong)', fontWeight: 600 }}>{last.nilai}{standar.satuan ? ` ${standar.satuan}` : ''}</span>
            </div>
            {pct != null && (
              <div style={{ marginTop: 6 }}>
                <ProgressBar value={pct} max={100} variant={progressVariant as any} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="row" style={{ gap: 6, marginTop: 'auto', paddingTop: 'var(--space-1)' }}>
        <Button variant="primary" size="sm" leftIcon={<Activity size={14} />} onClick={onUkur}>Ukur</Button>
        <Button variant="ghost" size="sm" leftIcon={<ClipboardEdit size={14} />} onClick={onEdit}>Edit</Button>
        <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={onDelete}>Hapus</Button>
      </div>
    </Card>
  );
}

function StandarFormModal({
  open, onClose, onSubmit, initial, title,
}: {
  open: boolean; onClose: () => void; onSubmit: (body: Partial<StandarMutu>) => void;
  initial?: StandarMutu; title: string;
}) {
  const prodi = useProdi();
  const [body, setBody] = useState<Partial<StandarMutu>>(initial ?? { kategori: 'pendidikan', sumberData: 'manual', isAktif: true });

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} width={680}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(body);
        }}
      >
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Kode" value={body.kode ?? ''} onChange={(e) => setBody({ ...body, kode: (e.target as HTMLInputElement).value })} required />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama" value={body.nama ?? ''} onChange={(e) => setBody({ ...body, nama: (e.target as HTMLInputElement).value })} required />
          </div>
        </div>
        <Textarea label="Pernyataan standar" rows={3} value={body.deskripsi ?? ''} onChange={(e) => setBody({ ...body, deskripsi: (e.target as HTMLTextAreaElement).value })} required />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Kategori" value={body.kategori ?? 'pendidikan'} onChange={(e) => setBody({ ...body, kategori: (e.target as HTMLSelectElement).value as KategoriStandar })}>
              {KATEGORI.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Prodi (opsional)" value={body.prodiId ?? ''} onChange={(e) => setBody({ ...body, prodiId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">Level institusi/fakultas</option>
              {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Select label="Sumber data" value={body.sumberData ?? 'manual'} onChange={(e) => setBody({ ...body, sumberData: (e.target as HTMLSelectElement).value as SumberDataStandar })}>
            {SUMBER.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </Select>
          <small className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            {SUMBER.find((s) => s.v === body.sumberData)?.desc}
          </small>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Satuan" placeholder="IPK, %, tahun" value={body.satuan ?? ''} onChange={(e) => setBody({ ...body, satuan: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Target minimal (≥)" type="number" step="0.01" value={body.targetMin ?? ''} onChange={(e) => setBody({ ...body, targetMin: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Target maksimal (≤)" type="number" step="0.01" value={body.targetMax ?? ''} onChange={(e) => setBody({ ...body, targetMax: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Ambang cukup" type="number" step="0.01" value={body.ambangCukup ?? ''} onChange={(e) => setBody({ ...body, ambangCukup: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value) })} />
          </div>
        </div>
        <Textarea label="Strategi / indikator (opsional)" rows={2} value={body.rumusan ?? ''} onChange={(e) => setBody({ ...body, rumusan: (e.target as HTMLTextAreaElement).value })} />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function UkurModal({
  std, onClose, onAuto, onManual, onDeletePengukuran,
}: {
  std: StandarMutu | null; onClose: () => void;
  onAuto: (periode: string) => void;
  onManual: (periode: string, nilai: number, catatan?: string) => void;
  onDeletePengukuran: (periode: string) => void;
}) {
  const [periode, setPeriode] = useState(new Date().getFullYear().toString());
  const [nilai, setNilai] = useState('');
  const [catatan, setCatatan] = useState('');

  if (!std) return null;
  const isManual = std.sumberData === 'manual';
  const riwayat = std.pengukuran ?? [];

  return (
    <Modal open={!!std} onClose={onClose} title={`Ukur: ${std.nama}`} width={560}>
      <div className="stack">
        <Input label="Periode" placeholder="2026-1 atau 2025" value={periode} onChange={(e) => setPeriode((e.target as HTMLInputElement).value)} />
        {isManual ? (
          <>
            <Input label={`Nilai${std.satuan ? ` (${std.satuan})` : ''}`} type="number" step="0.01" value={nilai} onChange={(e) => setNilai((e.target as HTMLInputElement).value)} />
            <Textarea label="Catatan" rows={2} value={catatan} onChange={(e) => setCatatan((e.target as HTMLTextAreaElement).value)} />
            <Button variant="primary" disabled={!periode || nilai === ''} onClick={() => onManual(periode, Number(nilai), catatan || undefined)}>
              Simpan Pengukuran
            </Button>
          </>
        ) : (
          <>
            <Alert variant="info">
              Sistem akan otomatis menghitung dari sumber data <strong>{SUMBER.find((s) => s.v === std.sumberData)?.label}</strong>.
            </Alert>
            <Button variant="primary" leftIcon={<Activity size={14} />} disabled={!periode} onClick={() => onAuto(periode)}>
              Hitung Otomatis Sekarang
            </Button>
          </>
        )}

        {riwayat.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-2)' }}>
              Riwayat pengukuran
            </div>
            <div className="tz-table-wrap" style={{ maxHeight: 220, overflow: 'auto' }}>
              <table className="tz-table">
                <thead><tr><th>Periode</th><th className="num">Nilai</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {riwayat.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.periode}</td>
                      <td className="num mono">{p.nilai}{std.satuan ? ` ${std.satuan}` : ''}</td>
                      <td>{p.status}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { if (confirm(`Hapus pengukuran periode ${p.periode}?`)) onDeletePengukuran(p.periode); }}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
