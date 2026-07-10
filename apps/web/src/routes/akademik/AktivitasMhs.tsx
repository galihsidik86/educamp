import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import {
  useAktivitasMhs, useAktivitasMhsActions, useAdminMahasiswa, useAdminDosen, usePeriode,
  type AktivitasMhsListItem, type AktivitasMhsJenis, type AktivitasMhsStatus, type AktivitasMhsInput,
} from '@/lib/queries-akademik';

const JENIS_OPTIONS: AktivitasMhsJenis[] = [
  'pertukaran_pelajar', 'magang', 'asistensi_mengajar', 'riset',
  'pengabdian_masyarakat', 'kewirausahaan', 'proyek_independen',
  'proyek_kemanusiaan', 'bela_negara', 'kkn_tematik', 'kerja_praktek',
  'studi_independen', 'ppl', 'lainnya',
];

const JENIS_LABEL: Record<AktivitasMhsJenis, string> = {
  pertukaran_pelajar: 'Pertukaran Pelajar',
  magang: 'Magang',
  asistensi_mengajar: 'Asistensi Mengajar',
  riset: 'Riset',
  pengabdian_masyarakat: 'Pengabdian Masyarakat',
  kewirausahaan: 'Kewirausahaan',
  proyek_independen: 'Proyek Independen',
  proyek_kemanusiaan: 'Proyek Kemanusiaan',
  bela_negara: 'Bela Negara',
  kkn_tematik: 'KKN Tematik',
  kerja_praktek: 'Kerja Praktek',
  studi_independen: 'Studi Independen',
  ppl: 'PPL (PPG)',
  lainnya: 'Lainnya',
};

const STATUS_OPTIONS: AktivitasMhsStatus[] = ['diajukan', 'berjalan', 'selesai', 'dibatalkan'];

export function AktivitasMhsPage() {
  const periode = usePeriode();
  const semesterList = useMemo(() => {
    return periode.data?.items.flatMap((ta) =>
      ta.semester.map((s) => ({ id: s.id, kode: s.kode, jenis: s.jenis, taKode: ta.kode, isAktif: s.isAktif })),
    ) ?? [];
  }, [periode.data]);

  const [filters, setFilters] = useState({ semesterId: '', jenis: '', status: '', isMbkm: false });
  const { data, isLoading, error } = useAktivitasMhs({
    semesterId: filters.semesterId || undefined,
    jenis: filters.jenis || undefined,
    status: filters.status || undefined,
    isMbkm: filters.isMbkm || undefined,
  });
  const actions = useAktivitasMhsActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: AktivitasMhsListItem } | { mode: 'peserta'; item: AktivitasMhsListItem } | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((a) =>
      a.nama.toLowerCase().includes(query) || (a.mitra ?? '').toLowerCase().includes(query),
    );
  }, [data, q]);

  const onDelete = async (id: string) => {
    if (!confirm('Hapus aktivitas ini? Peserta & pembimbing akan ikut terhapus.')) return;
    try { await actions.remove.mutateAsync(id); setMsg({ type: 'success', text: 'Aktivitas dihapus' }); }
    catch (e) { setMsg({ type: 'danger', text: e instanceof ApiError ? e.message : 'Gagal' }); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="PDDIKTI · TAHAP 2"
        title="Aktivitas Mahasiswa"
        subtitle="MBKM, Pertukaran Pelajar, Magang, Riset, KKN Tematik, PPL — semua aktivitas mahasiswa yang dilaporkan ke Neo Feeder."
        right={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>
            Tambah Aktivitas
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {msg && <Alert variant={msg.type} title={msg.type === 'success' ? 'Berhasil' : 'Gagal'}>{msg.text}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <Select label="Semester" value={filters.semesterId} onChange={(e) => setFilters({ ...filters, semesterId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {semesterList.map((s) => <option key={s.id} value={s.id}>{s.kode} · {s.jenis} {s.taKode}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Jenis" value={filters.jenis} onChange={(e) => setFilters({ ...filters, jenis: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{JENIS_LABEL[j]}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 160 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <label className="row" style={{ gap: 6, alignItems: 'center', paddingBottom: 8 }}>
          <input type="checkbox" checked={filters.isMbkm} onChange={(e) => setFilters({ ...filters, isMbkm: e.target.checked })} />
          <span style={{ fontSize: 'var(--text-sm)' }}>Hanya MBKM</span>
        </label>
        {data && data.items.length > 0 && (
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari nama aktivitas atau mitra…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada aktivitas yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Nama Aktivitas</th>
              <th>Jenis</th>
              <th>Semester</th>
              <th className="num">Peserta</th>
              <th>Mitra</th>
              <th>Status</th>
              <th>MBKM</th>
              <th>Sync</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Belum ada aktivitas.</td></tr>}
            {items.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.nama}</strong>
                  {a.lokasi && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{a.lokasi}</div>}
                </td>
                <td><Badge variant="neutral">{JENIS_LABEL[a.jenis]}</Badge></td>
                <td className="mono">{a.semester.kode}</td>
                <td className="num mono">{a.peserta.length}</td>
                <td className="muted">{a.mitra ?? '—'}</td>
                <td><Badge variant={a.status === 'selesai' ? 'success' : a.status === 'dibatalkan' ? 'danger' : 'warning'}>{a.status}</Badge></td>
                <td>
                  {a.isMbkm ? (
                    <Badge variant={a.isFlagship ? 'brand' : 'neutral'}>
                      {a.isFlagship ? 'Flagship' : 'Mandiri'}
                    </Badge>
                  ) : <span className="muted">—</span>}
                </td>
                <td>{a.feederId ? <span className="pill pill--success">sync</span> : <span className="pill pill--neutral">pending</span>}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Users size={12} />} onClick={() => setModal({ mode: 'peserta', item: a })}>Peserta</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', item: a })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(a.id)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.mode === 'create' && (
        <AktivitasModal
          semesterList={semesterList}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            await actions.create.mutateAsync(input);
            setModal(null); setMsg({ type: 'success', text: 'Aktivitas ditambahkan' });
          }}
        />
      )}
      {modal?.mode === 'edit' && (
        <AktivitasModal
          semesterList={semesterList}
          initial={modal.item}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            await actions.update.mutateAsync({ id: modal.item.id, patch: input });
            setModal(null); setMsg({ type: 'success', text: 'Aktivitas diperbarui' });
          }}
        />
      )}
      {modal?.mode === 'peserta' && (
        <PesertaModal
          aktivitas={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setMsg({ type: 'success', text: 'Peserta & pembimbing tersimpan' }); }}
        />
      )}
    </div>
  );
}

function AktivitasModal({ initial, semesterList, onClose, onSubmit }: {
  initial?: AktivitasMhsListItem;
  semesterList: Array<{ id: string; kode: string; jenis: string; taKode: string; isAktif: boolean }>;
  onClose: () => void;
  onSubmit: (input: AktivitasMhsInput) => Promise<void>;
}) {
  const aktif = semesterList.find((s) => s.isAktif);
  const [form, setForm] = useState<AktivitasMhsInput>({
    jenis: initial?.jenis ?? 'magang',
    nama: initial?.nama ?? '',
    deskripsi: initial?.deskripsi ?? '',
    semesterId: initial?.semesterId ?? aktif?.id ?? '',
    lokasi: initial?.lokasi ?? '',
    mitra: initial?.mitra ?? '',
    isMbkm: initial?.isMbkm ?? false,
    isFlagship: initial?.isFlagship ?? false,
    isEksternal: initial?.isEksternal ?? false,
    linkProposal: initial?.linkProposal ?? '',
    linkLaporan: initial?.linkLaporan ?? '',
    linkSertifikat: initial?.linkSertifikat ?? '',
    tanggalMulai: initial?.tanggalMulai ? initial.tanggalMulai.slice(0, 10) : '',
    tanggalSelesai: initial?.tanggalSelesai ? initial.tanggalSelesai.slice(0, 10) : '',
    status: initial?.status ?? 'diajukan',
    catatan: initial?.catatan ?? '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const payload: AktivitasMhsInput = { ...form };
      // '' → null for nullable strings
      for (const k of ['deskripsi', 'lokasi', 'mitra', 'linkProposal', 'linkLaporan', 'linkSertifikat', 'tanggalMulai', 'tanggalSelesai', 'catatan'] as const) {
        if ((payload as any)[k] === '') (payload as any)[k] = null;
      }
      await onSubmit(payload);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Aktivitas' : 'Tambah Aktivitas Mahasiswa'} width={700}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="form-section">
          <h4>Info utama</h4>
          <Input label="Nama aktivitas" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="MBKM Bangkit Academy 2026" />
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Select label="Jenis aktivitas" required value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as AktivitasMhsJenis })}>
                {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{JENIS_LABEL[j]}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Semester" required value={form.semesterId ?? ''} onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value })}>
                <option value="">— pilih —</option>
                {semesterList.map((s) => <option key={s.id} value={s.id}>{s.kode} · {s.jenis} {s.taKode}</option>)}
              </Select>
            </div>
            <div style={{ flex: 1 }}>
              <Select label="Status" value={form.status ?? 'diajukan'} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AktivitasMhsStatus })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
          <Input label="Deskripsi" value={form.deskripsi ?? ''} onChange={(e) => setForm({ ...form, deskripsi: (e.target as HTMLInputElement).value })} />
        </div>

        <div className="form-section">
          <h4>Mitra & lokasi</h4>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Mitra / Institusi" value={form.mitra ?? ''} onChange={(e) => setForm({ ...form, mitra: (e.target as HTMLInputElement).value })} placeholder="Google · Tokopedia · Bangkit" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Lokasi" value={form.lokasi ?? ''} onChange={(e) => setForm({ ...form, lokasi: (e.target as HTMLInputElement).value })} placeholder="Jakarta / Daring" />
            </div>
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal mulai" type="date" value={form.tanggalMulai ?? ''} onChange={(e) => setForm({ ...form, tanggalMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Tanggal selesai" type="date" value={form.tanggalSelesai ?? ''} onChange={(e) => setForm({ ...form, tanggalSelesai: (e.target as HTMLInputElement).value })} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>MBKM</h4>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.isMbkm ?? false} onChange={(e) => setForm({ ...form, isMbkm: e.target.checked })} />
            <span>Termasuk program MBKM</span>
          </label>
          {form.isMbkm && (
            <>
              <label className="row" style={{ gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.isFlagship ?? false} onChange={(e) => setForm({ ...form, isFlagship: e.target.checked })} />
                <span>MBKM Flagship (program nasional)</span>
              </label>
              <label className="row" style={{ gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.isEksternal ?? false} onChange={(e) => setForm({ ...form, isEksternal: e.target.checked })} />
                <span>Eksternal (lintas PT)</span>
              </label>
            </>
          )}
        </div>

        <div className="form-section">
          <h4>Tautan dokumen</h4>
          <Input label="Link proposal" value={form.linkProposal ?? ''} onChange={(e) => setForm({ ...form, linkProposal: (e.target as HTMLInputElement).value })} />
          <Input label="Link laporan akhir" value={form.linkLaporan ?? ''} onChange={(e) => setForm({ ...form, linkLaporan: (e.target as HTMLInputElement).value })} />
          <Input label="Link sertifikat" value={form.linkSertifikat ?? ''} onChange={(e) => setForm({ ...form, linkSertifikat: (e.target as HTMLInputElement).value })} />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PesertaModal({ aktivitas, onClose, onSaved }: {
  aktivitas: AktivitasMhsListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mhs = useAdminMahasiswa();
  const dsn = useAdminDosen();
  const actions = useAktivitasMhsActions();
  type PesertaRow = { mahasiswaId: string; peran: string | null; konversiSks: number | null };
  type PembRow = { dosenId: string; peran: string | null };
  const [peserta, setPeserta] = useState<PesertaRow[]>(
    aktivitas.peserta.map((p) => ({ mahasiswaId: p.mahasiswaId, peran: p.peran, konversiSks: p.konversiSks })),
  );
  const [pembimbing, setPembimbing] = useState<PembRow[]>(
    aktivitas.pembimbing.map((p) => ({ dosenId: p.dosenId, peran: p.peran })),
  );
  const [mhsQuery, setMhsQuery] = useState('');
  const [dsnQuery, setDsnQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSave = async () => {
    setErr(null); setBusy(true);
    try {
      await actions.setPeserta.mutateAsync({ id: aktivitas.id, items: peserta });
      await actions.setPembimbing.mutateAsync({ id: aktivitas.id, items: pembimbing });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    } finally { setBusy(false); }
  };

  const mhsCandidate = (mhs.data?.items ?? []).filter((m) =>
    !peserta.some((p) => p.mahasiswaId === m.id) &&
    (mhsQuery === '' || m.nim.includes(mhsQuery) || m.nama.toLowerCase().includes(mhsQuery.toLowerCase())),
  ).slice(0, 8);

  const dsnCandidate = (dsn.data?.items ?? []).filter((d) =>
    !pembimbing.some((p) => p.dosenId === d.id) &&
    (dsnQuery === '' || d.nidn.includes(dsnQuery) || d.nama.toLowerCase().includes(dsnQuery.toLowerCase())),
  ).slice(0, 8);

  const findMhs = (id: string) => mhs.data?.items.find((m) => m.id === id);
  const findDsn = (id: string) => dsn.data?.items.find((d) => d.id === id);

  return (
    <Modal open onClose={onClose} title={`Peserta & Pembimbing · ${aktivitas.nama}`} width={780}>
      <div className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="form-section">
          <h4>Peserta ({peserta.length})</h4>
          <Input
            label="Cari mahasiswa (NIM/nama)"
            value={mhsQuery}
            onChange={(e) => setMhsQuery((e.target as HTMLInputElement).value)}
          />
          {mhsCandidate.length > 0 && (
            <div className="stack" style={{ gap: 4, maxHeight: 160, overflow: 'auto', padding: 'var(--space-2)', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
              {mhsCandidate.map((m) => (
                <button key={m.id} type="button" className="row"
                  style={{ gap: 8, padding: '6px 10px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', justifyContent: 'flex-start' }}
                  onClick={() => { setPeserta([...peserta, { mahasiswaId: m.id, peran: null, konversiSks: null }]); setMhsQuery(''); }}
                >
                  <Plus size={14} />
                  <span className="mono">{m.nim}</span>
                  <span>{m.nama}</span>
                  <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{m.prodi.kode}</span>
                </button>
              ))}
            </div>
          )}
          {peserta.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Belum ada peserta.</p>}
          {peserta.map((p, idx) => {
            const m = findMhs(p.mahasiswaId);
            return (
              <div key={p.mahasiswaId} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <strong className="mono">{m?.nim ?? p.mahasiswaId.slice(0, 8)}</strong> · {m?.nama ?? '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    placeholder="Peran (Ketua/Anggota)"
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 4, fontSize: 'var(--text-sm)' }}
                    value={p.peran ?? ''}
                    onChange={(e) => setPeserta(peserta.map((x, i) => i === idx ? { ...x, peran: e.target.value || null } : x))}
                  />
                </div>
                <div style={{ width: 100 }}>
                  <input
                    type="number"
                    placeholder="SKS"
                    min={0}
                    max={40}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 4, fontSize: 'var(--text-sm)' }}
                    value={p.konversiSks != null ? String(p.konversiSks) : ''}
                    onChange={(e) => setPeserta(peserta.map((x, i) => i === idx ? { ...x, konversiSks: e.target.value === '' ? null : Number(e.target.value) } : x))}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setPeserta(peserta.filter((_, i) => i !== idx))}>
                  <Trash2 size={12} />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="form-section">
          <h4>Pembimbing ({pembimbing.length})</h4>
          <Input
            label="Cari dosen (NIDN/nama)"
            value={dsnQuery}
            onChange={(e) => setDsnQuery((e.target as HTMLInputElement).value)}
          />
          {dsnCandidate.length > 0 && (
            <div className="stack" style={{ gap: 4, maxHeight: 160, overflow: 'auto', padding: 'var(--space-2)', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
              {dsnCandidate.map((d) => (
                <button key={d.id} type="button" className="row"
                  style={{ gap: 8, padding: '6px 10px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', justifyContent: 'flex-start' }}
                  onClick={() => { setPembimbing([...pembimbing, { dosenId: d.id, peran: null }]); setDsnQuery(''); }}
                >
                  <Plus size={14} />
                  <span className="mono">{d.nidn}</span>
                  <span>{d.nama}</span>
                </button>
              ))}
            </div>
          )}
          {pembimbing.length === 0 && <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Belum ada pembimbing.</p>}
          {pembimbing.map((p, idx) => {
            const d = findDsn(p.dosenId);
            return (
              <div key={p.dosenId} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <strong className="mono">{d?.nidn ?? p.dosenId.slice(0, 8)}</strong> · {d?.nama ?? '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    placeholder="Peran (Pembimbing utama/lapangan)"
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 4, fontSize: 'var(--text-sm)' }}
                    value={p.peran ?? ''}
                    onChange={(e) => setPembimbing(pembimbing.map((x, i) => i === idx ? { ...x, peran: e.target.value || null } : x))}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setPembimbing(pembimbing.filter((_, i) => i !== idx))}>
                  <Trash2 size={12} />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" onClick={onSave} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
