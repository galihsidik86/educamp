import { useState } from 'react';
import { Card, Alert, Button, Input } from '@/ds';
import { Plus } from 'lucide-react';
import { useKkn, useKknActions, type KknDaftarInput } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

const JENIS = ['Ganjil', 'Genap', 'Pendek'] as const;
const TAHUN_NOW = new Date().getFullYear();
const TAHUN_OPSI = [TAHUN_NOW - 1, TAHUN_NOW, TAHUN_NOW + 1];

export function MahasiswaKkn() {
  const { data, isLoading, error } = useKkn();
  const { daftar } = useKknActions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<KknDaftarInput>({ periode: `${TAHUN_NOW} Genap`, lokasi: '' });
  const [actErr, setActErr] = useState<string | null>(null);

  // tentukan tahun & jenis dari form.periode
  const [tahunStr, jenis] = form.periode.split(' ');
  const tahun = Number(tahunStr) || TAHUN_NOW;

  const setPeriode = (t: number, j: string) => setForm({ ...form, periode: `${t} ${j}` });

  const submit = async () => {
    setActErr(null);
    if (!form.lokasi.trim()) { setActErr('Lokasi wajib diisi'); return; }
    try {
      await daftar.mutateAsync({
        ...form,
        desa: form.desa?.trim() || undefined,
        kecamatan: form.kecamatan?.trim() || undefined,
        kabupaten: form.kabupaten?.trim() || undefined,
      });
      setOpen(false);
      setForm({ periode: `${TAHUN_NOW} Genap`, lokasi: '' });
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="TRI DHARMA"
        title="Kuliah Kerja Nyata"
        subtitle="Riwayat pendaftaran & penugasan KKN."
        right={
          <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => { setActErr(null); setOpen(true); }}>
            Daftar KKN
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum mendaftar KKN">Klik "Daftar KKN" untuk mendaftar periode berikutnya.</Alert>
      )}

      <div className="card-list">
        {data?.items.map((k) => (
          <Card key={k.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="card-list-item__title">Periode {k.periode}</p>
                <div className="card-list-item__meta">
                  <span>Lokasi: {k.lokasi}</span>
                  {k.desa && <span>Desa: {k.desa}</span>}
                  {k.kecamatan && <span>Kec.: {k.kecamatan}</span>}
                  {k.kabupaten && <span>Kab.: {k.kabupaten}</span>}
                  {k.dpl && <span>DPL: {k.dpl}</span>}
                  {k.tanggalMulai && <span>{formatTanggal(k.tanggalMulai)} – {formatTanggal(k.tanggalSelesai)}</span>}
                  {k.nilai && <span>Nilai: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{k.nilai}</strong></span>}
                </div>
              </div>
              <StatusPill status={k.status} />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Daftar KKN" width={520}>
        <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Tahun</label>
              <select
                value={tahun}
                onChange={(e) => setPeriode(Number(e.target.value), jenis ?? 'Genap')}
                className="tz-input"
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)' }}
              >
                {TAHUN_OPSI.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Jenis</label>
              <select
                value={jenis ?? 'Genap'}
                onChange={(e) => setPeriode(tahun, e.target.value)}
                className="tz-input"
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)' }}
              >
                {JENIS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>
          <Input label="Lokasi (kota/kabupaten)" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: (e.target as HTMLInputElement).value })} placeholder="mis. Bogor" />
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}><Input label="Desa (opsional)" value={form.desa ?? ''} onChange={(e) => setForm({ ...form, desa: (e.target as HTMLInputElement).value })} /></div>
            <div style={{ flex: 1 }}><Input label="Kecamatan" value={form.kecamatan ?? ''} onChange={(e) => setForm({ ...form, kecamatan: (e.target as HTMLInputElement).value })} /></div>
          </div>
          <Input label="Kabupaten" value={form.kabupaten ?? ''} onChange={(e) => setForm({ ...form, kabupaten: (e.target as HTMLInputElement).value })} />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={daftar.isPending} onClick={submit}>
              {daftar.isPending ? 'Mendaftarkan…' : 'Daftar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
