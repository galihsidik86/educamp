import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { CheckCircle2, XCircle, Search, Wallet, Banknote } from 'lucide-react';
import { useAdminPembayaran, useKeuanganActions, type PembayaranAdmin } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { formatRupiah, formatTanggal, formatTanggalWaktu, formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AkademikVerifikasiPembayaran() {
  const [status, setStatus] = useState('menunggu');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading, error } = useAdminPembayaran({ status: status || undefined, q: activeQ || undefined });
  const actions = useKeuanganActions();
  const [actErr, setActErr] = useState<string | null>(null);
  const [actOk, setActOk] = useState<string | null>(null);

  const verif = (p: PembayaranAdmin, action: 'setujui' | 'tolak') => {
    const catatan = action === 'tolak' ? prompt('Alasan penolakan (opsional):') ?? undefined : undefined;
    actions.verifikasiPembayaran.mutate({ id: p.id, action, catatan }, {
      onSuccess: () => setActOk(`Pembayaran ${action === 'setujui' ? 'disetujui' : 'ditolak'}.`),
      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
    });
  };

  const menunggu = data?.items.filter((p) => p.status === 'menunggu').length ?? 0;

  return (
    <div className="stack">
      <PageHead
        eyebrow="KEUANGAN"
        title="Verifikasi Pembayaran"
        subtitle="Validasi bukti pembayaran yang diunggah mahasiswa sebelum masuk rekonsiliasi bank."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {actOk && <Alert variant="success" title="Berhasil">{actOk}</Alert>}

      {menunggu > 0 && status !== 'menunggu' && (
        <Alert variant="warning" title={`${menunggu} pembayaran menunggu verifikasi`}>
          <Button variant="ghost" size="sm" onClick={() => setStatus('menunggu')}>Lihat yang menunggu</Button>
        </Alert>
      )}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
            <option value="">Semua</option>
            <option value="menunggu">Menunggu</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="NIM / nama mahasiswa" onKeyDown={(e) => e.key === 'Enter' && setActiveQ(q)} />
        </div>
        <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
            <Wallet size={28} className="muted" />
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Tidak ada pembayaran pada filter ini.</p>
          </div>
        </Card>
      )}
      {data && data.items.length > 0 && (
        <div className="stack">
          {data.items.map((p) => (
            <Card key={p.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-strong)' }}>{p.mahasiswa.nama}</strong>
                    <span className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>· {p.mahasiswa.nim}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    {p.tagihan.deskripsi} ({formatStatus(p.tagihan.jenis)})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: p.status === 'disetujui' ? 'var(--success-fg)' : p.status === 'ditolak' ? 'var(--danger-fg)' : 'var(--warning-fg)' }}>
                    {formatRupiah(p.jumlah)}
                  </div>
                  <Badge variant={p.status === 'disetujui' ? 'success' : p.status === 'ditolak' ? 'danger' : 'warning'} dot>{p.status}</Badge>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                <div className="row" style={{ gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Tanggal bayar</div>
                    <div className="mono">{formatTanggal(p.tanggalBayar)}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Metode</div>
                    <div>{formatStatus(p.metode)}</div>
                  </div>
                  {p.noReferensi && (
                    <div>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>No Referensi</div>
                      <div className="mono">{p.noReferensi}</div>
                    </div>
                  )}
                  {p.bankPengirim && (
                    <div>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Bank Pengirim</div>
                      <div className="row" style={{ gap: 4 }}><Banknote size={12} className="muted" />{p.bankPengirim}</div>
                    </div>
                  )}
                  {p.bankPenerima && (
                    <div>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Bank Penerima</div>
                      <div className="row" style={{ gap: 4 }}><Banknote size={12} className="muted" />{p.bankPenerima}</div>
                    </div>
                  )}
                </div>
                {p.catatan && (
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                    Catatan mahasiswa: {p.catatan}
                  </div>
                )}
              </div>

              {p.buktiUrl && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <a href={p.buktiUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-sm)' }}>
                    📎 Buka bukti pembayaran
                  </a>
                </div>
              )}

              {p.status !== 'menunggu' && (
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                  {p.status === 'disetujui' ? 'Disetujui' : 'Ditolak'} oleh <strong>{p.divalidasiOleh ?? '—'}</strong>
                  {p.validasiPada && <> · {formatTanggalWaktu(p.validasiPada)}</>}
                  {p.catatanValidasi && <div>Catatan: {p.catatanValidasi}</div>}
                </div>
              )}

              {p.status === 'menunggu' && (
                <div className="row" style={{ marginTop: 'var(--space-3)', gap: 6, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" leftIcon={<XCircle size={14} />} onClick={() => verif(p, 'tolak')}>Tolak</Button>
                  <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />} onClick={() => verif(p, 'setujui')}>Setujui & catat</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
