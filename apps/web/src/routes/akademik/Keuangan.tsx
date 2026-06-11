import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Trash2, Receipt, Users } from 'lucide-react';
import {
  useAkademikTagihan, useKeuanganActions, useProdi, usePeriode,
  type AkademikTagihan, type BulkTagihanInput, type PembayaranInput,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatRupiah, formatTanggal, formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS = ['spp', 'pembangunan', 'praktikum', 'wisuda', 'ujian', 'lainnya'] as const;
const METODE: PembayaranInput['metode'][] = ['transfer_bank', 'va', 'tunai', 'qris', 'ewallet'];

export function AdminKeuangan() {
  const [filters, setFilters] = useState({ status: '', q: '' });
  const { data, isLoading, error } = useAkademikTagihan(filters);
  const actions = useKeuanganActions();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<AkademikTagihan | null>(null);

  const onDelete = async (t: AkademikTagihan) => {
    if (!confirm(`Hapus tagihan ${t.deskripsi} untuk ${t.mahasiswa.nim}?`)) return;
    try { await actions.deleteTagihan.mutateAsync(t.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Keuangan"
        subtitle="Kelola tagihan & verifikasi pembayaran."
        right={
          <Button variant="primary" leftIcon={<Users size={16} />} onClick={() => setBulkOpen(true)}>
            Tagihan Bulk
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Cari NIM/Nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="cicil">Cicil</option>
            <option value="lunas">Lunas</option>
            <option value="jatuh_tempo">Jatuh Tempo</option>
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th><th>Mahasiswa</th><th>Tagihan</th>
              <th>Semester</th>
              <th className="num">Jumlah</th>
              <th className="num">Dibayar</th><th className="num">Sisa</th>
              <th>Jatuh Tempo</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={10} className="muted center">Tidak ada tagihan.</td></tr>}
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.mahasiswa.nim}</td>
                <td>{t.mahasiswa.nama}<div className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{t.mahasiswa.prodi.nama}</div></td>
                <td>{t.deskripsi}<div className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{formatStatus(t.jenis)}</div></td>
                <td className="mono" style={{ textTransform: 'capitalize' }}>{t.semester}</td>
                <td className="num">{formatRupiah(t.jumlah)}</td>
                <td className="num">{formatRupiah(t.dibayar)}</td>
                <td className="num"><strong>{formatRupiah(t.sisa)}</strong></td>
                <td>{formatTanggal(t.jatuhTempo)}</td>
                <td><StatusPill status={t.status} /></td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    {t.sisa > 0 && (
                      <Button size="sm" variant="secondary" leftIcon={<Receipt size={12} />} onClick={() => setPayTarget(t)}>Bayar</Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(t)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bulkOpen && <BulkModal onClose={() => setBulkOpen(false)} />}
      {payTarget && <PembayaranModal tagihan={payTarget} onClose={() => setPayTarget(null)} />}
    </div>
  );
}

function BulkModal({ onClose }: { onClose: () => void }) {
  const periode = usePeriode();
  const prodi = useProdi();
  const aktif = periode.data?.items.flatMap((ta) => ta.semester).find((s) => s.isAktif);
  const actions = useKeuanganActions();
  const [form, setForm] = useState<Partial<BulkTagihanInput>>({
    semesterId: aktif?.id ?? '',
    jenis: 'spp',
    deskripsi: 'SPP Semester',
    jumlah: 4500000,
    jatuhTempo: '',
    prodiId: undefined,
    angkatan: undefined,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const r: any = await actions.createBulk.mutateAsync(form as BulkTagihanInput);
      alert(`Berhasil membuat ${r.created} tagihan`);
      onClose();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Buat Tagihan Bulk" width={640}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <Select label="Semester" required value={form.semesterId ?? ''} onChange={(e) => setForm({ ...form, semesterId: (e.target as HTMLSelectElement).value })}>
          {periode.data?.items.flatMap((ta) => ta.semester.map((s) => (
            <option key={s.id} value={s.id}>{s.jenis} {ta.kode} ({s.kode}){s.isAktif ? ' · aktif' : ''}</option>
          )))}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Jenis" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value })}>
              {JENIS.map((j) => <option key={j} value={j}>{formatStatus(j)}</option>)}
            </Select>
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Deskripsi" required value={form.deskripsi ?? ''} onChange={(e) => setForm({ ...form, deskripsi: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Jumlah (Rp)" type="number" min={0} required value={String(form.jumlah ?? '')} onChange={(e) => setForm({ ...form, jumlah: Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jatuh Tempo" type="date" required value={form.jatuhTempo ?? ''} onChange={(e) => setForm({ ...form, jatuhTempo: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 2 }}>
            <Select label="Filter prodi (opsional)" value={form.prodiId ?? ''} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value || undefined })}>
              <option value="">Semua prodi</option>
              {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Angkatan" type="number" value={form.angkatan ? String(form.angkatan) : ''} onChange={(e) => setForm({ ...form, angkatan: (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : undefined })} />
          </div>
        </div>

        <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
          Tagihan akan dibuat untuk semua <strong>mahasiswa aktif</strong> yang cocok filter.
        </p>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy} leftIcon={<Plus size={14} />}>
            {busy ? 'Membuat…' : 'Buat Tagihan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PembayaranModal({ tagihan, onClose }: { tagihan: AkademikTagihan; onClose: () => void }) {
  const actions = useKeuanganActions();
  const [form, setForm] = useState<Partial<PembayaranInput>>({
    tagihanId: tagihan.id,
    jumlah: tagihan.sisa,
    tanggalBayar: new Date().toISOString().slice(0, 10),
    metode: 'transfer_bank',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await actions.createPembayaran.mutateAsync(form as PembayaranInput);
      onClose();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Catat Pembayaran — ${tagihan.mahasiswa.nim}`} width={520}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Tagihan</div>
          <div><strong>{tagihan.deskripsi}</strong></div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            Total {formatRupiah(tagihan.jumlah)} · Sisa <strong style={{ color: 'var(--danger-fg)' }}>{formatRupiah(tagihan.sisa)}</strong>
          </div>
        </Card>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Jumlah (Rp)" type="number" min={1} max={tagihan.sisa} required value={String(form.jumlah ?? 0)} onChange={(e) => setForm({ ...form, jumlah: Number((e.target as HTMLInputElement).value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tanggal Bayar" type="date" required value={form.tanggalBayar ?? ''} onChange={(e) => setForm({ ...form, tanggalBayar: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <Select label="Metode" value={form.metode} onChange={(e) => setForm({ ...form, metode: (e.target as HTMLSelectElement).value as PembayaranInput['metode'] })}>
          {METODE.map((m) => <option key={m} value={m}>{formatStatus(m)}</option>)}
        </Select>

        <Input label="URL bukti (opsional)" type="url" value={form.buktiUrl ?? ''} onChange={(e) => setForm({ ...form, buktiUrl: (e.target as HTMLInputElement).value || undefined })} />

        <div>
          <label className="tz-field__label">Catatan (opsional)</label>
          <textarea
            value={form.catatan ?? ''}
            onChange={(e) => setForm({ ...form, catatan: e.target.value || undefined })}
            className="tz-input"
            style={{ width: '100%', minHeight: 60, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} type="button">Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Mencatat…' : 'Catat Pembayaran'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
