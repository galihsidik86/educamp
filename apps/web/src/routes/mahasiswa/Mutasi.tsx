import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { Plus, X, UserCog } from 'lucide-react';
import {
  useMutasiMahasiswa, useMutasiMahasiswaActions, useProdiListMahasiswa,
  type JenisMutasi, type MutasiMahasiswa,
} from '@/lib/queries-mutasi';
import { useProfil } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS_OPTS: Array<{ v: JenisMutasi; label: string; desc: string }> = [
  { v: 'cuti', label: 'Cuti akademik', desc: 'Sementara tidak aktif kuliah satu/dua semester' },
  { v: 'aktif_kembali', label: 'Aktif kembali', desc: 'Kembali aktif dari status cuti' },
  { v: 'pindah_prodi', label: 'Pindah program studi', desc: 'Pindah ke prodi lain di lingkungan kampus' },
  { v: 'mengundurkan_diri', label: 'Mengundurkan diri', desc: 'Berhenti dari studi (tidak dapat dibatalkan)' },
];

export function MahasiswaMutasi() {
  const profil = useProfil();
  const { data, isLoading, error } = useMutasiMahasiswa();
  const actions = useMutasiMahasiswaActions();
  const prodiList = useProdiListMahasiswa();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ jenis: JenisMutasi; alasan: string; prodiTujuanId: string; fileUrl: string }>(
    { jenis: 'cuti', alasan: '', prodiTujuanId: '', fileUrl: '' },
  );
  const [actErr, setActErr] = useState<string | null>(null);

  const statusSekarang = profil.data?.status ?? 'aktif';
  const allowedJenis = JENIS_OPTS.filter((o) => allowedFor(o.v, statusSekarang));

  const openCreate = () => {
    const first = allowedJenis[0]?.v ?? 'cuti';
    setForm({ jenis: first, alasan: '', prodiTujuanId: '', fileUrl: '' });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (form.alasan.trim().length < 20) { setActErr('Alasan minimal 20 karakter'); return; }
    if (form.jenis === 'pindah_prodi' && !form.prodiTujuanId) { setActErr('Pilih prodi tujuan'); return; }
    try {
      await actions.create.mutateAsync({
        jenis: form.jenis,
        alasan: form.alasan,
        prodiTujuanId: form.jenis === 'pindah_prodi' ? form.prodiTujuanId : null,
        fileUrl: form.fileUrl || null,
      });
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onCancel = async (m: MutasiMahasiswa) => {
    if (!confirm(`Batalkan pengajuan ${labelJenis(m.jenis)}?`)) return;
    setActErr(null);
    try { await actions.cancel.mutateAsync(m.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const hasPending = (data?.items ?? []).some((m) => m.status === 'diajukan');

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Mutasi Mahasiswa"
        subtitle="Ajukan cuti akademik, aktif kembali, pindah prodi, atau pengunduran diri."
        right={
          <Button
            variant="primary" size="sm" leftIcon={<Plus size={14} />}
            disabled={hasPending || allowedJenis.length === 0}
            onClick={openCreate}
          >
            Ajukan Mutasi
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && !modalOpen && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <Card>
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Status mahasiswa saat ini</div>
        <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)', marginTop: 4 }}>
          <UserCog size={16} className="muted" />
          <strong style={{ color: 'var(--text-strong)' }}>{labelStatus(statusSekarang)}</strong>
        </div>
        {hasPending && (
          <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
            Anda masih memiliki pengajuan mutasi yang belum diproses. Tunggu hasil verifikasi akademik atau batalkan terlebih dahulu.
          </div>
        )}
      </Card>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pengajuan">Klik "Ajukan Mutasi" untuk membuat pengajuan pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((m) => (
          <Card key={m.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <UserCog size={16} className="muted" />
                  <strong style={{ color: 'var(--text-strong)' }}>{labelJenis(m.jenis)}</strong>
                  <StatusPill status={m.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  Diajukan {formatTanggalWaktu(m.createdAt)} · {labelStatus(m.statusSebelum)} → {labelStatus(m.statusSesudah)}
                  {m.jenis === 'pindah_prodi' && m.prodiTujuan && ` · ke ${m.prodiTujuan.nama}`}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Alasan:</div>
                  <p className="muted" style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{m.alasan}</p>
                </div>
                {m.catatanAkademik && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan akademik:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{m.catatanAkademik}</p>
                  </div>
                )}
                {m.fileUrl && <a href={safeHref(m.fileUrl) ?? undefined} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>Lihat dokumen pendukung</a>}
              </div>
              {m.status === 'diajukan' && (
                <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => onCancel(m)}>Batalkan</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajukan mutasi" width={640}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Select label="Jenis mutasi" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as JenisMutasi })}>
            {allowedJenis.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Select>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{JENIS_OPTS.find((o) => o.v === form.jenis)?.desc}</div>

          {form.jenis === 'pindah_prodi' && (
            <Select label="Prodi tujuan" value={form.prodiTujuanId} onChange={(e) => setForm({ ...form, prodiTujuanId: (e.target as HTMLSelectElement).value })}>
              <option value="">— pilih prodi —</option>
              {prodiList.data?.items
                .filter((p) => p.id !== profil.data?.prodi.id)
                .map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.jenjang.toUpperCase()})</option>)}
            </Select>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Alasan</label>
            <textarea
              value={form.alasan}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
              rows={5}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              placeholder="Jelaskan alasan pengajuan dan dokumen pendukung yang dilampirkan…"
            />
          </div>
          <Input label="Link dokumen pendukung (opsional)" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: (e.target as HTMLInputElement).value })} placeholder="https://drive.google.com/…" />

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending} onClick={save}>
              {actions.create.isPending ? 'Mengirim…' : 'Kirim pengajuan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function allowedFor(j: JenisMutasi, status: string): boolean {
  if (status === 'lulus' || status === 'drop_out' || status === 'mengundurkan_diri') return false;
  if (j === 'cuti') return status === 'aktif';
  if (j === 'aktif_kembali') return status === 'cuti';
  if (j === 'pindah_prodi') return status === 'aktif';
  if (j === 'mengundurkan_diri') return status === 'aktif' || status === 'cuti';
  return false;
}

function labelJenis(j: JenisMutasi): string {
  return JENIS_OPTS.find((o) => o.v === j)?.label ?? j;
}

function labelStatus(s: string): string {
  switch (s) {
    case 'aktif': return 'Aktif';
    case 'cuti': return 'Cuti';
    case 'lulus': return 'Lulus';
    case 'drop_out': return 'Drop out';
    case 'mengundurkan_diri': return 'Mengundurkan diri';
    default: return s;
  }
}
