import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, Trash2, ClipboardEdit, MapPin, FileUp } from 'lucide-react';
import { useRuangan, useRuanganActions, type Ruangan } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { ApiError } from '@/lib/api';
import { TableSkeletonRows } from '@/components/Skeleton';

export function AkademikRuangan() {
  const { data, isLoading, error } = useRuangan();
  const actions = useRuanganActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<Ruangan | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const remove = (r: Ruangan) => {
    if (!confirm(`Hapus ruangan ${r.kode} - ${r.nama}?`)) return;
    actions.remove.mutate(r.id, {
      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
    });
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="MASTER DATA"
        title="Ruangan"
        subtitle="Master data ruangan/lab — dipakai sebagai lokasi kelas/jadwal kuliah."
        right={
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" size="sm" leftIcon={<FileUp size={14} />} onClick={() => setImportOpen(true)}>
              Impor Excel
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
              Tambah Ruangan
            </Button>
          </div>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {data && data.items.length === 0 && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(208,166,86,0.10)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <MapPin size={28} />
            </div>
            <strong style={{ color: 'var(--text-strong)' }}>Belum ada ruangan</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>Tambahkan ruangan pertama untuk bisa di-assign ke kelas.</p>
          </div>
        </Card>
      )}

      {(isLoading || (data && data.items.length > 0)) && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Gedung</th>
                <th className="num">Lantai</th>
                <th className="num">Kapasitas</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeletonRows cols={6} rows={5} />}
              {data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><strong>{r.kode}</strong></td>
                  <td>{r.nama}</td>
                  <td>{r.gedung ?? '—'}</td>
                  <td className="num mono">{r.lantai ?? '—'}</td>
                  <td className="num mono">{r.kapasitas}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" leftIcon={<ClipboardEdit size={14} />} onClick={() => setEditFor(r)}>Edit</Button>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => remove(r)}>Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RuanganModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(body) => actions.create.mutate(body, {
          onSuccess: () => setCreateOpen(false),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
        })}
        title="Tambah Ruangan"
      />
      <RuanganModal
        open={!!editFor}
        onClose={() => setEditFor(null)}
        initial={editFor ?? undefined}
        onSubmit={(body) => editFor && actions.update.mutate({ id: editFor.id, patch: body }, {
          onSuccess: () => setEditFor(null),
          onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
        })}
        title="Edit Ruangan"
      />

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Ruangan via Excel"
        expectedHeaders={['kode', 'nama']}
        optionalHeaders={['gedung', 'lantai', 'kapasitas']}
        templateFilename="template-ruangan.xlsx"
        keyHeader="Kode"
        notes={<><code>kode</code> unik (mis. R-101, LAB-1). <code>lantai</code> integer (0 utk lantai dasar). <code>kapasitas</code> jumlah kursi (default 0 — bisa dipakai untuk ruang non-kuliah spt ruang rapat).</>}
        sampleRows={[
          { kode: 'R-101', nama: 'Ruang 101', gedung: 'A', lantai: 1, kapasitas: 40 },
          { kode: 'LAB-1', nama: 'Laboratorium Komputer 1', gedung: 'B', lantai: 1, kapasitas: 30 },
        ]}
        importMutation={actions.importCsv}
      />
    </div>
  );
}

function RuanganModal({ open, onClose, onSubmit, initial, title }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { kode: string; nama: string; gedung?: string; lantai?: number; kapasitas?: number }) => void;
  initial?: Ruangan;
  title: string;
}) {
  const [form, setForm] = useState({
    kode: initial?.kode ?? '',
    nama: initial?.nama ?? '',
    gedung: initial?.gedung ?? '',
    lantai: initial?.lantai != null ? String(initial.lantai) : '',
    kapasitas: initial?.kapasitas != null ? String(initial.kapasitas) : '0',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      kode: initial?.kode ?? '',
      nama: initial?.nama ?? '',
      gedung: initial?.gedung ?? '',
      lantai: initial?.lantai != null ? String(initial.lantai) : '',
      kapasitas: initial?.kapasitas != null ? String(initial.kapasitas) : '0',
    });
  }, [open, initial]);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} width={520}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            kode: form.kode,
            nama: form.nama,
            gedung: form.gedung || undefined,
            lantai: form.lantai ? Number(form.lantai) : undefined,
            kapasitas: form.kapasitas ? Number(form.kapasitas) : 0,
          });
        }}
      >
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: (e.target as HTMLInputElement).value })} required placeholder="R-101" />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} required placeholder="Ruang 101" />
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Gedung" value={form.gedung} onChange={(e) => setForm({ ...form, gedung: (e.target as HTMLInputElement).value })} placeholder="A / B / Lab" />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Lantai" type="number" value={form.lantai} onChange={(e) => setForm({ ...form, lantai: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Kapasitas" type="number" value={form.kapasitas} onChange={(e) => setForm({ ...form, kapasitas: (e.target as HTMLInputElement).value })} />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
