import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Plus, FileCheck2, Trash2 } from 'lucide-react';
import { useHeregistrasi, useHeregistrasiAktif, useHeregistrasiActions, type HeregistrasiInput } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { TableSkeletonRows } from '@/components/Skeleton';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function MahasiswaHeregistrasi() {
  const aktif = useHeregistrasiAktif();
  const list = useHeregistrasi();
  const actions = useHeregistrasiActions();
  const [openAjukan, setOpenAjukan] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);

  const aktifH = aktif.data?.heregistrasi;
  const semesterAktif = aktif.data?.semester;

  const batal = async (id: string) => {
    if (!confirm('Batalkan pengajuan heregistrasi ini?')) return;
    setActErr(null);
    try { await actions.batal.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="ADMINISTRASI"
        title="Heregistrasi Semester"
        subtitle="Pernyataan aktif kuliah atau pengajuan cuti per semester. Wajib diisi tiap semester baru."
        right={
          !aktifH && semesterAktif && (
            <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setOpenAjukan(true)}>
              Ajukan Heregistrasi
            </Button>
          )
        }
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <Card>
        <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Status semester aktif
        </div>
        {aktifH ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
              <Badge variant={aktifH.jenis === 'cuti' ? 'warning' : 'success'}>
                {aktifH.jenis === 'cuti' ? 'Pengajuan Cuti' : 'Aktif Kuliah'}
              </Badge>
              <StatusPill status={aktifH.status} />
              <span className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{aktifH.semester.jenis} {aktifH.semester.tahunAjaran.kode}</span>
            </div>
            {aktifH.alasan && <p style={{ marginTop: 'var(--space-2)' }}><strong>Alasan:</strong> {aktifH.alasan}</p>}
            {aktifH.catatanAkademik && <p className="muted" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}><strong>Catatan Akademik:</strong> {aktifH.catatanAkademik}</p>}
            {aktifH.status === 'diajukan' && (
              <Button variant="ghost" size="sm" leftIcon={<Trash2 size={12} />} onClick={() => batal(aktifH.id)}>
                Batalkan pengajuan
              </Button>
            )}
          </div>
        ) : (
          <Alert variant="warning" title="Heregistrasi belum diajukan">
            Anda belum mengajukan heregistrasi untuk semester {semesterAktif?.kode}. Tanpa heregistrasi yang disetujui, KRS tidak dapat divalidasi.
          </Alert>
        )}
      </Card>

      <h3 style={{ color: 'var(--text-strong)' }}>Riwayat Heregistrasi</h3>
      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Semester</th><th>Jenis</th><th>Status</th><th>Diajukan</th><th>Diverifikasi</th><th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && <TableSkeletonRows cols={6} rows={3} />}
            {list.data?.items.length === 0 && <tr><td colSpan={6} className="muted center">Belum ada riwayat.</td></tr>}
            {list.data?.items.map((h) => (
              <tr key={h.id}>
                <td className="mono">{h.semester.jenis} {h.semester.tahunAjaran.kode}</td>
                <td>{h.jenis === 'cuti' ? 'Cuti' : 'Aktif'}</td>
                <td><StatusPill status={h.status} /></td>
                <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{formatTanggal(h.createdAt)}</td>
                <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{h.diverifikasiPada ? formatTanggal(h.diverifikasiPada) : '—'}</td>
                <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>{h.catatanAkademik ?? h.alasan ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openAjukan && semesterAktif && (
        <AjukanModal
          semKode={semesterAktif.kode}
          onClose={() => setOpenAjukan(false)}
          onSubmit={async (body) => {
            try {
              await actions.ajukan.mutateAsync(body);
              setOpenAjukan(false);
            } catch (e) {
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

function AjukanModal({ semKode, onClose, onSubmit }: {
  semKode: string;
  onClose: () => void;
  onSubmit: (body: HeregistrasiInput) => Promise<void>;
}) {
  const [jenis, setJenis] = useState<'aktif' | 'cuti'>('aktif');
  const [alasan, setAlasan] = useState('');
  const [dokumenUrl, setDokumenUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await onSubmit({
        jenis,
        alasan: alasan.trim() || undefined,
        dokumenUrl: dokumenUrl.trim() || undefined,
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Ajukan Heregistrasi · Semester ${semKode}`} width={560}>
      <form onSubmit={submit} className="stack">
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <Select label="Jenis Heregistrasi" value={jenis} onChange={(e) => setJenis((e.target as HTMLSelectElement).value as 'aktif' | 'cuti')}>
          <option value="aktif">Aktif Kuliah (lanjut studi)</option>
          <option value="cuti">Cuti Akademik (1 semester)</option>
        </Select>

        {jenis === 'cuti' && (
          <>
            <Alert variant="info" title="Pengajuan cuti memerlukan persetujuan">
              Akademik akan meninjau alasan dan dokumen pendukung. Cuti hanya untuk 1 semester; pengajuan lanjutan dilakukan terpisah.
            </Alert>
            <div>
              <label className="tz-field__label">Alasan cuti (wajib)</label>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                required minLength={10}
                placeholder="Mis. alasan medis, finansial, keluarga, dll."
                className="tz-input"
                style={{ width: '100%', minHeight: 80, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              />
            </div>
            <Input
              label="URL dokumen pendukung (opsional)"
              type="url"
              value={dokumenUrl}
              onChange={(e) => setDokumenUrl((e.target as HTMLInputElement).value)}
              placeholder="https://drive.google.com/..."
            />
          </>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" disabled={busy} leftIcon={<FileCheck2 size={14} />}>
            {busy ? 'Mengirim…' : 'Ajukan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
