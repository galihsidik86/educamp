import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import { usePeriodeWisuda, usePeriodeWisudaActions, type PeriodeWisudaItem, type PeriodeWisudaInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

export function AdminPeriodeWisuda() {
  const { data, isLoading, error } = usePeriodeWisuda();
  const { create, update, remove } = usePeriodeWisudaActions();

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: PeriodeWisudaItem } | null>(null);

  const onDelete = async (p: PeriodeWisudaItem) => {
    if (!confirm(`Hapus periode wisuda ${p.kode}?`)) return;
    try { await remove.mutateAsync(p.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const togglePendaftaran = async (p: PeriodeWisudaItem) => {
    try { await update.mutateAsync({ id: p.id, patch: { isPendaftaranBuka: !p.isPendaftaranBuka } }); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Periode Wisuda"
        subtitle="Atur jadwal wisuda dan syarat pendaftaran yudisium."
        right={<Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setModal({ mode: 'create' })}>Periode Baru</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada periode">Klik "Periode Baru" untuk menambahkan jadwal wisuda.</Alert>
      )}

      <div className="stack">
        {data?.items.map((p) => (
          <Card key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{p.nama}</strong>
                  <span className="pill pill--neutral mono">{p.kode}</span>
                  {p.isPendaftaranBuka
                    ? <span className="pill pill--success">Pendaftaran buka</span>
                    : <span className="pill pill--neutral">Pendaftaran tutup</span>}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  Tanggal wisuda: {formatTanggal(p.tanggal)}
                  {p.batasIpk != null && ` · Syarat IPK ≥ ${p.batasIpk.toFixed(2)}`}
                  {p.batasSks != null && ` · SKS ≥ ${p.batasSks}`}
                  {' · '}{p._count.yudisium} pendaftar
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" leftIcon={<Power size={14} />} onClick={() => togglePendaftaran(p)}>
                  {p.isPendaftaranBuka ? 'Tutup' : 'Buka'}
                </Button>
                <Button size="sm" variant="ghost" leftIcon={<Pencil size={14} />} onClick={() => setModal({ mode: 'edit', item: p })}>Edit</Button>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => onDelete(p)}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <PeriodeModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            try {
              if (id) await update.mutateAsync({ id, patch: input });
              else await create.mutateAsync(input);
              setModal(null);
            } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
          }}
        />
      )}
    </div>
  );
}

function PeriodeModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: PeriodeWisudaItem;
  onClose: () => void;
  onSubmit: (input: PeriodeWisudaInput, id?: string) => void;
}) {
  const [form, setForm] = useState<PeriodeWisudaInput>({
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
    tanggal: initial?.tanggal.slice(0, 10) ?? '',
    isPendaftaranBuka: initial?.isPendaftaranBuka ?? true,
    batasIpk: initial?.batasIpk ?? null,
    batasSks: initial?.batasSks ?? null,
  });
  const [actErr, setActErr] = useState<string | null>(null);

  const submit = () => {
    setActErr(null);
    if (!/^\d{4}-\d$/.test(form.kode)) { setActErr('Kode harus format YYYY-N (mis. 2026-1)'); return; }
    if (!form.tanggal) { setActErr('Tanggal wajib diisi'); return; }
    onSubmit(form, initial?.id);
  };

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Periode wisuda baru' : `Edit ${initial!.kode}`} width={520}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Kode (YYYY-N)" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} placeholder="2026-1" /></div>
          <div style={{ flex: 1 }}><Input label="Tanggal wisuda" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: (e.target as HTMLInputElement).value })} /></div>
        </div>
        <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} placeholder="Wisuda Periode I 2026" />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Batas IPK minimal" type="number" step="0.01" value={form.batasIpk?.toString() ?? ''} onChange={(e) => setForm({ ...form, batasIpk: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null })} placeholder="2.00" /></div>
          <div style={{ flex: 1 }}><Input label="Batas SKS minimal" type="number" value={form.batasSks?.toString() ?? ''} onChange={(e) => setForm({ ...form, batasSks: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null })} placeholder="144" /></div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={!!form.isPendaftaranBuka} onChange={(e) => setForm({ ...form, isPendaftaranBuka: e.target.checked })} />
          Pendaftaran dibuka
        </label>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" onClick={submit}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
