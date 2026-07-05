import { useState } from 'react';
import { safeHref } from '../../lib/format';
import { Alert, Badge, Button, Card, Input, Select, StatCard } from '@/ds';
import { Wallet, CheckCircle2, AlertCircle, Upload, Trash2, FileCheck, Clock, XCircle } from 'lucide-react';
import { useKeuangan, useKeuanganActions, type Tagihan, type UploadBuktiBody } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatRupiah, formatTanggal, formatTanggalWaktu, formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function MahasiswaKeuangan() {
  const { data, isLoading, error } = useKeuangan();
  const actions = useKeuanganActions();
  const [uploadFor, setUploadFor] = useState<Tagihan | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [actOk, setActOk] = useState<string | null>(null);

  const cancelBukti = (id: string) => {
    if (!confirm('Batalkan bukti pembayaran ini?')) return;
    actions.batalBukti.mutate(id, {
      onSuccess: () => setActOk('Bukti dibatalkan.'),
      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
    });
  };

  return (
    <div className="stack">
      <PageHead eyebrow="KEUANGAN" title="Tagihan & Pembayaran" subtitle="Status keuangan semester aktif & upload bukti pembayaran." />

      {error && <Alert variant="danger" title="Gagal memuat data">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {actOk && <Alert variant="success" title="Berhasil">{actOk}</Alert>}

      {data && (
        <div className="kpi-grid">
          <StatCard label="Total Tagihan" value={formatRupiah(data.ringkasan.totalTagihan)} icon={<Wallet size={20} />} />
          <StatCard label="Sudah Dibayar" value={formatRupiah(data.ringkasan.totalDibayar)} icon={<CheckCircle2 size={20} />} />
          <StatCard label="Sisa Tagihan" value={formatRupiah(data.ringkasan.totalSisa)} icon={<AlertCircle size={20} />} />
        </div>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Jenis</th><th>Deskripsi</th><th>Semester</th>
              <th className="num">Jumlah</th><th className="num">Dibayar</th><th className="num">Sisa</th>
              <th>Jatuh Tempo</th><th>Status</th><th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Belum ada tagihan.</td></tr>}
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td>{formatStatus(t.jenis)}</td>
                <td>{t.deskripsi}</td>
                <td className="mono" style={{ textTransform: 'capitalize' }}>{t.semester}</td>
                <td className="num">{formatRupiah(t.jumlah)}</td>
                <td className="num">
                  {formatRupiah(t.dibayar)}
                  {t.menunggu > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--warning-fg)' }}>+{formatRupiah(t.menunggu)} menunggu</div>
                  )}
                </td>
                <td className="num"><strong>{formatRupiah(t.sisa)}</strong></td>
                <td>{formatTanggal(t.jatuhTempo)}</td>
                <td><StatusPill status={t.status} /></td>
                <td style={{ textAlign: 'right' }}>
                  {t.status !== 'lunas' && t.sisa > 0 && (
                    <Button variant="primary" size="sm" leftIcon={<Upload size={14} />} onClick={() => setUploadFor(t)}>
                      Upload Bukti
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: '8px 0 0', color: 'var(--text-strong)' }}>Riwayat Pembayaran</h3>
      <div className="card-list">
        {data?.items.flatMap((t) =>
          t.pembayaran.map((p) => (
            <Card key={p.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                  <p className="card-list-item__title">{t.deskripsi}</p>
                  <div className="card-list-item__meta">
                    <span>{formatTanggal(p.tanggalBayar)}</span>
                    <span>{formatStatus(p.metode)}</span>
                    {p.noReferensi && <span className="mono">Ref: {p.noReferensi}</span>}
                  </div>
                  {(p.bankPengirim || p.bankPenerima) && (
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {p.bankPengirim && <>Dari: {p.bankPengirim}{p.bankPenerima ? ' → ' : ''}</>}
                      {p.bankPenerima && <>Ke: {p.bankPenerima}</>}
                    </div>
                  )}
                  {safeHref(p.buktiUrl) && (
                    <div style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                      <a href={safeHref(p.buktiUrl)!} target="_blank" rel="noopener noreferrer">📎 Bukti</a>
                    </div>
                  )}
                  {p.status === 'ditolak' && p.catatanValidasi && (
                    <Alert variant="warning" style={{ marginTop: 6 }}>Catatan akademik: {p.catatanValidasi}</Alert>
                  )}
                  {p.status === 'disetujui' && p.validasiPada && (
                    <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                      Diverifikasi {formatTanggalWaktu(p.validasiPada)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: p.status === 'disetujui' ? 'var(--success-fg)' : p.status === 'ditolak' ? 'var(--danger-fg)' : 'var(--warning-fg)' }}>
                    {formatRupiah(p.jumlah)}
                  </strong>
                  <div style={{ marginTop: 4 }}>
                    {p.status === 'menunggu' && (
                      <Badge variant="warning" dot><Clock size={10} style={{ display: 'inline', marginRight: 2 }} />Menunggu</Badge>
                    )}
                    {p.status === 'disetujui' && (
                      <Badge variant="success" dot><FileCheck size={10} style={{ display: 'inline', marginRight: 2 }} />Disetujui</Badge>
                    )}
                    {p.status === 'ditolak' && (
                      <Badge variant="danger" dot><XCircle size={10} style={{ display: 'inline', marginRight: 2 }} />Ditolak</Badge>
                    )}
                  </div>
                  {p.status === 'menunggu' && (
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => cancelBukti(p.id)} style={{ marginTop: 4 }}>
                      Batalkan
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )),
        )}
        {data && data.items.every((t) => t.pembayaran.length === 0) && (
          <Card><p className="muted" style={{ margin: 0 }}>Belum ada pembayaran tercatat.</p></Card>
        )}
      </div>

      {uploadFor && (
        <UploadBuktiModal
          tagihan={uploadFor}
          onClose={() => setUploadFor(null)}
          onErr={setActErr}
          onOk={() => { setUploadFor(null); setActOk('Bukti dikirim, menunggu verifikasi akademik.'); }}
        />
      )}
    </div>
  );
}

function UploadBuktiModal({ tagihan, onClose, onErr, onOk }: {
  tagihan: Tagihan; onClose: () => void; onErr: (s: string) => void; onOk: () => void;
}) {
  const actions = useKeuanganActions();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<UploadBuktiBody>({
    tagihanId: tagihan.id,
    jumlah: tagihan.sisa,
    tanggalBayar: today,
    metode: 'transfer_bank',
    buktiUrl: '',
  });

  return (
    <Modal open onClose={onClose} title="Upload Bukti Pembayaran" width={620}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.buktiUrl.trim()) { onErr('URL bukti wajib diisi'); return; }
          actions.uploadBukti.mutate(form, {
            onSuccess: onOk,
            onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal kirim bukti'),
          });
        }}
      >
        <Alert variant="info">
          <strong>{tagihan.deskripsi}</strong> · sisa <strong>{formatRupiah(tagihan.sisa)}</strong><br />
          Setelah dikirim, bukti akan diverifikasi oleh Bagian Akademik dalam 1–2 hari kerja.
        </Alert>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input
              label={`Jumlah dibayar (Rp) · max ${formatRupiah(tagihan.sisa)}`}
              type="number"
              min={1}
              max={tagihan.sisa}
              value={String(form.jumlah)}
              onChange={(e) => setForm({ ...form, jumlah: Number((e.target as HTMLInputElement).value) })}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Tanggal bayar" type="date" value={form.tanggalBayar} onChange={(e) => setForm({ ...form, tanggalBayar: (e.target as HTMLInputElement).value })} required />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Metode" value={form.metode} onChange={(e) => setForm({ ...form, metode: (e.target as HTMLSelectElement).value as any })}>
              <option value="transfer_bank">Transfer Bank</option>
              <option value="va">Virtual Account (VA)</option>
              <option value="qris">QRIS</option>
              <option value="ewallet">E-wallet</option>
              <option value="tunai">Tunai</option>
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="No. Referensi / Transaksi" value={form.noReferensi ?? ''} onChange={(e) => setForm({ ...form, noReferensi: (e.target as HTMLInputElement).value })} placeholder="Tertera di mutasi bank" />
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Input label="Bank Pengirim" value={form.bankPengirim ?? ''} onChange={(e) => setForm({ ...form, bankPengirim: (e.target as HTMLInputElement).value })} placeholder="BSI / BCA / Mandiri / ..." />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Bank Penerima (kampus)" value={form.bankPenerima ?? ''} onChange={(e) => setForm({ ...form, bankPenerima: (e.target as HTMLInputElement).value })} placeholder="BSI Tazkia" />
          </div>
        </div>

        <Input
          label="URL Bukti (gambar / PDF)"
          value={form.buktiUrl}
          onChange={(e) => setForm({ ...form, buktiUrl: (e.target as HTMLInputElement).value })}
          required
          placeholder="https://drive.google.com/file/d/... atau link langsung gambar"
        />
        <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
          Upload bukti ke Google Drive (set "Anyone with the link") atau imgur, lalu paste URL-nya di sini.
        </p>

        <Input
          label="Catatan (opsional)"
          value={form.catatan ?? ''}
          onChange={(e) => setForm({ ...form, catatan: (e.target as HTMLInputElement).value })}
          placeholder="Mis. Cicilan 1 dari 2"
        />

        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" leftIcon={<Upload size={14} />} disabled={actions.uploadBukti.isPending}>
            {actions.uploadBukti.isPending ? 'Mengirim…' : 'Kirim Bukti'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
