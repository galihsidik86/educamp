// Komponen tersesuaikan untuk kelola Penelitian / Pengabdian.
// Diimpor oleh Penelitian.tsx dan Pengabdian.tsx — keduanya pakai layout sama.

import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, Trash2 } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { formatRupiah, formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';
import type { KegiatanInput } from '@/lib/queries-dosen';

export type Anggota = { id: string; peran: string; mahasiswa: { id: string; nim: string; nama: string } };

export type Kegiatan = {
  id: string; judul: string; tahun: number; status: string;
  sumberDana: string | null; jumlahDana: number | null;
  abstrak?: string | null;
  deskripsi?: string | null;
  lokasi?: string | null;
  anggota: Anggota[];
};

type Props = {
  title: string;
  eyebrow: string;
  items: Kegiatan[];
  isLoading: boolean;
  isPengabdian?: boolean;
  onCreate: (input: KegiatanInput) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onAddAnggota: (input: { id: string; nim: string; peran: string }) => Promise<unknown>;
  onRemoveAnggota: (input: { id: string; anggotaId: string }) => Promise<unknown>;
};

export function KegiatanList({
  title, eyebrow, items, isLoading, isPengabdian = false,
  onCreate, onRemove, onAddAnggota, onRemoveAnggota,
}: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="page-head">
          <span className="page-head__eyebrow">{eyebrow}</span>
          <h1 className="page-head__title">{title}</h1>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Tutup' : 'Tambah baru'}
        </Button>
      </div>

      {creating && (
        <CreateForm
          isPengabdian={isPengabdian}
          onSubmit={async (input) => {
            await onCreate(input);
            setCreating(false);
          }}
        />
      )}

      {isLoading && <p className="muted">Memuat…</p>}

      {!isLoading && items.length === 0 && (
        <Alert variant="info" title={`Belum ada ${title.toLowerCase()}`}>
          Klik tombol "Tambah baru" untuk membuat entri pertama.
        </Alert>
      )}

      <div className="card-list">
        {items.map((p) => (
          <KegiatanCard
            key={p.id} item={p} isPengabdian={isPengabdian}
            onRemove={() => onRemove(p.id)}
            onAddAnggota={(nim, peran) => onAddAnggota({ id: p.id, nim, peran })}
            onRemoveAnggota={(anggotaId) => onRemoveAnggota({ id: p.id, anggotaId })}
          />
        ))}
      </div>
    </div>
  );
}

function CreateForm({ isPengabdian, onSubmit }: { isPengabdian: boolean; onSubmit: (input: KegiatanInput) => Promise<void> }) {
  const [judul, setJudul] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [sumber, setSumber] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [extra, setExtra] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await onSubmit({
        judul,
        tahun: Number(tahun) || new Date().getFullYear(),
        sumberDana: sumber || undefined,
        jumlahDana: jumlah ? Number(jumlah) : undefined,
        ...(isPengabdian ? { deskripsi: extra || undefined, lokasi: lokasi || undefined } : { abstrak: extra || undefined }),
      });
      setJudul(''); setSumber(''); setJumlah(''); setExtra(''); setLokasi('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan');
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Input label="Judul" required value={judul} onChange={(e) => setJudul((e.target as HTMLInputElement).value)} />
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Tahun" type="number" min={2000} max={2100} value={tahun} onChange={(e) => setTahun((e.target as HTMLInputElement).value)} />
          </div>
          <div style={{ flex: 2 }}>
            <Input label="Sumber dana (opsional)" value={sumber} onChange={(e) => setSumber((e.target as HTMLInputElement).value)} />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jumlah dana (Rp)" type="number" min={0} value={jumlah} onChange={(e) => setJumlah((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        {isPengabdian && (
          <Input label="Lokasi (opsional)" value={lokasi} onChange={(e) => setLokasi((e.target as HTMLInputElement).value)} />
        )}
        <div>
          <label className="tz-field__label">{isPengabdian ? 'Deskripsi (opsional)' : 'Abstrak (opsional)'}</label>
          <textarea
            value={extra} onChange={(e) => setExtra(e.target.value)}
            className="tz-input"
            style={{ width: '100%', minHeight: 80, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>
        <Button type="submit" variant="primary" disabled={busy || !judul}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </form>
    </Card>
  );
}

function KegiatanCard({ item, isPengabdian, onRemove, onAddAnggota, onRemoveAnggota }: {
  item: Kegiatan; isPengabdian: boolean;
  onRemove: () => Promise<unknown>;
  onAddAnggota: (nim: string, peran: string) => Promise<unknown>;
  onRemoveAnggota: (anggotaId: string) => Promise<unknown>;
}) {
  const [showAnggota, setShowAnggota] = useState(false);
  const [nim, setNim] = useState('');
  const [peran, setPeran] = useState('Anggota');
  const [addErr, setAddErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErr(null); setBusy(true);
    try {
      await onAddAnggota(nim, peran);
      setNim(''); setPeran('Anggota');
    } catch (e) {
      setAddErr(e instanceof ApiError ? e.message : 'Gagal menambah anggota');
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p className="card-list-item__title">{item.judul}</p>
          <div className="card-list-item__meta">
            <span>Tahun: <span style={{ fontFamily: 'var(--font-mono)' }}>{item.tahun}</span></span>
            {item.sumberDana && <span>Sumber: {item.sumberDana}</span>}
            {item.jumlahDana != null && <span>Dana: {formatRupiah(item.jumlahDana)}</span>}
            {isPengabdian && item.lokasi && <span>Lokasi: {item.lokasi}</span>}
            <span>Anggota: <strong>{item.anggota.length}</strong></span>
          </div>
          {(isPengabdian ? item.deskripsi : item.abstrak) && (
            <p className="muted" style={{ marginTop: 8, fontSize: 'var(--text-xs)' }}>
              {isPengabdian ? item.deskripsi : item.abstrak}
            </p>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <StatusPill status={item.status} />
          <Button size="sm" variant="ghost" onClick={() => setShowAnggota((v) => !v)}>
            {showAnggota ? 'Sembunyikan' : `Anggota (${item.anggota.length})`}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Hapus kegiatan ini?')) onRemove(); }} leftIcon={<Trash2 size={14} />}>
            Hapus
          </Button>
        </div>
      </div>

      {showAnggota && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-default)' }}>
          {item.anggota.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 'var(--text-xs)' }}>Belum ada anggota.</p>}
          {item.anggota.map((a) => (
            <div key={a.id} className="row" style={{ justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--text-sm)' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{a.mahasiswa.nim}</span> — {a.mahasiswa.nama}
                <span className="muted"> · {formatStatus(a.peran)}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onRemoveAnggota(a.id)} leftIcon={<Trash2 size={12} />}>
                Hapus
              </Button>
            </div>
          ))}

          <form onSubmit={submitAnggota} className="row" style={{ gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="NIM mahasiswa" value={nim} onChange={(e) => setNim((e.target as HTMLInputElement).value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Peran" value={peran} onChange={(e) => setPeran((e.target as HTMLInputElement).value)} />
            </div>
            <Button type="submit" variant="secondary" disabled={busy || !nim}>Tambah</Button>
          </form>
          {addErr && <Alert variant="danger" title="Gagal">{addErr}</Alert>}
        </div>
      )}
    </Card>
  );
}
