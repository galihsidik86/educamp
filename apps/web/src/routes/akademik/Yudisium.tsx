import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Pencil, ShieldCheck, RefreshCw, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  useAdminYudisium, useAdminYudisiumActions, usePeriodeWisuda,
  type AdminYudisiumItem,
} from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatIp, formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS = ['pendaftaran', 'verifikasi', 'layak', 'tidak_layak', 'wisuda', 'batal'] as const;
const PREDIKAT = ['cumlaude', 'sangat_memuaskan', 'memuaskan', 'tidak_lulus'] as const;
const PREDIKAT_LABEL: Record<string, string> = {
  cumlaude: 'Cumlaude',
  sangat_memuaskan: 'Sangat Memuaskan',
  memuaskan: 'Memuaskan',
  tidak_lulus: 'Belum Lulus',
};

export function AdminYudisiumPage() {
  const [filters, setFilters] = useState({ status: '', periodeWisudaId: '' });
  const { data, isLoading, error } = useAdminYudisium(filters);
  const periode = usePeriodeWisuda();
  const [editing, setEditing] = useState<AdminYudisiumItem | null>(null);

  return (
    <div className="stack">
      <PageHead eyebrow="OPERASIONAL" title="Kelola Yudisium" subtitle="Verifikasi pendaftar wisuda, tetapkan no ijazah/SKL, ubah status." />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <Select label="Periode" value={filters.periodeWisudaId} onChange={(e) => setFilters({ ...filters, periodeWisudaId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {periode.data?.items.map((p) => <option key={p.id} value={p.id}>{p.kode} · {p.nama}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && <Alert variant="info" title="Tidak ada hasil">Belum ada pendaftar / sesuaikan filter.</Alert>}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>NIM</th>
              <th>Nama</th>
              <th>Prodi</th>
              <th className="num">IPK</th>
              <th className="num">SKS</th>
              <th>Predikat</th>
              <th>No. SKL / Ijazah</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((y) => (
              <tr key={y.id}>
                <td className="mono">{y.periodeWisuda.kode}</td>
                <td className="mono">{y.mahasiswa.nim}</td>
                <td>{y.mahasiswa.nama}</td>
                <td>{y.mahasiswa.prodi.kode}</td>
                <td className="num mono">{formatIp(y.ipk)}</td>
                <td className="num mono">{y.sksLulus}</td>
                <td>{y.predikat ? PREDIKAT_LABEL[y.predikat] : <span className="muted">—</span>}</td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {y.noSkl ?? '—'}
                  {y.noIjazah && <div className="muted">{y.noIjazah}</div>}
                </td>
                <td>
                  <StatusPill status={y.status} />
                  {y.verifikasiToken && <div className="muted mono" style={{ fontSize: '10px', marginTop: 2 }}><ShieldCheck size={10} style={{ verticalAlign: 'middle' }} /> QR aktif</div>}
                </td>
                <td>
                  <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setEditing(y)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditModal({ item, onClose }: { item: AdminYudisiumItem; onClose: () => void }) {
  const { update, regenToken } = useAdminYudisiumActions();
  const [regenErr, setRegenErr] = useState<string | null>(null);
  const verifUrl = item.verifikasiToken ? `${window.location.origin}/verifikasi/${item.verifikasiToken}` : null;
  const [form, setForm] = useState({
    status: item.status,
    predikat: item.predikat ?? '',
    catatan: item.catatan ?? '',
    noIjazah: item.noIjazah ?? '',
    noSkl: item.noSkl ?? '',
    tanggalLulus: item.tanggalLulus?.slice(0, 10) ?? '',
  });
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    try {
      await update.mutateAsync({
        id: item.id,
        patch: {
          status: form.status,
          predikat: form.predikat as any || null,
          catatan: form.catatan || null,
          noIjazah: form.noIjazah || null,
          noSkl: form.noSkl || null,
          tanggalLulus: form.tanggalLulus || null,
        },
      });
      onClose();
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Yudisium — ${item.mahasiswa.nama}`} width={680}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{item.mahasiswa.nim} · {item.mahasiswa.prodi.kode} · Angkatan {item.mahasiswa.angkatan}</div>
          <div style={{ marginTop: 4 }}>
            <strong style={{ color: 'var(--text-strong)' }}>{item.periodeWisuda.nama}</strong>
            <span className="muted" style={{ fontSize: 'var(--text-xs)', marginLeft: 8 }}>{formatTanggal(item.periodeWisuda.tanggal)}</span>
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
            IPK saat daftar: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatIp(item.ipk)}</strong> · {item.sksLulus} SKS
          </div>
        </Card>

        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as AdminYudisiumItem['status'] })}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Predikat" value={form.predikat ?? ''} onChange={(e) => setForm({ ...form, predikat: (e.target as HTMLSelectElement).value as any })}>
              <option value="">— Belum ditentukan —</option>
              {PREDIKAT.map((p) => <option key={p} value={p}>{PREDIKAT_LABEL[p]}</option>)}
            </Select>
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}><Input label="Tanggal lulus" type="date" value={form.tanggalLulus} onChange={(e) => setForm({ ...form, tanggalLulus: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="No. SKL" value={form.noSkl} onChange={(e) => setForm({ ...form, noSkl: (e.target as HTMLInputElement).value })} /></div>
          <div style={{ flex: 1 }}><Input label="No. Ijazah" value={form.noIjazah} onChange={(e) => setForm({ ...form, noIjazah: (e.target as HTMLInputElement).value })} /></div>
        </div>

        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Catatan untuk mahasiswa</label>
          <textarea
            value={form.catatan}
            onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        {(item.status === 'wisuda' || item.verifikasiToken) && (
          <Card>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
              <ShieldCheck size={16} className="muted" />
              <strong>Token Verifikasi Ijazah (QR Code)</strong>
            </div>
            {regenErr && <Alert variant="danger" title="Gagal">{regenErr}</Alert>}
            {verifUrl ? (
              <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-3)' }}>
                <div style={{ padding: 'var(--space-2)', background: 'white', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                  <QRCodeSVG value={verifUrl} size={128} includeMargin={false} />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>URL verifikasi publik:</div>
                  <div className="mono" style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>{verifUrl}</div>
                  <div className="row" style={{ gap: 8, marginTop: 'var(--space-2)' }}>
                    <Button size="sm" variant="ghost" leftIcon={<Copy size={12} />} onClick={() => navigator.clipboard?.writeText(verifUrl)}>Salin URL</Button>
                    <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={12} />} onClick={async () => {
                      if (!confirm('Generate token baru? Token & QR yang sudah dicetak akan tidak valid lagi.')) return;
                      setRegenErr(null);
                      try { await regenToken.mutateAsync(item.id); }
                      catch (e) { setRegenErr(e instanceof ApiError ? e.message : 'Gagal'); }
                    }}>Regenerate</Button>
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                    QR code dapat dicetak di ijazah/SKL. Industri/PT lain dapat scan untuk verifikasi keaslian.
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                Token akan otomatis di-generate saat status berubah ke <strong>wisuda</strong>.
              </div>
            )}
          </Card>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={update.isPending} onClick={save}>{update.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  );
}
