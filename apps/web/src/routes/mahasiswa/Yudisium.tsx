import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { Printer, X } from 'lucide-react';
import { useYudisiumKelayakan, useYudisium, useYudisiumActions, type YudisiumItem } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggal, formatIp } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { DataPair } from '@/components/DataPair';

const PREDIKAT_LABEL: Record<string, string> = {
  cumlaude: 'Cumlaude',
  sangat_memuaskan: 'Sangat Memuaskan',
  memuaskan: 'Memuaskan',
  tidak_lulus: 'Belum Lulus',
};

export function MahasiswaYudisium() {
  const kelayakan = useYudisiumKelayakan();
  const list = useYudisium();
  const { daftar, batal } = useYudisiumActions();
  const navigate = useNavigate();

  const onDaftar = async (periodeId: string) => {
    try { await daftar.mutateAsync(periodeId); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };
  const onBatal = async (y: YudisiumItem) => {
    if (!confirm(`Batalkan pendaftaran wisuda ${y.periode.kode}?`)) return;
    try { await batal.mutateAsync(y.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="KELULUSAN"
        title="Wisuda & Yudisium"
        subtitle="Pantau kelayakan, daftar wisuda, dan unduh SKL Anda."
      />

      {kelayakan.isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat…</p></Card>}

      {kelayakan.data && (
        <Card>
          <div className="row" style={{ gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            <DataPair label="IPK" value={formatIp(kelayakan.data.ipk)} />
            <DataPair label="SKS Lulus" value={kelayakan.data.sksLulus.toString()} />
            <DataPair
              label="Skripsi Lulus"
              value={kelayakan.data.lulusSkripsi ? 'Ya' : 'Belum'}
              tone={kelayakan.data.lulusSkripsi ? 'success' : 'danger'}
              statusIcon
            />
            <DataPair
              label="Nilai E"
              value={kelayakan.data.adaE ? 'Ada' : 'Tidak'}
              tone={!kelayakan.data.adaE ? 'success' : 'danger'}
              statusIcon
            />
            <DataPair
              label="Predikat"
              value={PREDIKAT_LABEL[kelayakan.data.predikat] ?? '—'}
            />
          </div>
          {!kelayakan.data.layak && (
            <Alert variant="warning" title="Belum memenuhi syarat" style={{ marginTop: 'var(--space-3)' }}>
              {!kelayakan.data.lulusSkripsi && 'Skripsi belum dinyatakan lulus. '}
              {kelayakan.data.adaE && 'Masih ada nilai E di transkrip. '}
              {kelayakan.data.ipk < 2.0 && `IPK kurang dari 2.00 (saat ini ${formatIp(kelayakan.data.ipk)}). `}
            </Alert>
          )}
        </Card>
      )}

      {kelayakan.data && kelayakan.data.periodeTersedia.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Periode wisuda terbuka</h3>
          <div className="stack" style={{ gap: 'var(--space-3)' }}>
            {kelayakan.data.periodeTersedia.map((p) => (
              <div key={p.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <strong style={{ color: 'var(--text-strong)' }}>{p.nama}</strong>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                    Tanggal {formatTanggal(p.tanggal)}
                    {p.batasIpk && ` · syarat IPK ≥ ${p.batasIpk.toFixed(2)}`}
                    {p.batasSks && ` · SKS ≥ ${p.batasSks}`}
                  </div>
                </div>
                {p.sudahDaftar
                  ? <span className="pill pill--info">Sudah terdaftar</span>
                  : p.memenuhiSyarat
                    ? <Button size="sm" variant="primary" disabled={daftar.isPending} onClick={() => onDaftar(p.id)}>Daftar</Button>
                    : <Button size="sm" variant="ghost" disabled>Belum memenuhi syarat</Button>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <h3 style={{ margin: 'var(--space-4) 0 0', color: 'var(--text-strong)' }}>Riwayat pendaftaran</h3>

      {list.data && list.data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pendaftaran">Daftar di salah satu periode terbuka di atas.</Alert>
      )}

      <div className="stack">
        {list.data?.items.map((y) => (
          <Card key={y.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <StatusPill status={y.status} />
                  {y.predikat && <span className="pill pill--success">{PREDIKAT_LABEL[y.predikat]}</span>}
                </div>
                <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 6 }}>{y.periode.nama}</strong>
                <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  Wisuda {formatTanggal(y.periode.tanggal)} · IPK saat daftar <span className="mono">{formatIp(y.ipk)}</span> · {y.sksLulus} SKS
                </div>
                {y.noSkl && (
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    No. SKL: <span className="mono">{y.noSkl}</span>{y.noIjazah && <> · No. Ijazah: <span className="mono">{y.noIjazah}</span></>}
                  </div>
                )}
                {y.catatan && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Catatan akademik:</strong> {y.catatan}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {(y.status === 'layak' || y.status === 'wisuda') && (
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Printer size={14} />}
                    onClick={() => navigate(`/mahasiswa/yudisium/${y.id}/skl`)}
                  >
                    Cetak SKL
                  </Button>
                )}
                {(y.status === 'pendaftaran' || y.status === 'verifikasi' || y.status === 'tidak_layak') && (
                  <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => onBatal(y)}>Batalkan</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

