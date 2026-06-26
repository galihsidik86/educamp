import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Input, Select } from '@/ds';
import { Sparkles, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import {
  useAkm, useAkmActions, useProdi, usePeriode,
  type AkmItem,
} from '@/lib/queries-akademik';

const STATUS_OPTIONS: AkmItem['status'][] = [
  'aktif', 'cuti', 'non_aktif', 'kampus_merdeka', 'mengundurkan_diri', 'lulus', 'drop_out',
];

const STATUS_LABEL: Record<AkmItem['status'], string> = {
  aktif: 'Aktif',
  cuti: 'Cuti',
  non_aktif: 'Non-aktif',
  kampus_merdeka: 'Kampus Merdeka',
  mengundurkan_diri: 'Undur Diri',
  lulus: 'Lulus',
  drop_out: 'Drop Out',
};

const STATUS_VARIANT: Record<AkmItem['status'], 'success' | 'warning' | 'neutral' | 'brand' | 'danger'> = {
  aktif: 'success',
  cuti: 'warning',
  non_aktif: 'neutral',
  kampus_merdeka: 'brand',
  mengundurkan_diri: 'danger',
  lulus: 'brand',
  drop_out: 'danger',
};

export function AkmPage() {
  const prodi = useProdi();
  const periode = usePeriode();
  // Flatten semester list from semua TA
  const semesterList = useMemo(() => {
    return periode.data?.items.flatMap((ta) =>
      ta.semester.map((s) => ({ id: s.id, kode: s.kode, jenis: s.jenis, taKode: ta.kode, isAktif: s.isAktif })),
    ) ?? [];
  }, [periode.data]);
  const semesterAktif = semesterList.find((s) => s.isAktif);

  const [filters, setFilters] = useState({ semesterId: '', prodiId: '', status: '', q: '' });
  // Default ke semester aktif
  const effectiveSemester = filters.semesterId || semesterAktif?.id || '';
  const { data, isLoading, error } = useAkm({
    semesterId: effectiveSemester || undefined,
    prodiId: filters.prodiId || undefined,
    status: filters.status || undefined,
    q: filters.q || undefined,
  });
  const actions = useAkmActions();
  const [editAkm, setEditAkm] = useState<AkmItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const onGenerate = async () => {
    if (!effectiveSemester) {
      setMsg({ type: 'danger', text: 'Pilih semester dulu.' });
      return;
    }
    const semKode = semesterList.find((s) => s.id === effectiveSemester)?.kode;
    if (!confirm(`Generate AKM untuk semester ${semKode}? IPS/IPK/SKS akan dihitung ulang dari Krs+Nilai.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await actions.generate.mutateAsync({
        semesterId: effectiveSemester,
        prodiId: filters.prodiId || undefined,
      });
      setMsg({ type: 'success', text: `${r.processed} mhs diproses · ${r.created} baru · ${r.updated} update` });
    } catch (e) {
      setMsg({ type: 'danger', text: e instanceof ApiError ? e.message : 'Gagal generate' });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Hapus AKM ini?')) return;
    try { await actions.remove.mutateAsync(id); }
    catch (e) { setMsg({ type: 'danger', text: e instanceof ApiError ? e.message : 'Gagal' }); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="PDDIKTI · TAHAP 1"
        title="Aktivitas Kuliah Mahasiswa (AKM)"
        subtitle="Status mhs per semester + IPS, IPK, SKS — dilaporkan ke Neo Feeder. Klik 'Generate' untuk hitung otomatis dari Krs+Nilai."
        right={
          <Button
            variant="primary"
            leftIcon={<Sparkles size={16} />}
            onClick={onGenerate}
            disabled={busy || !effectiveSemester}
          >
            {busy ? 'Menghitung…' : 'Generate AKM Semester'}
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {msg && <Alert variant={msg.type} title={msg.type === 'success' ? 'Berhasil' : 'Gagal'}>{msg.text}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <Select
            label="Semester"
            value={filters.semesterId || semesterAktif?.id || ''}
            onChange={(e) => setFilters({ ...filters, semesterId: (e.target as HTMLSelectElement).value })}
          >
            {semesterList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kode} · {s.jenis} {s.taKode} {s.isAktif ? '(aktif)' : ''}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ minWidth: 220 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input label="Cari NIM/Nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} />
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th><th>Nama</th><th>Prodi</th>
              <th>Status</th>
              <th className="num">IPS</th><th className="num">IPK</th>
              <th className="num">SKS Sem</th><th className="num">SKS Total</th>
              <th>Sync</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && (
              <tr><td colSpan={10} className="muted center">Belum ada AKM. Klik 'Generate' untuk menghitung dari Krs+Nilai.</td></tr>
            )}
            {data?.items.map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.mahasiswa.nim}</td>
                <td>{a.mahasiswa.nama}</td>
                <td className="muted">{a.mahasiswa.prodi.kode}</td>
                <td><Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge></td>
                <td className="num mono">{a.ips != null ? a.ips.toFixed(2) : '—'}</td>
                <td className="num mono">{a.ipk != null ? a.ipk.toFixed(2) : '—'}</td>
                <td className="num mono">{a.sksSemester ?? '—'}</td>
                <td className="num mono">{a.sksTotal ?? '—'}</td>
                <td>
                  {a.feederId
                    ? <span className="pill pill--success" title={a.lastSyncedAt ?? ''}>tersinkron</span>
                    : <span className="pill pill--neutral">pending</span>}
                </td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditAkm(a)}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(a.id)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editAkm && (
        <AkmEditModal
          akm={editAkm}
          onClose={() => setEditAkm(null)}
          onSaved={() => { setEditAkm(null); setMsg({ type: 'success', text: 'AKM diperbarui' }); }}
        />
      )}
    </div>
  );
}

function AkmEditModal({ akm, onClose, onSaved }: { akm: AkmItem; onClose: () => void; onSaved: () => void }) {
  const actions = useAkmActions();
  const [form, setForm] = useState({
    status: akm.status,
    ips: akm.ips ?? null,
    ipk: akm.ipk ?? null,
    sksSemester: akm.sksSemester ?? null,
    sksTotal: akm.sksTotal ?? null,
    biayaKuliah: akm.biayaKuliah ?? null,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const num = (v: string) => v === '' ? null : Number(v);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await actions.update.mutateAsync({ id: akm.id, patch: form });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Edit AKM · ${akm.mahasiswa.nim}`} width={520}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          {akm.mahasiswa.nama} · {akm.semester.kode} ({akm.semester.jenis})
        </div>
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AkmItem['status'] })}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="IPS"
              type="number"
              step="0.01"
              min={0}
              max={4}
              value={form.ips != null ? String(form.ips) : ''}
              onChange={(e) => setForm({ ...form, ips: num((e.target as HTMLInputElement).value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="IPK"
              type="number"
              step="0.01"
              min={0}
              max={4}
              value={form.ipk != null ? String(form.ipk) : ''}
              onChange={(e) => setForm({ ...form, ipk: num((e.target as HTMLInputElement).value) })}
            />
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="SKS Semester"
              type="number"
              min={0}
              value={form.sksSemester != null ? String(form.sksSemester) : ''}
              onChange={(e) => setForm({ ...form, sksSemester: num((e.target as HTMLInputElement).value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="SKS Total"
              type="number"
              min={0}
              value={form.sksTotal != null ? String(form.sksTotal) : ''}
              onChange={(e) => setForm({ ...form, sksTotal: num((e.target as HTMLInputElement).value) })}
            />
          </div>
        </div>
        <Input
          label="Biaya Kuliah (Rp)"
          type="number"
          min={0}
          value={form.biayaKuliah != null ? String(form.biayaKuliah) : ''}
          onChange={(e) => setForm({ ...form, biayaKuliah: num((e.target as HTMLInputElement).value) })}
        />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
