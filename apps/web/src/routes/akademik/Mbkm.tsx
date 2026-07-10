import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  useAdminMbkm, useAdminMbkmActions, useAdminDosen, useMataKuliah,
  type AdminMbkmItem,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS = ['pengajuan', 'disetujui', 'berjalan', 'selesai', 'ditolak'] as const;
const JENIS_LABEL: Record<string, string> = {
  pertukaran_mahasiswa: 'Pertukaran',
  magang_industri:      'Magang',
  asistensi_mengajar:   'Asistensi Mengajar',
  penelitian:           'Penelitian',
  proyek_kemanusiaan:   'Proyek Kemanusiaan',
  kewirausahaan:        'Wirausaha',
  studi_independen:     'Studi Independen',
  kkn_tematik:          'KKN Tematik',
};

export function AdminMbkmPage() {
  const [filters, setFilters] = useState({ periode: '', status: '', jenis: '' });
  const { data, isLoading, error } = useAdminMbkm(filters);
  const [editing, setEditing] = useState<AdminMbkmItem | null>(null);
  const { remove } = useAdminMbkmActions();

  const onDelete = async (m: AdminMbkmItem) => {
    if (!confirm(`Hapus MBKM ${m.mahasiswa.nim} (${m.namaProgram})?`)) return;
    try { await remove.mutateAsync(m.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead eyebrow="OPERASIONAL" title="Kelola MBKM" subtitle="Validasi pengajuan, tetapkan DPL, dan kelola konversi SKS." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Periode" value={filters.periode} onChange={(e) => setFilters({ ...filters, periode: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {data?.periodeList.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Jenis BKP" value={filters.jenis} onChange={(e) => setFilters({ ...filters, jenis: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pengajuan">Belum ada mahasiswa yang mendaftar MBKM.</Alert>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>NIM</th>
              <th>Nama</th>
              <th>Jenis</th>
              <th>Program / Mitra</th>
              <th>DPL</th>
              <th className="num">SKS</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.periode}</td>
                <td className="mono">{m.mahasiswa.nim}</td>
                <td>{m.mahasiswa.nama}</td>
                <td>{JENIS_LABEL[m.jenis] ?? m.jenis}</td>
                <td>
                  <strong>{m.namaProgram}</strong>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{m.mitra}</div>
                </td>
                <td>{m.dpl?.nama ?? <span className="muted">—</span>}</td>
                <td className="num mono">{m.totalSksKonversi}</td>
                <td><StatusPill status={m.status} /></td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(m)}>Detail</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(m)}>Hapus</Button>
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

function EditModal({ item, onClose }: { item: AdminMbkmItem; onClose: () => void }) {
  const dosen = useAdminDosen();
  const mk = useMataKuliah({ prodiId: undefined });
  const { update, addKonversi, setNilai, removeKonversi } = useAdminMbkmActions();
  const [form, setForm] = useState({
    dplDosenId: item.dpl?.id ?? '',
    tanggalMulai: item.tanggalMulai?.slice(0, 10) ?? '',
    tanggalSelesai: item.tanggalSelesai?.slice(0, 10) ?? '',
    status: item.status,
    catatan: item.catatan ?? '',
    lokasi: item.lokasi ?? '',
  });
  const [newMkId, setNewMkId] = useState('');
  const [actErr, setActErr] = useState<string | null>(null);

  const saveMeta = async () => {
    setActErr(null);
    try {
      await update.mutateAsync({
        id: item.id,
        patch: {
          dplDosenId: form.dplDosenId || null,
          tanggalMulai: form.tanggalMulai || null,
          tanggalSelesai: form.tanggalSelesai || null,
          status: form.status,
          catatan: form.catatan || null,
          lokasi: form.lokasi || null,
        },
      });
      onClose();
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const tambahKonversi = async () => {
    if (!newMkId) return;
    setActErr(null);
    try {
      await addKonversi.mutateAsync({ id: item.id, mataKuliahId: newMkId });
      setNewMkId('');
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`MBKM — ${item.mahasiswa.nama}`} width={780}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            {item.mahasiswa.nim} · {item.mahasiswa.prodi.kode}
          </div>
          <strong style={{ color: 'var(--text-strong)' }}>{item.namaProgram}</strong>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {JENIS_LABEL[item.jenis] ?? item.jenis} · Mitra: {item.mitra} · Periode <span className="mono">{item.periode}</span>
          </div>
          {(item.linkProposal || item.linkLaporan || item.linkSertifikat) && (
            <div style={{ marginTop: 6, fontSize: 'var(--text-xs)' }}>
              {item.linkProposal && <a href={item.linkProposal} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>Proposal ↗</a>}
              {item.linkLaporan && <a href={item.linkLaporan} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>Laporan ↗</a>}
              {item.linkSertifikat && <a href={item.linkSertifikat} target="_blank" rel="noreferrer">Sertifikat ↗</a>}
            </div>
          )}
        </Card>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AdminMbkmItem['status'] })}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div style={{ flex: 2 }}>
            <Select label="DPL" value={form.dplDosenId} onChange={(e) => setForm({ ...form, dplDosenId: (e.target as HTMLSelectElement).value })}>
              <option value="">— Belum ditentukan —</option>
              {dosen.data?.items.map((d) => <option key={d.id} value={d.id}>{d.nama} ({d.nidn})</option>)}
            </Select>
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Tanggal mulai" type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="Tanggal selesai" type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: (e.target as HTMLInputElement).value })} /></div>
        </div>
        <Input label="Lokasi" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: (e.target as HTMLInputElement).value })} />
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Catatan untuk mahasiswa</label>
          <textarea
            value={form.catatan}
            onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={update.isPending} onClick={saveMeta}>
            {update.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>

        <div style={{ borderTop: '1px dashed var(--border-default)', paddingTop: 'var(--space-3)' }}>
          <strong style={{ color: 'var(--text-strong)' }}>Konversi SKS</strong>
          <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 0 }}>
            Tambahkan MK yang setara dengan kegiatan MBKM ini. Isi nilai jika sudah selesai.
          </p>

          <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select label="Tambah MK" value={newMkId} onChange={(e) => setNewMkId((e.target as HTMLSelectElement).value)}>
                <option value="">Pilih MK…</option>
                {mk.data?.items
                  .filter((x) => !item.konversi.some((k) => k.mataKuliahId === x.id))
                  .map((x) => <option key={x.id} value={x.id}>{x.kode} — {x.nama} ({x.sks} SKS)</option>)}
              </Select>
            </div>
            <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} disabled={!newMkId || addKonversi.isPending} onClick={tambahKonversi}>
              Tambah
            </Button>
          </div>

          {item.konversi.length > 0 && (
            <div className="tz-table-wrap" style={{ marginTop: 'var(--space-2)' }}>
              <table className="tz-table">
                <thead>
                  <tr><th>Kode</th><th>MK</th><th className="num">SKS</th><th className="center">Nilai</th><th></th></tr>
                </thead>
                <tbody>
                  {item.konversi.map((k) => (
                    <tr key={k.id}>
                      <td className="mono">{k.kodeMK}</td>
                      <td>{k.namaMK}</td>
                      <td className="num">{k.sks}</td>
                      <td className="center">
                        <NilaiSelect
                          value={k.nilaiHuruf}
                          onChange={(v) => setNilai.mutateAsync({ id: item.id, konversiId: k.id, nilaiHuruf: v })}
                        />
                      </td>
                      <td>
                        <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => removeKonversi.mutateAsync({ id: item.id, konversiId: k.id })}>
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NilaiSelect({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="tz-input"
      style={{ width: 80, padding: '4px 8px', fontFamily: 'var(--font-mono)' }}
    >
      <option value="">—</option>
      {['A', 'AB', 'B', 'BC', 'C', 'D', 'E'].map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}
