import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Pencil, Printer } from 'lucide-react';
import { useAdminSurat, useAdminSuratActions, type AdminSuratItem } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS = ['diajukan', 'disetujui', 'ditolak', 'selesai', 'batal'] as const;
const JENIS_LABEL: Record<string, string> = {
  aktif_kuliah:         'Aktif Kuliah',
  keterangan_mahasiswa: 'Keterangan Mahasiswa',
  pengantar_beasiswa:   'Pengantar Beasiswa',
  pengantar_penelitian: 'Pengantar Penelitian',
  pengantar_magang:     'Pengantar Magang',
  pengganti_ktm:        'Pengganti KTM',
  lainnya:              'Lainnya',
};

export function AdminSuratPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ q: '', status: '', jenis: '' });
  const { data, isLoading, error } = useAdminSurat(filters);
  const [editing, setEditing] = useState<AdminSuratItem | null>(null);

  return (
    <div className="stack">
      <PageHead eyebrow="OPERASIONAL" title="Kelola Surat" subtitle="Verifikasi permohonan surat keterangan mahasiswa." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input label="Cari judul / NIM / nama" value={filters.q} onChange={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value })} />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Jenis" value={filters.jenis} onChange={(e) => setFilters({ ...filters, jenis: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada permohonan">Sesuaikan filter atau belum ada permohonan.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{s.judul}</strong>
                  <span className="pill pill--neutral">{JENIS_LABEL[s.jenis] ?? s.jenis}</span>
                  <StatusPill status={s.status} />
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {s.mahasiswa.nim} · {s.mahasiswa.nama} · {s.mahasiswa.prodi.kode} · Angkatan {s.mahasiswa.angkatan} · Diajukan {formatTanggal(s.tanggalDiajukan)}
                  {s.nomorSurat && <> · No. <span className="mono">{s.nomorSurat}</span></>}
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary className="muted" style={{ fontSize: 'var(--text-xs)', cursor: 'pointer' }}>Lihat keperluan</summary>
                  <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{s.keperluan}</p>
                </details>
                {s.catatan && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Catatan:</strong> {s.catatan}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {s.status === 'selesai' && (
                  <Button size="sm" variant="primary" leftIcon={<Printer size={12} />} onClick={() => navigate(`/akademik/surat/${s.id}/cetak`)}>Cetak</Button>
                )}
                <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(s)}>Validasi</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditModal({ item, onClose }: { item: AdminSuratItem; onClose: () => void }) {
  const { update } = useAdminSuratActions();
  const [form, setForm] = useState({
    status: item.status,
    catatan: item.catatan ?? '',
    nomorSurat: item.nomorSurat ?? '',
  });
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    try {
      await update.mutateAsync({
        id: item.id,
        patch: {
          status: form.status,
          catatan: form.catatan || null,
          nomorSurat: form.nomorSurat || null,
        },
      });
      onClose();
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Validasi — ${item.judul}`} width={580}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{item.mahasiswa.nim} · {item.mahasiswa.prodi.kode}</div>
          <strong>{item.mahasiswa.nama}</strong>
        </Card>

        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AdminSuratItem['status'] })}>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>

        <Input label="Nomor surat (wajib untuk status 'selesai')" value={form.nomorSurat} onChange={(e) => setForm({ ...form, nomorSurat: (e.target as HTMLInputElement).value })} placeholder="mis. 001/SK/AKD/2026" />

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
          <Button variant="primary" size="sm" disabled={update.isPending} onClick={save}>{update.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
