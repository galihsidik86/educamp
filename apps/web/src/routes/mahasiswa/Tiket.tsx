import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, ChevronRight, LifeBuoy } from 'lucide-react';
import {
  useMahasiswaTiketList, useMahasiswaTiketActions,
  type KategoriTiket,
} from '@/lib/queries-tiket';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const KATEGORI: Array<{ v: KategoriTiket; label: string }> = [
  { v: 'krs', label: 'KRS' },
  { v: 'keuangan', label: 'Keuangan' },
  { v: 'akun', label: 'Akun & Login' },
  { v: 'nilai', label: 'Nilai' },
  { v: 'layanan', label: 'Layanan Akademik' },
  { v: 'lain', label: 'Lain' },
];

export function MahasiswaTiket() {
  const { data, isLoading, error } = useMahasiswaTiketList();
  const actions = useMahasiswaTiketActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ kategori: KategoriTiket; judul: string; deskripsi: string }>({
    kategori: 'krs', judul: '', deskripsi: '',
  });
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    if (form.judul.trim().length < 5 || form.deskripsi.trim().length < 10) {
      setActErr('Judul minimal 5 karakter, deskripsi minimal 10 karakter');
      return;
    }
    try {
      await actions.create.mutateAsync(form);
      setModalOpen(false);
      setForm({ kategori: 'krs', judul: '', deskripsi: '' });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Tiket Bantuan"
        subtitle="Lapor masalah seputar KRS, keuangan, akun, dan layanan akademik lain."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => { setActErr(null); setModalOpen(true); }}>
            Tiket Baru
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && !modalOpen && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada tiket">Klik "Tiket Baru" untuk mengajukan bantuan.</Alert>
      )}

      <div className="stack">
        {data?.items.map((t) => (
          <Link key={t.id} to={`/mahasiswa/tiket/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <LifeBuoy size={16} className="muted" />
                    <strong style={{ color: 'var(--text-strong)' }}>{t.judul}</strong>
                    <StatusPill status={t.status} />
                    <span className="pill pill--neutral">{KATEGORI.find((k) => k.v === t.kategori)?.label ?? t.kategori}</span>
                  </div>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    Dibuat {formatTanggalWaktu(t.createdAt)} · {t._count?.replies ?? 0} balasan
                  </div>
                </div>
                <ChevronRight size={18} className="muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tiket bantuan baru" width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Select label="Kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: (e.target as HTMLSelectElement).value as KategoriTiket })}>
            {KATEGORI.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
          </Select>
          <Input label="Judul singkat" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} placeholder="Tidak bisa input KRS — error 500" />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Deskripsi lengkap</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={6}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              placeholder="Jelaskan langkah-langkah dan pesan error yang muncul, atau lampirkan informasi yang relevan."
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending} onClick={save}>
              {actions.create.isPending ? 'Mengirim…' : 'Kirim tiket'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
