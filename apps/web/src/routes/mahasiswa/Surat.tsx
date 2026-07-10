import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, X, Printer } from 'lucide-react';
import { useSurat, useSuratActions, type JenisSurat, type SuratAjukanInput, type SuratItem } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS_LABEL: Record<JenisSurat, string> = {
  aktif_kuliah:           'Keterangan Aktif Kuliah',
  keterangan_mahasiswa:   'Keterangan Mahasiswa',
  pengantar_beasiswa:     'Pengantar Beasiswa',
  pengantar_penelitian:   'Pengantar Penelitian',
  pengantar_magang:       'Pengantar Magang',
  pengganti_ktm:          'Pengganti KTM',
  lainnya:                'Lainnya',
};

export function MahasiswaSurat() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSurat();
  const { ajukan, batal } = useSuratActions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SuratAjukanInput>({ jenis: 'aktif_kuliah', judul: JENIS_LABEL.aktif_kuliah, keperluan: '' });
  const [actErr, setActErr] = useState<string | null>(null);

  const onJenis = (j: JenisSurat) => setForm({ ...form, jenis: j, judul: JENIS_LABEL[j] });

  const submit = async () => {
    setActErr(null);
    if (form.judul.length < 5) { setActErr('Judul minimal 5 karakter'); return; }
    if (form.keperluan.trim().length < 10) { setActErr('Keperluan minimal 10 karakter'); return; }
    try {
      await ajukan.mutateAsync(form);
      setOpen(false);
      setForm({ jenis: 'aktif_kuliah', judul: JENIS_LABEL.aktif_kuliah, keperluan: '' });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onBatal = async (s: SuratItem) => {
    if (!confirm(`Batalkan permohonan "${s.judul}"?`)) return;
    try { await batal.mutateAsync(s.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Surat Keterangan"
        subtitle="Ajukan permohonan surat dan cetak surat yang telah disetujui."
        right={
          <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => { setActErr(null); setOpen(true); }}>
            Ajukan Surat
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada permohonan">Klik "Ajukan Surat" untuk memulai.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-strong)' }}>{s.judul}</strong>
                  <span className="pill pill--neutral">{JENIS_LABEL[s.jenis] ?? s.jenis}</span>
                  <StatusPill status={s.status} />
                </div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{s.keperluan}</p>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
                  Diajukan {formatTanggal(s.tanggalDiajukan)}
                  {s.tanggalDisetujui && ` · Disetujui ${formatTanggal(s.tanggalDisetujui)}`}
                  {s.tanggalSelesai && ` · Selesai ${formatTanggal(s.tanggalSelesai)}`}
                  {s.nomorSurat && <> · No. <span className="mono">{s.nomorSurat}</span></>}
                </div>
                {s.catatan && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Catatan akademik:</strong> {s.catatan}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {s.status === 'selesai' && (
                  <Button size="sm" variant="primary" leftIcon={<Printer size={14} />} onClick={() => navigate(`/mahasiswa/surat/${s.id}/cetak`)}>Cetak</Button>
                )}
                {(s.status === 'diajukan' || s.status === 'ditolak') && (
                  <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => onBatal(s)}>Batalkan</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajukan surat" width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Select label="Jenis surat" value={form.jenis} onChange={(e) => onJenis((e.target as HTMLSelectElement).value as JenisSurat)}>
            {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="Judul (dapat diedit)" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} />
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Keperluan (minimal 10 karakter)</label>
            <textarea
              value={form.keperluan}
              onChange={(e) => setForm({ ...form, keperluan: e.target.value })}
              rows={6}
              className="tz-input"
              placeholder="Jelaskan untuk keperluan apa surat ini dibutuhkan…"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={ajukan.isPending} onClick={submit}>{ajukan.isPending ? 'Mengirim…' : 'Ajukan'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
