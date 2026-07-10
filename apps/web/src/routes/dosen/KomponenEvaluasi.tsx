import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Badge, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2, Save, ArrowLeft, ListPlus, Search } from 'lucide-react';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { PageLoadingSkeleton, TableSkeletonRows } from '@/components/Skeleton';
import { ApiError } from '@/lib/api';
import {
  useKomponenEvaluasi, useKomponenActions, useNilaiKomponen, useNilaiKomponenActions,
  useDosenKelasDetail,
  type KomponenEvaluasi, type KomponenInput, type KomponenJenis,
} from '@/lib/queries-dosen';

const JENIS_OPTIONS: KomponenJenis[] = [
  'tugas', 'uts', 'uas', 'quiz', 'praktikum', 'kehadiran',
  'proyek', 'presentasi', 'laporan', 'case_method', 'team_based_project', 'lainnya',
];
const JENIS_LABEL: Record<KomponenJenis, string> = {
  tugas: 'Tugas', uts: 'UTS', uas: 'UAS', quiz: 'Quiz', praktikum: 'Praktikum', kehadiran: 'Kehadiran',
  proyek: 'Proyek', presentasi: 'Presentasi', laporan: 'Laporan',
  case_method: 'Case Method (IKU 7)', team_based_project: 'Team-Based Project (IKU 7)', lainnya: 'Lainnya',
};

export function KomponenEvaluasiPage() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const kelas = useDosenKelasDetail(kelasId);
  const komponen = useKomponenEvaluasi(kelasId);
  const matrix = useNilaiKomponen(kelasId);
  const komponenActions = useKomponenActions(kelasId);
  const nilaiActions = useNilaiKomponenActions(kelasId);
  const [editing, setEditing] = useState<KomponenEvaluasi | 'new' | null>(null);
  const [tab, setTab] = useState<'rancangan' | 'nilai'>('rancangan');
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const totalBobot = komponen.data?.items.reduce((s, k) => s + k.bobotPersen, 0) ?? 0;
  const bobotInovatif = komponen.data?.items
    .filter((k) => k.metodeCaseMethod || k.metodeTeamBased)
    .reduce((s, k) => s + k.bobotPersen, 0) ?? 0;

  const onDelete = async (id: string) => {
    if (!confirm('Hapus komponen evaluasi ini? Nilai mahasiswa pada komponen ini akan ikut terhapus.')) return;
    try { await komponenActions.remove.mutateAsync(id); }
    catch (e) { setMsg({ type: 'danger', text: e instanceof ApiError ? e.message : 'Gagal' }); }
  };

  return (
    <div className="stack">
      <Link to={`/dosen/nilai/${kelasId}`} className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        <ArrowLeft size={12} style={{ verticalAlign: 'middle' }} /> Kembali ke input nilai
      </Link>
      <PageHead
        eyebrow="IKU 7 · PDDIKTI"
        title="Komponen Evaluasi"
        subtitle={kelas.data ? `${kelas.data.kelas.kodeMK} · ${kelas.data.kelas.namaMK} · Kelas ${kelas.data.kelas.kodeKelas}` : 'Memuat…'}
        right={
          tab === 'rancangan' ? (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setEditing('new')}>
              Tambah Komponen
            </Button>
          ) : null
        }
      />

      <div className="modal-tabs" role="tablist" style={{ alignSelf: 'flex-start' }}>
        <button type="button" role="tab"
          className={`modal-tabs__btn ${tab === 'rancangan' ? 'modal-tabs__btn--active' : ''}`}
          onClick={() => setTab('rancangan')}>Rancangan Komponen</button>
        <button type="button" role="tab"
          className={`modal-tabs__btn ${tab === 'nilai' ? 'modal-tabs__btn--active' : ''}`}
          onClick={() => setTab('nilai')}>Input Nilai Komponen</button>
      </div>

      {msg && <Alert variant={msg.type} title={msg.type === 'success' ? 'Berhasil' : 'Gagal'}>{msg.text}</Alert>}

      {tab === 'rancangan' && (
        <>
          {totalBobot !== 100 && komponen.data && komponen.data.items.length > 0 && (
            <Alert variant="warning" title="Total bobot belum 100%">
              Total bobot saat ini: <strong>{totalBobot.toFixed(0)}%</strong>. Untuk laporan PDDikti yang valid, total bobot komponen evaluasi harus tepat 100%.
            </Alert>
          )}
          <Alert variant="info" title="IKU 7 — Metode Pembelajaran Inovatif">
            Bobot komponen <strong>case method</strong> atau <strong>team-based project</strong> di kelas ini:{' '}
            <strong>{bobotInovatif.toFixed(0)}%</strong>.{' '}
            {bobotInovatif >= 50
              ? '✓ Memenuhi target IKU 7 (≥50%).'
              : 'Belum mencapai 50% — kelas ini belum terhitung sebagai MK pembelajaran inovatif.'}
          </Alert>

          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Nama Komponen</th>
                  <th>Jenis</th>
                  <th className="num">Bobot %</th>
                  <th>Metode IKU 7</th>
                  <th>Sync</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {komponen.isLoading && <TableSkeletonRows cols={7} rows={5} />}
                {komponen.data?.items.length === 0 && (
                  <tr><td colSpan={7} className="muted center">Belum ada komponen. Klik 'Tambah Komponen'.</td></tr>
                )}
                {komponen.data?.items.map((k, i) => (
                  <tr key={k.id}>
                    <td className="mono">{i + 1}</td>
                    <td>
                      {k.nama}
                      {k.deskripsi && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{k.deskripsi}</div>}
                    </td>
                    <td><Badge variant="neutral">{JENIS_LABEL[k.jenis]}</Badge></td>
                    <td className="num mono">{k.bobotPersen}%</td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        {k.metodeCaseMethod && <Badge variant="brand">Case</Badge>}
                        {k.metodeTeamBased && <Badge variant="brand">TBP</Badge>}
                        {!k.metodeCaseMethod && !k.metodeTeamBased && <span className="muted">—</span>}
                      </div>
                    </td>
                    <td>{k.feederId ? <span className="pill pill--success">sync</span> : <span className="pill pill--neutral">pending</span>}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(k)}>Edit</Button>
                        <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(k.id)}>Hapus</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {komponen.data && komponen.data.items.length > 0 && (
                  <tr style={{ background: 'var(--surface-muted)', fontWeight: 'var(--fw-bold)' }}>
                    <td colSpan={3} style={{ textAlign: 'right' }}>Total</td>
                    <td className="num mono">{totalBobot.toFixed(0)}%</td>
                    <td colSpan={3}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'nilai' && (
        <NilaiKomponenMatrixTable
          kelasId={kelasId!}
          onMsg={setMsg}
          saveAction={nilaiActions.save.mutateAsync}
        />
      )}

      {editing && (
        <KomponenEditModal
          mode={editing === 'new' ? 'create' : 'edit'}
          initial={editing !== 'new' ? editing : undefined}
          onClose={() => setEditing(null)}
          onSubmit={async (input, id) => {
            if (id) await komponenActions.update.mutateAsync({ id, patch: input });
            else await komponenActions.create.mutateAsync(input);
            setEditing(null);
            setMsg({ type: 'success', text: 'Komponen tersimpan' });
          }}
        />
      )}
    </div>
  );
}

function KomponenEditModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: KomponenEvaluasi;
  onClose: () => void;
  onSubmit: (input: KomponenInput, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<KomponenInput>({
    nama: initial?.nama ?? '',
    jenis: initial?.jenis ?? 'uts',
    bobotPersen: initial?.bobotPersen ?? 0,
    deskripsi: initial?.deskripsi ?? '',
    metodeCaseMethod: initial?.metodeCaseMethod ?? false,
    metodeTeamBased: initial?.metodeTeamBased ?? false,
    urutan: initial?.urutan ?? 0,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await onSubmit({
        ...form,
        deskripsi: form.deskripsi || null,
      }, mode === 'edit' ? initial!.id : undefined);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Komponen Evaluasi' : `Edit ${initial!.nama}`} width={560}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Input label="Nama komponen" required value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="UTS, Proyek Kelompok, dll" />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Bobot %" type="number" min={0} max={100} step="1" required
              value={String(form.bobotPersen ?? 0)}
              onChange={(e) => setForm({ ...form, bobotPersen: Number((e.target as HTMLInputElement).value) })} />
          </div>
        </div>
        <Select label="Jenis komponen" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as KomponenJenis })}>
          {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{JENIS_LABEL[j]}</option>)}
        </Select>
        <div className="form-section">
          <h4>Metode pembelajaran inovatif (IKU 7)</h4>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
            Tandai jika komponen ini menggunakan metode <strong>case method</strong> (pembelajaran berbasis kasus)
            atau <strong>team-based project</strong> (proyek tim). Mata kuliah dengan total bobot komponen
            inovatif ≥ 50% terhitung sebagai MK pembelajaran inovatif untuk IKU 7.
          </p>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.metodeCaseMethod ?? false}
              onChange={(e) => setForm({ ...form, metodeCaseMethod: e.target.checked })} />
            <span>Case Method</span>
          </label>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={form.metodeTeamBased ?? false}
              onChange={(e) => setForm({ ...form, metodeTeamBased: e.target.checked })} />
            <span>Team-Based Project</span>
          </label>
        </div>
        <Input
          label="Deskripsi (opsional)"
          value={form.deskripsi ?? ''}
          onChange={(e) => setForm({ ...form, deskripsi: (e.target as HTMLInputElement).value })}
          placeholder="Rubrik, ekspektasi, atau catatan"
        />
        <Input
          label="Urutan tampilan"
          type="number"
          min={0}
          value={String(form.urutan ?? 0)}
          onChange={(e) => setForm({ ...form, urutan: Number((e.target as HTMLInputElement).value) })}
        />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function NilaiKomponenMatrixTable({ kelasId, onMsg, saveAction }: {
  kelasId: string;
  onMsg: (m: { type: 'success' | 'danger'; text: string } | null) => void;
  saveAction: (items: Array<{ krsId: string; komponenEvaluasiId: string; nilai: number | null }>) => Promise<unknown>;
}) {
  const matrix = useNilaiKomponen(kelasId);
  // Local edits — { [krsId]: { [komponenId]: value } }
  const [edits, setEdits] = useState<Record<string, Record<string, number | null>>>({});
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  // Reset edits when matrix data refreshes
  useEffect(() => { setEdits({}); }, [matrix.data?.komponen.length, matrix.data?.rows.length]);

  const dirty = useMemo(() => {
    return Object.values(edits).flatMap((r) => Object.values(r)).length > 0;
  }, [edits]);

  const setVal = (krsId: string, komponenId: string, val: number | null) => {
    setEdits((prev) => ({
      ...prev,
      [krsId]: { ...(prev[krsId] ?? {}), [komponenId]: val },
    }));
  };

  const getVal = (row: { krsId: string; nilai: Record<string, number | null> }, komponenId: string) => {
    const dirty = edits[row.krsId]?.[komponenId];
    if (dirty !== undefined) return dirty;
    return row.nilai[komponenId] ?? null;
  };

  const onSave = async () => {
    onMsg(null); setBusy(true);
    try {
      const items: Array<{ krsId: string; komponenEvaluasiId: string; nilai: number | null }> = [];
      for (const [krsId, vals] of Object.entries(edits)) {
        for (const [komponenEvaluasiId, nilai] of Object.entries(vals)) {
          items.push({ krsId, komponenEvaluasiId, nilai });
        }
      }
      await saveAction(items);
      setEdits({});
      onMsg({ type: 'success', text: `${items.length} nilai komponen disimpan` });
    } catch (e) {
      onMsg({ type: 'danger', text: e instanceof ApiError ? e.message : 'Gagal' });
    } finally { setBusy(false); }
  };

  if (matrix.isLoading) return <PageLoadingSkeleton />;
  if (!matrix.data) return null;

  if (matrix.data.komponen.length === 0) {
    return (
      <Alert variant="info" title="Belum ada komponen evaluasi">
        Definisikan dulu komponen evaluasi di tab <strong>Rancangan Komponen</strong>.
      </Alert>
    );
  }
  if (matrix.data.rows.length === 0) {
    return <Alert variant="info" title="Belum ada mahasiswa">Belum ada mahasiswa yang KRS-nya disetujui di kelas ini.</Alert>;
  }

  const query = q.trim().toLowerCase();
  const rows = query
    ? matrix.data.rows.filter((row) => row.mahasiswa.nim.toLowerCase().includes(query) || row.mahasiswa.nama.toLowerCase().includes(query))
    : matrix.data.rows;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          Input nilai per komponen evaluasi (skala 0–100). Tab atau klik sel untuk edit.
        </p>
        <Button variant="primary" leftIcon={<Save size={16} />} onClick={onSave} disabled={busy || !dirty}>
          {busy ? 'Menyimpan…' : `Simpan ${dirty ? '(ada perubahan)' : ''}`}
        </Button>
      </div>

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
          <Input
            icon={<Search size={16} />}
            placeholder="Cari NIM atau nama…"
            value={q}
            onChange={(e) => setQ((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>
      {rows.length === 0 && (
        <p className="muted">Tidak ada mahasiswa yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <div className="tz-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="tz-table">
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface-card)' }}>NIM</th>
              <th style={{ position: 'sticky', left: 80, background: 'var(--surface-card)' }}>Nama</th>
              {matrix.data.komponen.map((k) => (
                <th key={k.id} className="num" style={{ minWidth: 90 }}>
                  {k.nama}
                  <div className="muted" style={{ fontWeight: 'normal', fontSize: 'var(--text-2xs)' }}>{k.bobotPersen}%</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.krsId}>
                <td className="mono" style={{ position: 'sticky', left: 0, background: 'var(--surface-card)' }}>{row.mahasiswa.nim}</td>
                <td style={{ position: 'sticky', left: 80, background: 'var(--surface-card)' }}>{row.mahasiswa.nama}</td>
                {matrix.data!.komponen.map((k) => {
                  const v = getVal(row, k.id);
                  const isDirty = edits[row.krsId]?.[k.id] !== undefined;
                  return (
                    <td key={k.id} style={{ background: isDirty ? 'color-mix(in oklch, var(--accent), transparent 90%)' : undefined }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        className="mono"
                        style={{ width: 70, padding: '4px 6px', border: '1px solid var(--border-subtle)', borderRadius: 4, fontSize: 'var(--text-sm)' }}
                        value={v != null ? String(v) : ''}
                        onChange={(e) => setVal(row.krsId, k.id, e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
