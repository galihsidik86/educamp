import { useMemo, useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { TableSkeletonRows } from '@/components/Skeleton';
import { ApiError } from '@/lib/api';
import {
  useDayaTampung, useDayaTampungActions, useProdi, usePeriode,
  type DayaTampungItem, type DayaTampungInput,
} from '@/lib/queries-akademik';

export function DayaTampungPage() {
  const prodi = useProdi();
  const periode = usePeriode();
  const semesterList = useMemo(() => {
    return periode.data?.items.flatMap((ta) =>
      ta.semester.map((s) => ({ id: s.id, kode: s.kode, jenis: s.jenis, taKode: ta.kode, isAktif: s.isAktif })),
    ) ?? [];
  }, [periode.data]);

  const [filters, setFilters] = useState({ prodiId: '', semesterId: '' });
  const { data, isLoading, error } = useDayaTampung({
    prodiId: filters.prodiId || undefined,
    semesterId: filters.semesterId || undefined,
  });
  const actions = useDayaTampungActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: DayaTampungItem } | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm('Hapus daya tampung ini?')) return;
    try { await actions.remove.mutateAsync(id); setMsg({ type: 'success', text: 'Dihapus' }); }
    catch (e) { setMsg({ type: 'danger', text: e instanceof ApiError ? e.message : 'Gagal' }); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="PDDIKTI · TAHAP 1"
        title="Daya Tampung Prodi"
        subtitle="Kuota penerimaan mahasiswa baru per prodi per periode. Dilaporkan ke Neo Feeder sebelum perkuliahan dimulai."
        right={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>
            Tambah
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {msg && <Alert variant={msg.type} title={msg.type === 'success' ? 'Berhasil' : 'Gagal'}>{msg.text}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <Select label="Periode" value={filters.semesterId} onChange={(e) => setFilters({ ...filters, semesterId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {semesterList.map((s) => <option key={s.id} value={s.id}>{s.kode} · {s.jenis} {s.taKode}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 220 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Prodi</th>
              <th className="num">Daya Tampung</th>
              <th className="num">Pendaftar</th>
              <th className="num">Lulus Seleksi</th>
              <th className="num">Registrasi</th>
              <th>Sync</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows cols={8} rows={5} />}
            {data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Belum ada data.</td></tr>}
            {data?.items.map((d) => (
              <tr key={d.id}>
                <td className="mono">{d.semester.kode}</td>
                <td>
                  <strong>{d.prodi.kode}</strong> · {d.prodi.nama}
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{d.prodi.jenjang.toUpperCase()}</div>
                </td>
                <td className="num mono">{d.dayaTampung}</td>
                <td className="num mono">{d.jumlahDaftar ?? '—'}</td>
                <td className="num mono">{d.jumlahLulusSeleksi ?? '—'}</td>
                <td className="num mono">{d.jumlahRegistrasi ?? '—'}</td>
                <td>{d.feederId ? <span className="pill pill--success">sync</span> : <span className="pill pill--neutral">pending</span>}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', item: d })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(d.id)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <DayaTampungModal
          initial={modal.mode === 'edit' ? modal.item : undefined}
          semesterList={semesterList}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            if (modal.mode === 'edit') {
              await actions.update.mutateAsync({ id: modal.item.id, patch: input });
            } else {
              await actions.create.mutateAsync(input as DayaTampungInput);
            }
            setModal(null);
            setMsg({ type: 'success', text: 'Tersimpan' });
          }}
        />
      )}
    </div>
  );
}

function DayaTampungModal({ initial, semesterList, onClose, onSubmit }: {
  initial?: DayaTampungItem;
  semesterList: Array<{ id: string; kode: string; jenis: string; taKode: string; isAktif: boolean }>;
  onClose: () => void;
  onSubmit: (input: DayaTampungInput | Partial<DayaTampungInput>) => Promise<void>;
}) {
  const prodi = useProdi();
  const [form, setForm] = useState<Partial<DayaTampungInput>>({
    prodiId: initial?.prodiId ?? '',
    semesterId: initial?.semesterId ?? semesterList.find((s) => s.isAktif)?.id ?? '',
    dayaTampung: initial?.dayaTampung ?? 0,
    jumlahDaftar: initial?.jumlahDaftar ?? null,
    jumlahLulusSeleksi: initial?.jumlahLulusSeleksi ?? null,
    jumlahRegistrasi: initial?.jumlahRegistrasi ?? null,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const num = (v: string) => v === '' ? null : Number(v);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await onSubmit(form);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Daya Tampung' : 'Tambah Daya Tampung'} width={560}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select
              label="Prodi"
              required
              value={form.prodiId ?? ''}
              onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value })}
              disabled={!!initial}
            >
              <option value="">— pilih —</option>
              {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select
              label="Periode (Semester awal)"
              required
              value={form.semesterId ?? ''}
              onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value })}
              disabled={!!initial}
            >
              <option value="">— pilih —</option>
              {semesterList.map((s) => <option key={s.id} value={s.id}>{s.kode} · {s.jenis} {s.taKode}</option>)}
            </Select>
          </div>
        </div>

        <Input
          label="Daya tampung (jumlah kursi)"
          type="number"
          required
          min={0}
          value={String(form.dayaTampung ?? 0)}
          onChange={(e) => setForm({ ...form, dayaTampung: Number((e.target as HTMLInputElement).value) })}
        />

        <div className="form-section">
          <h4>Realisasi (opsional)</h4>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
            Diisi setelah seleksi & registrasi selesai. Dilaporkan ke PDDikti pada akhir Tahap 1.
          </p>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <Input label="Jumlah pendaftar" type="number" min={0}
                value={form.jumlahDaftar != null ? String(form.jumlahDaftar) : ''}
                onChange={(e) => setForm({ ...form, jumlahDaftar: num((e.target as HTMLInputElement).value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Lulus seleksi" type="number" min={0}
                value={form.jumlahLulusSeleksi != null ? String(form.jumlahLulusSeleksi) : ''}
                onChange={(e) => setForm({ ...form, jumlahLulusSeleksi: num((e.target as HTMLInputElement).value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Registrasi ulang" type="number" min={0}
                value={form.jumlahRegistrasi != null ? String(form.jumlahRegistrasi) : ''}
                onChange={(e) => setForm({ ...form, jumlahRegistrasi: num((e.target as HTMLInputElement).value) })} />
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
}
