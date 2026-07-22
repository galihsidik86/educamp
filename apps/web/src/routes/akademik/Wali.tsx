import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, Search, Users, Link2, Unlink, Copy, AlertTriangle } from 'lucide-react';
import {
  useAdminWali, useAdminWaliActions,
  type WaliAdmin, type WaliInput, type HubunganWali,
} from '@/lib/queries-wali';
import { useAdminMahasiswa } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

const HUBUNGAN_LABEL: Record<HubunganWali, string> = {
  ayah: 'Ayah', ibu: 'Ibu', kakak: 'Kakak', saudara: 'Saudara', wali_lain: 'Wali lain',
};

export function AkademikWali() {
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading, error } = useAdminWali(activeQ || undefined);
  const actions = useAdminWaliActions();
  const [createOpen, setCreateOpen] = useState(false);
  const [linkFor, setLinkFor] = useState<WaliAdmin | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ email: string; password: string } | null>(null);

  return (
    <div className="stack">
      <PageHead
        eyebrow="ADMIN"
        title="Kelola Wali Mahasiswa"
        subtitle="Buat akun wali dan hubungkan dengan mahasiswa. Wali dapat melihat IPK, KRS, absensi, dan tagihan anaknya."
        right={<Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Tambah Wali</Button>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="nama wali / email / NIM atau nama mahasiswa" onKeyDown={(e) => e.key === 'Enter' && setActiveQ(q)} />
        </div>
        <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada wali">Klik "Tambah Wali" untuk membuat akun wali pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((w) => (
          <Card key={w.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Users size={16} className="muted" />
                  <strong>{w.nama}</strong>
                  {!w.user.isActive && <span className="pill pill--danger">Nonaktif</span>}
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {w.user.email}
                  {w.telepon && ` · ${w.telepon}`}
                  {w.user.lastLoginAt && ` · Login terakhir ${formatTanggalWaktu(w.user.lastLoginAt)}`}
                </div>
                <div style={{ marginTop: 6 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Anak terhubung:</div>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 'var(--text-sm)' }}>
                    {w.mahasiswa.map((m) => (
                      <li key={m.mahasiswa.id}>
                        <strong>{m.mahasiswa.nim}</strong> — {m.mahasiswa.nama} <span className="muted">({HUBUNGAN_LABEL[m.hubungan]})</span>
                        <Button size="sm" variant="ghost" leftIcon={<Unlink size={11} />}
                          onClick={async () => {
                            if (!confirm(`Putuskan link dengan ${m.mahasiswa.nama}?`)) return;
                            try { await actions.unlink.mutateAsync({ id: w.id, mahasiswaId: m.mahasiswa.id }); }
                            catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
                          }}
                          style={{ marginLeft: 8, fontSize: 'var(--text-xs)' }}>Unlink</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button size="sm" variant="ghost" leftIcon={<Link2 size={12} />} onClick={() => setLinkFor(w)}>Link Mhs</Button>
            </div>
          </Card>
        ))}
      </div>

      <CreateWaliModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(res) => { setCreatedResult({ email: res.email, password: res.password }); setCreateOpen(false); }}
      />

      {linkFor && (
        <LinkMahasiswaModal wali={linkFor} onClose={() => setLinkFor(null)} />
      )}

      {createdResult && (
        <Modal open onClose={() => setCreatedResult(null)} title="Akun wali dibuat" width={520}>
          <div className="stack" style={{ padding: 'var(--space-4)' }}>
            <Alert variant="warning" title="Catat password ini sekarang">Password tidak akan ditampilkan lagi.</Alert>
            <div>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Email</div>
              <div className="mono">{createdResult.email}</div>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{createdResult.password}</strong>
              <Button size="sm" variant="ghost" leftIcon={<Copy size={12} />} onClick={() => navigator.clipboard?.writeText(createdResult.password)}>Salin</Button>
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Wali wajib ganti password saat login pertama.
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" size="sm" onClick={() => setCreatedResult(null)}>Selesai</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateWaliModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: { email: string; password: string }) => void;
}) {
  const actions = useAdminWaliActions();
  const mhs = useAdminMahasiswa();
  const [form, setForm] = useState<WaliInput>({
    email: '', nama: '', telepon: '', mahasiswaIds: [], hubungan: 'wali_lain',
  });
  const [searchMhs, setSearchMhs] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!form.email || form.nama.length < 2 || form.mahasiswaIds.length === 0) {
      setErr('Email, nama (min 2 karakter), dan minimal 1 mahasiswa wajib dipilih');
      return;
    }
    try {
      const r = await actions.create.mutateAsync(form);
      onCreated(r);
      setForm({ email: '', nama: '', telepon: '', mahasiswaIds: [], hubungan: 'wali_lain' });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const toggleMhs = (id: string) => {
    setForm((f) => ({
      ...f,
      mahasiswaIds: f.mahasiswaIds.includes(id) ? f.mahasiswaIds.filter((x) => x !== id) : [...f.mahasiswaIds, id],
    }));
  };

  const mhsFiltered = (mhs.data?.items ?? []).filter((m) =>
    !searchMhs ||
    m.nim.includes(searchMhs) ||
    m.nama.toLowerCase().includes(searchMhs.toLowerCase()),
  ).slice(0, 50);

  return (
    <Modal open={open} onClose={onClose} title="Tambah akun wali" width={720}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })} placeholder="orangtua@email.com" />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Nama wali" value={form.nama} onChange={(e) => setForm({ ...form, nama: (e.target as HTMLInputElement).value })} />
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Telepon (opsional)" value={form.telepon ?? ''} onChange={(e) => setForm({ ...form, telepon: (e.target as HTMLInputElement).value })} />
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Hubungan" value={form.hubungan ?? 'wali_lain'} onChange={(e) => setForm({ ...form, hubungan: (e.target as HTMLSelectElement).value as HubunganWali })}>
              {(Object.keys(HUBUNGAN_LABEL) as HubunganWali[]).map((h) => <option key={h} value={h}>{HUBUNGAN_LABEL[h]}</option>)}
            </Select>
          </div>
        </div>

        <Input label="Cari mahasiswa untuk dihubungkan" value={searchMhs} onChange={(e) => setSearchMhs((e.target as HTMLInputElement).value)} placeholder="NIM atau nama" />
        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
          {mhsFiltered.map((m) => {
            const selected = form.mahasiswaIds.includes(m.id);
            return (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', gap: 'var(--space-2)', cursor: 'pointer', background: selected ? 'var(--surface-emphasized)' : undefined }}>
                <input type="checkbox" checked={selected} onChange={() => toggleMhs(m.id)} />
                <div>
                  <strong className="mono">{m.nim}</strong> — {m.nama}
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{m.prodi.nama}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{form.mahasiswaIds.length} mahasiswa terpilih</div>

        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          Password akan di-generate otomatis. Wali wajib ganti password saat login pertama.
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={actions.create.isPending} onClick={submit}>{actions.create.isPending ? 'Membuat…' : 'Buat akun'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function LinkMahasiswaModal({ wali, onClose }: { wali: WaliAdmin; onClose: () => void }) {
  const actions = useAdminWaliActions();
  const mhs = useAdminMahasiswa();
  const [mahasiswaId, setMahasiswaId] = useState('');
  const [hubungan, setHubungan] = useState<HubunganWali>('wali_lain');
  const [err, setErr] = useState<string | null>(null);
  const linked = new Set(wali.mahasiswa.map((m) => m.mahasiswa.id));

  const submit = async () => {
    setErr(null);
    if (!mahasiswaId) { setErr('Pilih mahasiswa'); return; }
    try {
      await actions.link.mutateAsync({ id: wali.id, mahasiswaId, hubungan });
      onClose();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Link mahasiswa — ${wali.nama}`} width={560}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Select label="Mahasiswa" value={mahasiswaId} onChange={(e) => setMahasiswaId((e.target as HTMLSelectElement).value)}>
          <option value="">— pilih mahasiswa —</option>
          {mhs.data?.items
            .filter((m) => !linked.has(m.id))
            .map((m) => <option key={m.id} value={m.id}>{m.nim} — {m.nama}</option>)}
        </Select>
        <Select label="Hubungan" value={hubungan} onChange={(e) => setHubungan((e.target as HTMLSelectElement).value as HubunganWali)}>
          {(Object.keys(HUBUNGAN_LABEL) as HubunganWali[]).map((h) => <option key={h} value={h}>{HUBUNGAN_LABEL[h]}</option>)}
        </Select>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={actions.link.isPending} onClick={submit}>Link</Button>
        </div>
      </div>
    </Modal>
  );
}
