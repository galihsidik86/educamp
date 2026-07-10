import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Plus, Trash2, ClipboardEdit, Wallet } from 'lucide-react';
import { useKategoriUkt, useKategoriUktActions, useProdiRef, type KategoriUkt } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { TableSkeletonRows } from '@/components/Skeleton';
import { formatRupiah } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AkademikTarifUkt() {
  const [prodiFilter, setProdiFilter] = useState('');
  const { data, isLoading, error } = useKategoriUkt(prodiFilter || undefined);
  const prodi = useProdiRef();
  const actions = useKategoriUktActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<KategoriUkt | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA · KEUANGAN"
        title="Tarif UKT (Uang Kuliah Tunggal)"
        subtitle="Kelola kategori/kelompok UKT per program studi. Mahasiswa akan di-assign ke salah satu kategori sesuai kemampuan ekonomi atau jalur masuk."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Tambah Kategori UKT
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <Select label="Filter Prodi" value={prodiFilter} onChange={(e) => setProdiFilter((e.target as HTMLSelectElement).value)}>
            <option value="">Semua prodi</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>)}
          </Select>
        </div>
      </div>

      {data && data.items.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
            <Wallet size={28} className="muted" />
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Belum ada kategori UKT.</p>
          </div>
        </Card>
      )}
      {(isLoading || (data && data.items.length > 0)) && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Prodi</th>
                <th>Kode</th>
                <th>Nama Kategori</th>
                <th className="num">UKT / Semester</th>
                <th className="num">Mahasiswa</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeletonRows cols={7} rows={5} />}
              {data?.items.map((k) => (
                <tr key={k.id}>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{k.prodi.kode}<div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{k.prodi.nama}</div></td>
                  <td className="mono"><strong>{k.kode}</strong></td>
                  <td>{k.nama}{k.deskripsi && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{k.deskripsi}</div>}</td>
                  <td className="num mono"><strong>{formatRupiah(k.nominalSemester)}</strong></td>
                  <td className="num mono">{k._count.mahasiswa}</td>
                  <td><Badge variant={k.isAktif ? 'success' : 'neutral'} dot>{k.isAktif ? 'Aktif' : 'Non-aktif'}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" leftIcon={<ClipboardEdit size={14} />} onClick={() => setEditFor(k)}>Edit</Button>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => {
                      if (!confirm(`Hapus kategori ${k.kode}?`)) return;
                      actions.remove.mutate(k.id, { onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal') });
                    }}>Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KategoriUktModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(body) => actions.create.mutate(body, {
          onSuccess: () => setCreateOpen(false),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
        })}
        title="Tambah Kategori UKT"
      />
      <KategoriUktModal
        open={!!editFor}
        onClose={() => setEditFor(null)}
        initial={editFor ?? undefined}
        onSubmit={(body) => editFor && actions.update.mutate({ id: editFor.id, patch: body }, {
          onSuccess: () => setEditFor(null),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
        })}
        title="Edit Kategori UKT"
      />
    </div>
  );
}

function KategoriUktModal({ open, onClose, onSubmit, initial, title }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { prodiId: string; kode: string; nama: string; nominalSemester: number; deskripsi?: string; isAktif?: boolean }) => void;
  initial?: KategoriUkt;
  title: string;
}) {
  const prodi = useProdiRef();
  const [form, setForm] = useState({
    prodiId: initial?.prodiId ?? '',
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
    nominalSemester: initial?.nominalSemester != null ? String(initial.nominalSemester) : '',
    deskripsi: initial?.deskripsi ?? '',
    isAktif: initial?.isAktif ?? true,
  });
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} width={560}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            prodiId: form.prodiId,
            kode: form.kode,
            nama: form.nama,
            nominalSemester: Number(form.nominalSemester),
            deskripsi: form.deskripsi || undefined,
            isAktif: form.isAktif,
          });
        }}
      >
        <Select label="Prodi" value={form.prodiId} onChange={(e) => setForm({ ...form, prodiId: (e.target as HTMLSelectElement).value })} required>
          <option value="">Pilih prodi…</option>
          {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>)}
        </Select>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} required placeholder="UKT-1, MANDIRI" />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama Kategori" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} required placeholder="Kelompok I (Ekonomi Menengah ke Bawah)" />
          </div>
        </div>
        <Input
          label="Nominal UKT per Semester (Rp)"
          type="number"
          value={form.nominalSemester}
          onChange={(e) => setForm({ ...form, nominalSemester: (e.target as HTMLInputElement).value })}
          required
          placeholder="4500000"
        />
        <Input label="Deskripsi (opsional)" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: (e.target as HTMLInputElement).value })} placeholder="Kriteria penghasilan keluarga / jalur masuk" />
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={form.isAktif} onChange={(e) => setForm({ ...form, isAktif: e.target.checked })} />
          <span>Aktif (dapat di-assign ke mahasiswa baru)</span>
        </label>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
