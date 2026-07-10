import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Download, Calendar, Banknote, Wallet, Search } from 'lucide-react';
import { useRekonsiliasi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { formatRupiah, formatTanggal, formatStatus } from '@/lib/format';
import { tokenStore } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

function ymd(d: Date): string { return d.toISOString().slice(0, 10); }

export function AkademikRekonsiliasiBank() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [dari, setDari] = useState(ymd(firstOfMonth));
  const [sampai, setSampai] = useState(ymd(lastOfMonth));
  const [bankPenerima, setBankPenerima] = useState('');
  const [metode, setMetode] = useState('');

  const { data, isLoading, error } = useRekonsiliasi({
    dari, sampai,
    bankPenerima: bankPenerima || undefined,
    metode: metode || undefined,
  });

  const presetBulanIni = () => {
    setDari(ymd(firstOfMonth));
    setSampai(ymd(lastOfMonth));
  };
  const presetBulanLalu = () => {
    const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lme = new Date(today.getFullYear(), today.getMonth(), 0);
    setDari(ymd(lm));
    setSampai(ymd(lme));
  };

  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.items ?? [];
    return (data?.items ?? []).filter((p) =>
      p.mahasiswa.nim.toLowerCase().includes(query) ||
      p.mahasiswa.nama.toLowerCase().includes(query) ||
      (p.noReferensi ?? '').toLowerCase().includes(query),
    );
  }, [data, q]);

  const csvUrl = useMemo(() => {
    const qs = new URLSearchParams({ dari, sampai, format: 'csv' });
    if (bankPenerima) qs.set('bankPenerima', bankPenerima);
    if (metode) qs.set('metode', metode);
    return `/api/akademik/keuangan/rekonsiliasi?${qs}`;
  }, [dari, sampai, bankPenerima, metode]);

  const downloadCsv = async () => {
    const token = tokenStore.getAccess();
    const res = await fetch(csvUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { alert('Gagal mengunduh CSV'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekonsiliasi-${dari}-sd-${sampai}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="KEUANGAN"
        title="Rekonsiliasi Bank"
        subtitle="Daftar pembayaran disetujui per periode untuk dicocokkan dengan mutasi rekening bank kampus."
        right={
          <Button variant="primary" size="sm" leftIcon={<Download size={14} />} onClick={downloadCsv} disabled={!data}>
            Export CSV
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <Card>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 160 }}>
            <Input label="Dari tanggal" type="date" value={dari} onChange={(e) => setDari((e.target as HTMLInputElement).value)} />
          </div>
          <div style={{ minWidth: 160 }}>
            <Input label="Sampai tanggal" type="date" value={sampai} onChange={(e) => setSampai((e.target as HTMLInputElement).value)} />
          </div>
          <div className="row" style={{ gap: 4, marginTop: 18 }}>
            <Button variant="ghost" size="sm" onClick={presetBulanIni}>Bulan ini</Button>
            <Button variant="ghost" size="sm" onClick={presetBulanLalu}>Bulan lalu</Button>
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          <div style={{ minWidth: 200 }}>
            <Input label="Filter Bank Penerima" value={bankPenerima} onChange={(e) => setBankPenerima((e.target as HTMLInputElement).value)} placeholder="BSI Tazkia" />
          </div>
          <div style={{ minWidth: 180 }}>
            <Select label="Filter Metode" value={metode} onChange={(e) => setMetode((e.target as HTMLSelectElement).value)}>
              <option value="">Semua</option>
              <option value="transfer_bank">Transfer Bank</option>
              <option value="va">Virtual Account</option>
              <option value="qris">QRIS</option>
              <option value="ewallet">E-wallet</option>
              <option value="tunai">Tunai</option>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            <Card>
              <div className="row muted" style={{ gap: 4, fontSize: 'var(--text-xs)' }}><Calendar size={14} />Periode</div>
              <div style={{ marginTop: 4, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                {formatTanggal(data.periode.dari)} – {formatTanggal(data.periode.sampai)}
              </div>
            </Card>
            <Card>
              <div className="row muted" style={{ gap: 4, fontSize: 'var(--text-xs)' }}><Wallet size={14} />Total Dana Masuk</div>
              <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--success-fg)' }}>{formatRupiah(data.ringkasan.total)}</div>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{data.ringkasan.jumlahTransaksi} transaksi</div>
            </Card>
            <Card>
              <div className="row muted" style={{ gap: 4, fontSize: 'var(--text-xs)' }}><Banknote size={14} />Breakdown per Metode</div>
              <div style={{ marginTop: 4 }}>
                {data.ringkasan.perMetode.length === 0 && <span className="muted">—</span>}
                {data.ringkasan.perMetode.map((m) => (
                  <div key={m.metode} className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span>{formatStatus(m.metode)}</span>
                    <span className="mono"><strong>{formatRupiah(m.total)}</strong> <span className="muted">({m.count})</span></span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {data.items.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                <Banknote size={28} className="muted" />
                <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Tidak ada pembayaran disetujui dalam periode ini.</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
                  <Input
                    icon={<Search size={16} />}
                    placeholder="Cari NIM, nama, atau no. referensi…"
                    value={q}
                    onChange={(e) => setQ((e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
              {items.length === 0 && (
                <p className="muted">Tidak ada transaksi yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
              )}
              <div className="tz-table-wrap">
              <table className="tz-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. Referensi</th>
                    <th>NIM</th>
                    <th>Mahasiswa</th>
                    <th>Jenis Tagihan</th>
                    <th>Metode</th>
                    <th>Bank Pengirim</th>
                    <th>Bank Penerima</th>
                    <th className="num">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{formatTanggal(p.tanggalBayar)}</td>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{p.noReferensi ?? '—'}</td>
                      <td className="mono">{p.mahasiswa.nim}</td>
                      <td>{p.mahasiswa.nama}<div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{p.mahasiswa.prodi.kode}</div></td>
                      <td>
                        <Badge variant="neutral">{formatStatus(p.tagihan.jenis)}</Badge>
                        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{p.tagihan.semester?.kode ?? '—'}</div>
                      </td>
                      <td>{formatStatus(p.metode)}</td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{p.bankPengirim ?? '—'}</td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{p.bankPenerima ?? '—'}</td>
                      <td className="num mono"><strong>{formatRupiah(p.jumlah)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'right' }}><strong>TOTAL</strong></td>
                    <td className="num mono"><strong>{formatRupiah(data.ringkasan.total)}</strong></td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
