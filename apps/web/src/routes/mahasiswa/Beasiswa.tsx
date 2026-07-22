import { useState } from 'react';
import { Alert, Button, Card } from '@/ds';
import { Plus, X, ExternalLink } from 'lucide-react';
import { useBeasiswaTersedia, useBeasiswaRiwayat, useBeasiswaActions, type BeasiswaTersediaItem, type PendaftaranBeasiswaItem } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal, formatRupiah } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

type Tab = 'tersedia' | 'riwayat';

export function MahasiswaBeasiswa() {
  const [tab, setTab] = useState<Tab>('tersedia');
  const tersedia = useBeasiswaTersedia();
  const riwayat = useBeasiswaRiwayat();
  const { daftar, batal } = useBeasiswaActions();
  const [modalDaftar, setModalDaftar] = useState<BeasiswaTersediaItem | null>(null);

  const onBatal = async (p: PendaftaranBeasiswaItem) => {
    if (!confirm(`Batalkan pendaftaran ${p.beasiswa.nama}?`)) return;
    try { await batal.mutateAsync(p.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Beasiswa"
        subtitle="Lihat beasiswa terbuka dan kelola pendaftaran Anda."
      />

      <div className="tablist">
        <button onClick={() => setTab('tersedia')} aria-selected={tab === 'tersedia'}>Tersedia</button>
        <button onClick={() => setTab('riwayat')} aria-selected={tab === 'riwayat'}>
          Riwayat {riwayat.data && `(${riwayat.data.items.length})`}
        </button>
      </div>

      {tab === 'tersedia' && (
        <>
          {tersedia.isLoading && <Skeleton variant="card" height={140} count={2} />}
          {tersedia.data && tersedia.data.items.length === 0 && (
            <Alert variant="info" title="Tidak ada beasiswa terbuka">Saat ini belum ada beasiswa yang dibuka pendaftarannya.</Alert>
          )}
          <div className="stack">
            {tersedia.data?.items.map((b) => (
              <Card key={b.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-strong)' }}>{b.nama}</strong>
                      <span className="pill pill--neutral mono">{b.kode}</span>
                      {b.statusPendaftaran && <StatusPill status={b.statusPendaftaran} />}
                    </div>
                    <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{b.penyelenggara}</div>
                    {b.deskripsi && (
                      <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-default)' }}>{b.deskripsi}</p>
                    )}
                    <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
                      Nominal: <strong style={{ color: 'var(--text-default)', fontFamily: 'var(--font-mono)' }}>{formatRupiah(b.nominal)}</strong>
                      {b.kuota != null && <> · Kuota: <span className="mono">{b.kuotaTerisi}/{b.kuota}</span></>}
                      {b.syaratIpk != null && <> · IPK ≥ <span className="mono">{b.syaratIpk.toFixed(2)}</span></>}
                      {b.syaratAngkatanMin != null && <> · Angkatan ≥ <span className="mono">{b.syaratAngkatanMin}</span></>}
                      {b.syaratAngkatanMax != null && <> · Angkatan ≤ <span className="mono">{b.syaratAngkatanMax}</span></>}
                      {b.tanggalTutup && <> · Tutup {formatTanggal(b.tanggalTutup)}</>}
                    </div>
                  </div>
                  <div>
                    {b.statusPendaftaran
                      ? <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>Sudah terdaftar</span>
                      : b.memenuhiSyarat
                        ? <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} onClick={() => setModalDaftar(b)}>Daftar</Button>
                        : <Button size="sm" variant="ghost" disabled>Belum memenuhi syarat</Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'riwayat' && (
        <>
          {riwayat.isLoading && <Skeleton variant="card" height={140} count={2} />}
          {riwayat.data && riwayat.data.items.length === 0 && (
            <Alert variant="info" title="Belum ada pendaftaran">Anda belum pernah mendaftar beasiswa.</Alert>
          )}
          <div className="stack">
            {riwayat.data?.items.map((p) => (
              <Card key={p.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-strong)' }}>{p.beasiswa.nama}</strong>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {p.beasiswa.penyelenggara} · Nominal {formatRupiah(p.beasiswa.nominal)} · Daftar {formatTanggal(p.createdAt)} · IPK saat daftar <span className="mono">{p.ipkSaatDaftar.toFixed(2)}</span>
                    </div>
                    <details style={{ marginTop: 8 }}>
                      <summary className="muted" style={{ fontSize: 'var(--text-xs)', cursor: 'pointer' }}>Lihat motivasi</summary>
                      <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{p.motivasi}</p>
                    </details>
                    {p.linkDokumen && (
                      <a href={p.linkDokumen} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-link)', marginTop: 4 }}>
                        Dokumen pendukung <ExternalLink size={10} />
                      </a>
                    )}
                    {p.catatan && (
                      <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Catatan akademik:</strong> {p.catatan}
                      </div>
                    )}
                  </div>
                  {p.status === 'diajukan' && (
                    <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => onBatal(p)}>Batalkan</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {modalDaftar && (
        <DaftarModal
          beasiswa={modalDaftar}
          onClose={() => setModalDaftar(null)}
          onSubmit={async (input) => {
            try {
              await daftar.mutateAsync({ ...input, beasiswaId: modalDaftar.id });
              setModalDaftar(null);
            } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
          }}
        />
      )}
    </div>
  );
}

function DaftarModal({ beasiswa, onClose, onSubmit }: {
  beasiswa: BeasiswaTersediaItem;
  onClose: () => void;
  onSubmit: (input: { motivasi: string; linkDokumen?: string }) => void;
}) {
  const [motivasi, setMotivasi] = useState('');
  const [linkDokumen, setLinkDokumen] = useState('');
  const valid = motivasi.trim().length >= 50;

  return (
    <Modal open onClose={onClose} title={`Daftar ${beasiswa.nama}`} width={620}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <Card>
          <strong style={{ color: 'var(--text-strong)' }}>{beasiswa.nama}</strong>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{beasiswa.penyelenggara} · {formatRupiah(beasiswa.nominal)}</div>
        </Card>
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
            Motivasi (minimum 50 karakter — {motivasi.length}/50)
          </label>
          <textarea
            value={motivasi}
            onChange={(e) => setMotivasi(e.target.value)}
            rows={8}
            className="tz-input"
            placeholder="Ceritakan mengapa Anda layak menerima beasiswa ini, target studi, kontribusi yang ingin diberikan…"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>
        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Link dokumen pendukung (opsional)</label>
          <input
            value={linkDokumen}
            onChange={(e) => setLinkDokumen(e.target.value)}
            className="tz-input"
            placeholder="https://drive.google.com/..."
            style={{ width: '100%', padding: 'var(--space-2) var(--space-3)' }}
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={() => onSubmit({ motivasi, linkDokumen: linkDokumen || undefined })}>Kirim</Button>
        </div>
      </div>
    </Modal>
  );
}
