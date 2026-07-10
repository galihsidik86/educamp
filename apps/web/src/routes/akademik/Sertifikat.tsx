import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Award, Trash2, ShieldCheck, RefreshCw, Copy, Search } from 'lucide-react';
import {
  useAdminSertifikat, useAdminSertifikatActions,
  type SertifikatAdmin, type JenisSertifikat, type StatusSertifikat, type SertifikatInput,
} from '@/lib/queries-sertifikat';
import { useAdminMahasiswa } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS_OPTS: Array<{ v: JenisSertifikat; label: string }> = [
  { v: 'workshop', label: 'Workshop' },
  { v: 'panitia', label: 'Kepanitiaan' },
  { v: 'asisten', label: 'Asisten' },
  { v: 'kkn', label: 'KKN' },
  { v: 'mbkm', label: 'MBKM' },
  { v: 'edom', label: 'EDOM' },
  { v: 'lain', label: 'Lain' },
];

const STATUS_OPTS: Array<{ v: StatusSertifikat | ''; label: string }> = [
  { v: '', label: 'Semua' },
  { v: 'terbit', label: 'Terbit' },
  { v: 'dicabut', label: 'Dicabut' },
];

export function AkademikSertifikat() {
  const [jenis, setJenis] = useState<JenisSertifikat | ''>('');
  const [status, setStatus] = useState<StatusSertifikat | ''>('');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading, error } = useAdminSertifikat({
    jenis: jenis || undefined,
    status: status || undefined,
    q: activeQ || undefined,
  });
  const actions = useAdminSertifikatActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [cabutFor, setCabutFor] = useState<SertifikatAdmin | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Kelola Sertifikat Digital"
        subtitle="Sertifikat KKN/MBKM otomatis terbit. Tambah manual untuk workshop, kepanitiaan, asisten, dll."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Buat Sertifikat
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Jenis" value={jenis} onChange={(e) => setJenis((e.target as HTMLSelectElement).value as JenisSertifikat | '')}>
            <option value="">Semua jenis</option>
            {JENIS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 160 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusSertifikat | '')}>
            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="No. sertifikat / judul / NIM / nama" onKeyDown={(e) => e.key === 'Enter' && setActiveQ(q)} />
        </div>
        <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada sertifikat">Klik "Buat Sertifikat" untuk membuat manual atau tunggu auto-issue dari KKN/MBKM selesai.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={16} className="muted" />
                  <strong>{s.judul}</strong>
                  <span className={`pill ${s.status === 'terbit' ? 'pill--success' : 'pill--danger'}`}>{s.status}</span>
                  <span className="pill pill--neutral">{JENIS_OPTS.find((o) => o.v === s.jenis)?.label}</span>
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  No. {s.nomorSertifikat} · {formatTanggal(s.tanggalTerbit)}
                  {s.periode && ` · ${s.periode}`}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                  Penerima: <strong>{s.mahasiswa.nim}</strong> — {s.mahasiswa.nama} ({s.mahasiswa.prodi.kode})
                </div>
                {s.alasanCabut && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Alasan cabut:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{s.alasanCabut}</p>
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" leftIcon={<Copy size={12} />}
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/verifikasi-sertifikat/${s.verifikasiToken}`)}>
                  Salin URL
                </Button>
                <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={12} />}
                  onClick={async () => {
                    if (!confirm('Generate token baru? Token & QR yang sudah dicetak akan tidak valid.')) return;
                    setActErr(null);
                    try { await actions.regenToken.mutateAsync(s.id); }
                    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
                  }}>
                  Regen
                </Button>
                {s.status === 'terbit' ? (
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => setCabutFor(s)}>Cabut</Button>
                ) : (
                  <Button size="sm" variant="ghost" leftIcon={<ShieldCheck size={12} />}
                    onClick={async () => {
                      setActErr(null);
                      try { await actions.aktifkan.mutateAsync(s.id); }
                      catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
                    }}>
                    Aktifkan
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {cabutFor && <CabutModal sertifikat={cabutFor} onClose={() => setCabutFor(null)} />}
    </div>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actions = useAdminSertifikatActions();
  const mhs = useAdminMahasiswa();
  const [form, setForm] = useState<Partial<SertifikatInput>>({ jenis: 'workshop' });
  const [searchMhs, setSearchMhs] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!form.mahasiswaId || !form.judul || !form.jenis) { setErr('Mahasiswa, jenis, dan judul wajib'); return; }
    try {
      await actions.create.mutateAsync(form as SertifikatInput);
      onClose();
      setForm({ jenis: 'workshop' });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const mhsFiltered = (mhs.data?.items ?? []).filter((m) =>
    !searchMhs || m.nim.includes(searchMhs) || m.nama.toLowerCase().includes(searchMhs.toLowerCase()),
  ).slice(0, 30);

  const selectedMhs = mhs.data?.items.find((m) => m.id === form.mahasiswaId);

  return (
    <Modal open={open} onClose={onClose} title="Buat sertifikat manual" width={680}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Jenis sertifikat" value={form.jenis ?? 'workshop'} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as JenisSertifikat })}>
              {JENIS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Periode (opsional)" value={form.periode ?? ''} onChange={(e) => setForm({ ...form, periode: (e.target as HTMLInputElement).value })} placeholder="Ganjil 2025/2026" />
          </div>
        </div>

        <Input label="Judul sertifikat" value={form.judul ?? ''} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} placeholder="Workshop Pemrograman Lanjut" />
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Deskripsi (opsional)</label>
          <textarea
            value={form.deskripsi ?? ''}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            placeholder="Telah berpartisipasi sebagai …"
          />
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Nama penandatangan (opsional)" value={form.ttdNama ?? ''} onChange={(e) => setForm({ ...form, ttdNama: (e.target as HTMLInputElement).value })} placeholder="Dr. Nama Pejabat" />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Jabatan (opsional)" value={form.ttdJabatan ?? ''} onChange={(e) => setForm({ ...form, ttdJabatan: (e.target as HTMLInputElement).value })} placeholder="Kepala BAAK" />
          </div>
        </div>

        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Mahasiswa penerima</label>
          {selectedMhs ? (
            <Card>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong className="mono">{selectedMhs.nim}</strong> — {selectedMhs.nama}
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{selectedMhs.prodi.nama}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, mahasiswaId: undefined })}>Ganti</Button>
              </div>
            </Card>
          ) : (
            <>
              <Input value={searchMhs} onChange={(e) => setSearchMhs((e.target as HTMLInputElement).value)} placeholder="Cari NIM atau nama" />
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', marginTop: 8 }}>
                {mhsFiltered.map((m) => (
                  <button key={m.id} type="button" onClick={() => setForm({ ...form, mahasiswaId: m.id })}
                    style={{ display: 'block', width: '100%', padding: 'var(--space-2) var(--space-3)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <strong className="mono">{m.nim}</strong> — {m.nama}
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{m.prodi.nama}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={actions.create.isPending} onClick={submit}>{actions.create.isPending ? 'Membuat…' : 'Terbitkan Sertifikat'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function CabutModal({ sertifikat, onClose }: { sertifikat: SertifikatAdmin; onClose: () => void }) {
  const actions = useAdminSertifikatActions();
  const [alasan, setAlasan] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (alasan.trim().length < 5) { setErr('Alasan wajib (minimal 5 karakter)'); return; }
    try {
      await actions.cabut.mutateAsync({ id: sertifikat.id, alasan });
      onClose();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Cabut sertifikat — ${sertifikat.nomorSertifikat}`} width={560}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Alert variant="warning" title="Konfirmasi pencabutan">
          Sertifikat <strong>{sertifikat.judul}</strong> milik <strong>{sertifikat.mahasiswa.nama}</strong> akan dicabut.
          QR verifikasi akan return 404. Tindakan dapat dibatalkan dengan tombol "Aktifkan".
        </Alert>
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Alasan pencabutan</label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={4}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            placeholder="mis. Terbukti palsu data kepanitiaan"
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={actions.cabut.isPending} onClick={submit}>{actions.cabut.isPending ? 'Mencabut…' : 'Cabut'}</Button>
        </div>
      </div>
    </Modal>
  );
}
