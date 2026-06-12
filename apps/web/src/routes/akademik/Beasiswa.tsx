import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useAdminBeasiswa, useAdminBeasiswaActions, type BeasiswaMasterItem, type BeasiswaMasterInput } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AdminBeasiswaPage() {
  const { data, isLoading, error } = useAdminBeasiswa();
  const { create, update, remove } = useAdminBeasiswaActions();
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: BeasiswaMasterItem } | null>(null);

  const onDelete = async (b: BeasiswaMasterItem) => {
    if (!confirm(`Hapus beasiswa ${b.kode}?`)) return;
    try { await remove.mutateAsync(b.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Kelola Beasiswa"
        subtitle="Master beasiswa + verifikasi pendaftar."
        right={<Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setModal({ mode: 'create' })}>Beasiswa Baru</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada beasiswa">Klik "Beasiswa Baru" untuk menambahkan.</Alert>
      )}

      <div className="stack">
        {data?.items.map((b) => (
          <Card key={b.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{b.nama}</strong>
                  <span className="pill pill--neutral mono">{b.kode}</span>
                  {b.pendaftaranBuka
                    ? <span className="pill pill--success">Buka</span>
                    : <span className="pill pill--neutral">Tutup</span>}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{b.penyelenggara}</div>
                {b.deskripsi && <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{b.deskripsi}</p>}
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
                  Nominal: <strong style={{ color: 'var(--text-default)', fontFamily: 'var(--font-mono)' }}>{formatRupiah(b.nominal)}</strong>
                  {b.kuota != null && <> · Kuota: <span className="mono">{b.kuota}</span></>}
                  {b.syaratIpk != null && <> · IPK ≥ <span className="mono">{b.syaratIpk.toFixed(2)}</span></>}
                  {b.syaratAngkatanMin != null && <> · Angkatan ≥ <span className="mono">{b.syaratAngkatanMin}</span></>}
                  {b.tanggalTutup && <> · Tutup {formatTanggal(b.tanggalTutup)}</>}
                  {' · '}{b.jumlahPendaftar} pendaftar
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Link
                  to={`/akademik/beasiswa/${b.id}/pendaftar`}
                  className="tz-btn tz-btn--secondary tz-btn--sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Users size={14} /> Pendaftar
                </Link>
                <Button size="sm" variant="ghost" leftIcon={<Pencil size={14} />} onClick={() => setModal({ mode: 'edit', item: b })}>Edit</Button>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={14} />} onClick={() => onDelete(b)}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <BeasiswaModal
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

function BeasiswaModal({ mode, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: BeasiswaMasterItem;
  onClose: () => void;
  onSubmit: (input: BeasiswaMasterInput, id?: string) => void;
}) {
  const [form, setForm] = useState<BeasiswaMasterInput>({
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
    penyelenggara: initial?.penyelenggara ?? '',
    deskripsi: initial?.deskripsi ?? '',
    kuota: initial?.kuota ?? null,
    nominal: initial?.nominal ?? 0,
    syaratIpk: initial?.syaratIpk ?? null,
    syaratAngkatanMin: initial?.syaratAngkatanMin ?? null,
    syaratAngkatanMax: initial?.syaratAngkatanMax ?? null,
    pendaftaranBuka: initial?.pendaftaranBuka ?? true,
    tanggalBuka: initial?.tanggalBuka?.slice(0, 10) ?? '',
    tanggalTutup: initial?.tanggalTutup?.slice(0, 10) ?? '',
  });

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Beasiswa baru' : `Edit ${initial!.kode}`} width={680}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value.toUpperCase() })} placeholder="BIDIKMISI-2026-1" /></div>
          <div style={{ flex: 2 }}><Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} /></div>
        </div>
        <Input label="Penyelenggara" value={form.penyelenggara} onChange={(e) => setForm({ ...form, penyelenggara: (e.target as HTMLInputElement).value })} placeholder="Kemendikbud / Tazkia Foundation" />
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Deskripsi (opsional)</label>
          <textarea
            value={form.deskripsi ?? ''}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Nominal (Rp)" type="number" value={form.nominal.toString()} onChange={(e) => setForm({ ...form, nominal: Number((e.target as HTMLInputElement).value) })} /></div>
          <div style={{ flex: 1 }}><Input label="Kuota (kosong = tak terbatas)" type="number" value={form.kuota?.toString() ?? ''} onChange={(e) => setForm({ ...form, kuota: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null })} /></div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Syarat IPK minimal" type="number" step="0.01" value={form.syaratIpk?.toString() ?? ''} onChange={(e) => setForm({ ...form, syaratIpk: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null })} /></div>
          <div style={{ flex: 1 }}><Input label="Angkatan min" type="number" value={form.syaratAngkatanMin?.toString() ?? ''} onChange={(e) => setForm({ ...form, syaratAngkatanMin: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null })} /></div>
          <div style={{ flex: 1 }}><Input label="Angkatan max" type="number" value={form.syaratAngkatanMax?.toString() ?? ''} onChange={(e) => setForm({ ...form, syaratAngkatanMax: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null })} /></div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Tanggal buka" type="date" value={form.tanggalBuka ?? ''} onChange={(e) => setForm({ ...form, tanggalBuka: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="Tanggal tutup" type="date" value={form.tanggalTutup ?? ''} onChange={(e) => setForm({ ...form, tanggalTutup: (e.target as HTMLInputElement).value })} /></div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={!!form.pendaftaranBuka} onChange={(e) => setForm({ ...form, pendaftaranBuka: e.target.checked })} />
          Pendaftaran dibuka
        </label>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" onClick={() => onSubmit(form, initial?.id)}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
