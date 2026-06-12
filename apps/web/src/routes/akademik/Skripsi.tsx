import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Pencil, Trash2 } from 'lucide-react';
import {
  useAdminSkripsi, useAdminSkripsiActions, useAdminDosen, useProdi,
  type AdminSkripsiItem, type AdminSkripsiPatch,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS = ['diajukan', 'disetujui', 'proposal', 'penelitian', 'sidang', 'lulus', 'ditolak', 'batal'] as const;

export function AdminSkripsiPage() {
  const [filters, setFilters] = useState({ q: '', status: '', prodiId: '' });
  const { data, isLoading, error } = useAdminSkripsi(filters);
  const prodi = useProdi();
  const [editing, setEditing] = useState<AdminSkripsiItem | null>(null);
  const { remove } = useAdminSkripsiActions();

  const onDelete = async (s: AdminSkripsiItem) => {
    if (!confirm(`Hapus permanen skripsi "${s.judul.slice(0, 60)}" oleh ${s.mahasiswa.nim}?`)) return;
    try { await remove.mutateAsync(s.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead eyebrow="OPERASIONAL" title="Kelola Skripsi" subtitle="Validasi pengajuan judul, tetapkan pembimbing, dan pantau lifecycle skripsi." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Cari judul / NIM / nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} placeholder="cari…" />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada hasil">Sesuaikan filter atau belum ada pengajuan.</Alert>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th>
              <th>Nama</th>
              <th>Judul</th>
              <th>Pembimbing</th>
              <th>Status</th>
              <th>Nilai</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.mahasiswa.nim}</td>
                <td>{s.mahasiswa.nama}<div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{s.mahasiswa.prodi.kode}</div></td>
                <td style={{ maxWidth: 320 }}>
                  <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.judul}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Ajuan {formatTanggal(s.tanggalAjuan)}</div>
                </td>
                <td>
                  {s.pembimbing1 && <div>{s.pembimbing1.nama}</div>}
                  {s.pembimbing2 && <div className="muted">{s.pembimbing2.nama}</div>}
                  {!s.pembimbing1 && !s.pembimbing2 && <span className="muted">— Belum ditetapkan —</span>}
                </td>
                <td><StatusPill status={s.status} /></td>
                <td className="center mono"><strong>{s.nilaiHuruf ?? '—'}</strong></td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(s)}>Detail</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(s)}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditModal({ item, onClose }: { item: AdminSkripsiItem; onClose: () => void }) {
  const dosen = useAdminDosen();
  const { update } = useAdminSkripsiActions();
  const [form, setForm] = useState<AdminSkripsiPatch>({
    pembimbing1Id: item.pembimbing1?.id ?? null,
    pembimbing2Id: item.pembimbing2?.id ?? null,
    status: item.status,
    catatan: item.catatan ?? '',
    topik: item.topik ?? '',
    tanggalSidang: item.tanggalSidang?.slice(0, 10) ?? '',
    nilaiHuruf: item.nilaiHuruf ?? '',
  });
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    try {
      await update.mutateAsync({
        id: item.id,
        patch: {
          pembimbing1Id: form.pembimbing1Id || null,
          pembimbing2Id: form.pembimbing2Id || null,
          status: form.status,
          catatan: form.catatan || null,
          topik: form.topik || null,
          tanggalSidang: form.tanggalSidang || null,
          nilaiHuruf: form.nilaiHuruf || null,
        },
      });
      onClose();
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Skripsi — ${item.mahasiswa.nama}`} width={780}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{item.mahasiswa.nim} · {item.mahasiswa.prodi.kode}</div>
          <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 4 }}>{item.judul}</strong>
          {item.abstrak && (
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>{item.abstrak}</p>
          )}
          {item.linkDokumen && (
            <a href={item.linkDokumen} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 4, fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>
              Lihat dokumen ↗
            </a>
          )}
        </Card>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Status" value={form.status ?? 'diajukan'} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AdminSkripsiItem['status'] })}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Topik" value={form.topik ?? ''} onChange={(e) => setForm({ ...form, topik: (e.target as HTMLInputElement).value })} />
          </div>
        </div>

        <Select label="Pembimbing 1" value={form.pembimbing1Id ?? ''} onChange={(e) => setForm({ ...form, pembimbing1Id: (e.target as HTMLSelectElement).value || null })}>
          <option value="">— Belum ditetapkan —</option>
          {dosen.data?.items.map((d) => <option key={d.id} value={d.id}>{d.nama} ({d.nidn})</option>)}
        </Select>
        <Select label="Pembimbing 2 (opsional)" value={form.pembimbing2Id ?? ''} onChange={(e) => setForm({ ...form, pembimbing2Id: (e.target as HTMLSelectElement).value || null })}>
          <option value="">— Tidak ada —</option>
          {dosen.data?.items.map((d) => <option key={d.id} value={d.id}>{d.nama} ({d.nidn})</option>)}
        </Select>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Tanggal sidang" type="date" value={form.tanggalSidang ?? ''} onChange={(e) => setForm({ ...form, tanggalSidang: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}>
            <Select label="Nilai akhir" value={form.nilaiHuruf ?? ''} onChange={(e) => setForm({ ...form, nilaiHuruf: (e.target as HTMLSelectElement).value })}>
              <option value="">—</option>
              {['A', 'AB', 'B', 'BC', 'C', 'D', 'E'].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Catatan untuk mahasiswa</label>
          <textarea
            value={form.catatan ?? ''}
            onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={update.isPending} onClick={save}>{update.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
