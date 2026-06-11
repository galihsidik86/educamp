import { useMemo, useState } from 'react';
import { Alert, Button, Input, Select } from '@/ds';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useKelasAdmin, useKelasActions, useMataKuliah, useAdminDosen,
  useRuangan, usePeriode,
  type Kelas, type KelasInput,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import { capitalize } from '@/lib/format';

const HARI = ['', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'] as const;

export function AdminKelas() {
  const periode = usePeriode();
  const aktif = useMemo(() => periode.data?.items.flatMap((ta) => ta.semester).find((s) => s.isAktif), [periode.data]);
  const [semesterId, setSemesterId] = useState<string>('');
  const semIdEff = semesterId || aktif?.id || '';

  const { data, isLoading, error } = useKelasAdmin({ semesterId: semIdEff });
  const actions = useKelasActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; kelas: Kelas } | null>(null);

  const onDelete = async (k: Kelas) => {
    if (!confirm(`Hapus kelas ${k.mataKuliah.kode} ${k.kodeKelas}?`)) return;
    try { await actions.remove.mutateAsync(k.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="KURIKULUM"
        title="Kelas (Penawaran)"
        subtitle="Kelola kelas per semester — assign MK, dosen, ruangan, jadwal."
        right={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setModal({ mode: 'create' })}>Tambah Kelas</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <Select label="Semester" value={semIdEff} onChange={(e) => setSemesterId((e.target as HTMLSelectElement).value)}>
            {periode.data?.items.flatMap((ta) =>
              ta.semester.map((s) => (
                <option key={s.id} value={s.id}>{s.jenis} {ta.kode} ({s.kode}){s.isAktif ? ' · aktif' : ''}</option>
              )),
            )}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode MK</th><th>Mata Kuliah</th>
              <th className="center">SKS</th><th>Kelas</th>
              <th>Dosen</th><th>Jadwal</th><th>Ruang</th>
              <th className="num">Peserta/Kap</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Belum ada kelas.</td></tr>}
            {data?.items.map((k) => (
              <tr key={k.id}>
                <td className="mono">{k.mataKuliah.kode}</td>
                <td>{k.mataKuliah.nama}</td>
                <td className="num">{k.mataKuliah.sks}</td>
                <td>{k.kodeKelas}</td>
                <td>{[k.dosen.gelarDepan, k.dosen.nama, k.dosen.gelarBelakang].filter(Boolean).join(' ')}</td>
                <td className="mono">
                  {k.hari ? `${capitalize(k.hari)}, ${k.jamMulai}–${k.jamSelesai}` : '—'}
                </td>
                <td className="mono">{k.ruangan?.kode ?? '—'}</td>
                <td className="num">{k._count.krs}/{k.kapasitas}</td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', kelas: k })}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(k)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <KelasModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.kelas : undefined}
          defaultSemesterId={semIdEff}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            if (id) await actions.update.mutateAsync({ id, patch: input });
            else await actions.create.mutateAsync(input as KelasInput);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function KelasModal({ mode, initial, defaultSemesterId, onClose, onSubmit }: {
  mode: 'create' | 'edit'; initial?: Kelas; defaultSemesterId: string;
  onClose: () => void;
  onSubmit: (input: Partial<KelasInput>, id?: string) => Promise<void>;
}) {
  const mk = useMataKuliah();
  const dosen = useAdminDosen();
  const ruangan = useRuangan();
  const periode = usePeriode();

  const [form, setForm] = useState<Partial<KelasInput>>({
    mataKuliahId: initial?.mataKuliahId ?? '',
    semesterId: initial?.semesterId ?? defaultSemesterId,
    dosenId: initial?.dosenId ?? '',
    ruanganId: initial?.ruanganId ?? null,
    kodeKelas: initial?.kodeKelas ?? 'A',
    kapasitas: initial?.kapasitas ?? 40,
    hari: (initial?.hari as KelasInput['hari']) ?? null,
    jamMulai: initial?.jamMulai ?? '08:00',
    jamSelesai: initial?.jamSelesai ?? '09:40',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const patch: any = { ...form };
      if (patch.ruanganId === '') patch.ruanganId = null;
      if (patch.hari === '') patch.hari = null;
      await onSubmit(patch, mode === 'edit' ? initial!.id : undefined);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah Kelas' : 'Edit Kelas'} width={700}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <Select label="Mata Kuliah" required value={form.mataKuliahId ?? ''} onChange={(e) => setForm({ ...form, mataKuliahId: (e.target as HTMLSelectElement).value })} disabled={mode === 'edit'}>
          <option value="">— pilih MK —</option>
          {mk.data?.items.map((m) => <option key={m.id} value={m.id}>{m.kode} — {m.nama} ({m.sks} SKS)</option>)}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Select label="Semester" required value={form.semesterId ?? ''} onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value })} disabled={mode === 'edit'}>
              {periode.data?.items.flatMap((ta) =>
                ta.semester.map((s) => <option key={s.id} value={s.id}>{s.jenis} {ta.kode} ({s.kode})</option>),
              )}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Kode Kelas" required value={form.kodeKelas ?? ''} onChange={(e) => setForm({ ...form, kodeKelas: (e.target as HTMLInputElement).value })} placeholder="A" disabled={mode === 'edit'} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Kapasitas" type="number" min={1} value={String(form.kapasitas ?? 40)} onChange={(e) => setForm({ ...form, kapasitas: Number((e.target as HTMLInputElement).value) })} />
          </div>
        </div>

        <Select label="Dosen Pengampu" required value={form.dosenId ?? ''} onChange={(e) => setForm({ ...form, dosenId: (e.target as HTMLSelectElement).value })}>
          <option value="">— pilih dosen —</option>
          {dosen.data?.items.map((d) => (
            <option key={d.id} value={d.id}>{[d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ')} ({d.nidn})</option>
          ))}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Select label="Ruangan" value={form.ruanganId ?? ''} onChange={(e) => setForm({ ...form, ruanganId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— tanpa ruangan —</option>
              {ruangan.data?.items.map((r) => <option key={r.id} value={r.id}>{r.kode} — {r.nama}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Hari" value={form.hari ?? ''} onChange={(e) => setForm({ ...form, hari: ((e.target as HTMLSelectElement).value || null) as any })}>
              {HARI.map((h) => <option key={h} value={h}>{h ? capitalize(h) : '— pilih hari —'}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jam Mulai" type="time" value={form.jamMulai ?? ''} onChange={(e) => setForm({ ...form, jamMulai: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jam Selesai" type="time" value={form.jamSelesai ?? ''} onChange={(e) => setForm({ ...form, jamSelesai: (e.target as HTMLInputElement).value })} />
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
