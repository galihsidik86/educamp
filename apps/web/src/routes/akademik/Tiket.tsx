import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, Input, Select } from '@/ds';
import { ChevronRight, LifeBuoy } from 'lucide-react';
import { useAkademikTiketList, type KategoriTiket, type StatusTiket } from '@/lib/queries-tiket';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';

const KATEGORI_OPTS: Array<{ v: KategoriTiket; label: string }> = [
  { v: 'krs', label: 'KRS' },
  { v: 'keuangan', label: 'Keuangan' },
  { v: 'akun', label: 'Akun & Login' },
  { v: 'nilai', label: 'Nilai' },
  { v: 'layanan', label: 'Layanan Akademik' },
  { v: 'lain', label: 'Lain' },
];

const STATUS_OPTS: Array<{ v: StatusTiket; label: string }> = [
  { v: 'terbuka', label: 'Terbuka' },
  { v: 'proses', label: 'Proses' },
  { v: 'menunggu_user', label: 'Menunggu mahasiswa' },
  { v: 'selesai', label: 'Selesai' },
  { v: 'ditutup', label: 'Ditutup' },
];

export function AkademikTiket() {
  const [status, setStatus] = useState<StatusTiket | ''>('');
  const [kategori, setKategori] = useState<KategoriTiket | ''>('');
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useAkademikTiketList({
    status: status || undefined,
    kategori: kategori || undefined,
    q: q || undefined,
  });

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Helpdesk / Tiket Bantuan"
        subtitle="Tangani permintaan bantuan mahasiswa terkait KRS, keuangan, akun, dan layanan lain."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as StatusTiket | '')}>
            <option value="">Semua</option>
            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Kategori" value={kategori} onChange={(e) => setKategori((e.target as HTMLSelectElement).value as KategoriTiket | '')}>
            <option value="">Semua</option>
            {KATEGORI_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="judul / NIM / nama mahasiswa" />
        </div>
      </div>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Tidak ada tiket">Tidak ada tiket pada filter ini.</Alert>
      )}

      <div className="stack">
        {data?.items.map((t) => (
          <Link key={t.id} to={`/akademik/tiket/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card hover>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <LifeBuoy size={16} className="muted" />
                    <strong style={{ color: 'var(--text-strong)' }}>{t.judul}</strong>
                    <StatusPill status={t.status} />
                    <span className="pill pill--neutral">{KATEGORI_OPTS.find((k) => k.v === t.kategori)?.label ?? t.kategori}</span>
                    {t.prioritas === 'tinggi' && <span className="pill pill--danger">Prioritas tinggi</span>}
                  </div>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {t.mahasiswa ? `${t.mahasiswa.nim} — ${t.mahasiswa.nama} · ${t.mahasiswa.prodi.kode}` : ''}
                    {' · '}{formatTanggalWaktu(t.updatedAt)}
                    {' · '}{t._count?.replies ?? 0} balasan
                  </div>
                </div>
                <ChevronRight size={18} className="muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
