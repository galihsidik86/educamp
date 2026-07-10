import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAdminKkn, useAdminKknActions, useAdminDosen, type AdminKknItem, type AdminKknPatch } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS = ['pendaftaran', 'ditugaskan', 'berjalan', 'selesai'] as const;

export function AdminKknPage() {
  const [filters, setFilters] = useState({ periode: '', status: '' });
  const { data, isLoading, error } = useAdminKkn(filters);
  const [editing, setEditing] = useState<AdminKknItem | null>(null);
  const { update, remove } = useAdminKknActions();
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((k) =>
      k.mahasiswa.nim.toLowerCase().includes(query) ||
      k.mahasiswa.nama.toLowerCase().includes(query) ||
      k.lokasi.toLowerCase().includes(query),
    );
  }, [data, q]);

  const onDelete = async (k: AdminKknItem) => {
    if (!confirm(`Hapus KKN ${k.mahasiswa.nim} (${k.periode})?`)) return;
    try { await remove.mutateAsync(k.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead eyebrow="OPERASIONAL" title="Kelola KKN" subtitle="Pendaftaran, penugasan DPL, jadwal, dan nilai KKN." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Periode" value={filters.periode} onChange={(e) => setFilters({ ...filters, periode: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua periode</option>
            {data?.periodeList.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        {data && data.items.length > 0 && (
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari NIM, nama, atau lokasi…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pendaftaran">Belum ada mahasiswa yang mendaftar KKN.</Alert>
      )}
      {data && data.items.length > 0 && items.length === 0 && (
        <p className="muted">Tidak ada KKN yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>NIM</th>
              <th>Nama</th>
              <th>Prodi</th>
              <th>Lokasi</th>
              <th>DPL</th>
              <th>Periode KKN</th>
              <th>Status</th>
              <th>Nilai</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((k) => (
              <tr key={k.id}>
                <td className="mono">{k.periode}</td>
                <td className="mono">{k.mahasiswa.nim}</td>
                <td>{k.mahasiswa.nama}</td>
                <td>{k.mahasiswa.prodi.kode}</td>
                <td>{k.lokasi}{k.desa ? `, ${k.desa}` : ''}{k.kecamatan ? `, ${k.kecamatan}` : ''}</td>
                <td>{k.dpl?.nama ?? <span className="muted">—</span>}</td>
                <td className="mono">
                  {k.tanggalMulai
                    ? <>{formatTanggal(k.tanggalMulai)} – {formatTanggal(k.tanggalSelesai)}</>
                    : <span className="muted">—</span>}
                </td>
                <td><StatusPill status={k.status} /></td>
                <td className="center mono"><strong>{k.nilai ?? '—'}</strong></td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(k)}>Edit</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(k)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (patch) => {
            try {
              await update.mutateAsync({ id: editing.id, patch });
              setEditing(null);
            } catch (e) {
              alert(e instanceof ApiError ? e.message : 'Gagal');
            }
          }}
        />
      )}
    </div>
  );
}

function EditModal({ item, onClose, onSubmit }: {
  item: AdminKknItem;
  onClose: () => void;
  onSubmit: (patch: AdminKknPatch) => void;
}) {
  const dosen = useAdminDosen();
  const [form, setForm] = useState<AdminKknPatch>({
    lokasi: item.lokasi,
    desa: item.desa,
    kecamatan: item.kecamatan,
    kabupaten: item.kabupaten,
    dplDosenId: item.dpl?.id ?? null,
    tanggalMulai: item.tanggalMulai?.slice(0, 10) ?? '',
    tanggalSelesai: item.tanggalSelesai?.slice(0, 10) ?? '',
    nilai: item.nilai ?? '',
    status: item.status,
  });

  return (
    <Modal open onClose={onClose} title={`Edit KKN ${item.mahasiswa.nim}`} width={640}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{item.mahasiswa.nim} · {item.mahasiswa.nama}</div>
          <strong style={{ color: 'var(--text-strong)' }}>Periode {item.periode}</strong>
        </Card>

        <Input label="Lokasi" value={form.lokasi ?? ''} onChange={(e) => setForm({ ...form, lokasi: (e.target as HTMLInputElement).value })} />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Desa" value={form.desa ?? ''} onChange={(e) => setForm({ ...form, desa: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="Kecamatan" value={form.kecamatan ?? ''} onChange={(e) => setForm({ ...form, kecamatan: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="Kabupaten" value={form.kabupaten ?? ''} onChange={(e) => setForm({ ...form, kabupaten: (e.target as HTMLInputElement).value })} /></div>
        </div>

        <Select label="DPL (Dosen Pembimbing Lapangan)" value={form.dplDosenId ?? ''} onChange={(e) => setForm({ ...form, dplDosenId: (e.target as HTMLSelectElement).value || null })}>
          <option value="">— Belum ditentukan —</option>
          {dosen.data?.items.map((d) => <option key={d.id} value={d.id}>{d.nama} ({d.nidn})</option>)}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Tanggal mulai" type="date" value={form.tanggalMulai ?? ''} onChange={(e) => setForm({ ...form, tanggalMulai: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="Tanggal selesai" type="date" value={form.tanggalSelesai ?? ''} onChange={(e) => setForm({ ...form, tanggalSelesai: (e.target as HTMLInputElement).value })} /></div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Status" value={form.status ?? 'pendaftaran'} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AdminKknPatch['status'] })}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Nilai (huruf)" value={form.nilai ?? ''} onChange={(e) => setForm({ ...form, nilai: (e.target as HTMLInputElement).value })} placeholder="A / B / C" />
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" onClick={() => onSubmit(form)}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
