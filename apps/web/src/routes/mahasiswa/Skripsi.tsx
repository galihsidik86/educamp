import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, X, ExternalLink, Save } from 'lucide-react';
import { useSkripsi, useSkripsiActions, type SkripsiItem, type SkripsiAjukanInput } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const STATUS_AKTIF = ['diajukan', 'disetujui', 'proposal', 'penelitian', 'sidang'];

export function MahasiswaSkripsi() {
  const { data, isLoading, error } = useSkripsi();
  const { ajukan, update, batal } = useSkripsiActions();
  const [open, setOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<SkripsiItem | null>(null);
  const [form, setForm] = useState<SkripsiAjukanInput>({ judul: '', abstrak: '', topik: '' });
  const [actErr, setActErr] = useState<string | null>(null);

  const punyaAktif = data?.items.some((i) => STATUS_AKTIF.includes(i.status)) ?? false;

  const submit = async () => {
    setActErr(null);
    if (form.judul.trim().length < 10) { setActErr('Judul minimal 10 karakter'); return; }
    try {
      await ajukan.mutateAsync({
        ...form,
        abstrak: form.abstrak?.trim() || undefined,
        topik: form.topik?.trim() || undefined,
      });
      setOpen(false);
      setForm({ judul: '', abstrak: '', topik: '' });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onBatal = async (s: SkripsiItem) => {
    if (!confirm(`Batalkan pengajuan "${s.judul.slice(0, 60)}…"?`)) return;
    try { await batal.mutateAsync(s.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="TUGAS AKHIR"
        title="Skripsi"
        subtitle="Pengajuan judul, riwayat status, dan dokumen skripsi Anda."
        right={
          <Button
            variant="primary"
            leftIcon={<Plus size={14} />}
            disabled={punyaAktif}
            onClick={() => { setActErr(null); setOpen(true); }}
          >
            Ajukan Judul
          </Button>
        }
      />

      {punyaAktif && (
        <Alert variant="info" title="Anda memiliki pengajuan aktif">
          Selesaikan atau batalkan dulu pengajuan saat ini sebelum mengajukan judul baru.
        </Alert>
      )}

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {isLoading && <Card><p className="muted" style={{ margin: 0 }}>Memuat…</p></Card>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada pengajuan">Klik "Ajukan Judul" untuk memulai proses skripsi.</Alert>
      )}

      <div className="stack">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <StatusPill status={s.status} />
                  {s.topik && <span className="pill pill--neutral">{s.topik}</span>}
                  {s.nilaiHuruf && <span className="pill pill--success">Nilai: {s.nilaiHuruf}</span>}
                </div>
                <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 6 }}>{s.judul}</strong>
                {s.abstrak && (
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {s.abstrak}
                  </p>
                )}
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
                  Diajukan {formatTanggal(s.tanggalAjuan)}
                  {s.tanggalDisetujui && ` · Disetujui ${formatTanggal(s.tanggalDisetujui)}`}
                  {s.tanggalSidang && ` · Sidang ${formatTanggal(s.tanggalSidang)}`}
                </div>
                {(s.pembimbing1 || s.pembimbing2) && (
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    {s.pembimbing1 && <>Pembimbing 1: <strong style={{ color: 'var(--text-default)' }}>{s.pembimbing1}</strong></>}
                    {s.pembimbing1 && s.pembimbing2 && ' · '}
                    {s.pembimbing2 && <>Pembimbing 2: <strong style={{ color: 'var(--text-default)' }}>{s.pembimbing2}</strong></>}
                  </div>
                )}
                {s.catatan && (
                  <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Catatan akademik:</strong> {s.catatan}
                  </div>
                )}
                {s.linkDokumen && (
                  <a
                    href={s.linkDokumen}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', fontSize: 'var(--text-xs)', marginTop: 6 }}
                  >
                    Dokumen <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {STATUS_AKTIF.includes(s.status) && s.status !== 'diajukan' && (
                  <Button size="sm" variant="ghost" onClick={() => setLinkModal(s)}>Update Dokumen</Button>
                )}
                {(s.status === 'diajukan' || s.status === 'ditolak') && (
                  <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => onBatal(s)}>Batalkan</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajukan judul skripsi" width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          <Input label="Judul (min. 10 karakter)" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} />
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Abstrak (opsional)</label>
            <textarea
              value={form.abstrak ?? ''}
              onChange={(e) => setForm({ ...form, abstrak: e.target.value })}
              rows={5}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <Input label="Topik / bidang penelitian (opsional)" value={form.topik ?? ''} onChange={(e) => setForm({ ...form, topik: (e.target as HTMLInputElement).value })} placeholder="mis. Sistem Informasi, Machine Learning" />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={ajukan.isPending} onClick={submit}>
              {ajukan.isPending ? 'Mengirim…' : 'Ajukan'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title="Update dokumen skripsi" width={520}>
        {linkModal && <LinkForm item={linkModal} onSave={async (patch) => {
          try { await update.mutateAsync({ id: linkModal.id, patch }); setLinkModal(null); }
          catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
        }} onClose={() => setLinkModal(null)} />}
      </Modal>
    </div>
  );
}

function LinkForm({ item, onSave, onClose }: { item: SkripsiItem; onSave: (patch: { linkDokumen?: string; abstrak?: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({ linkDokumen: item.linkDokumen ?? '', abstrak: item.abstrak ?? '' });
  return (
    <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
      <Input label="Link dokumen / draft skripsi" value={form.linkDokumen} onChange={(e) => setForm({ ...form, linkDokumen: (e.target as HTMLInputElement).value })} placeholder="https://drive.google.com/..." />
      <div>
        <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Abstrak</label>
        <textarea
          value={form.abstrak}
          onChange={(e) => setForm({ ...form, abstrak: e.target.value })}
          rows={5}
          className="tz-input"
          style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
        />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
        <Button variant="primary" size="sm" leftIcon={<Save size={14} />} onClick={() => onSave(form)}>Simpan</Button>
      </div>
    </div>
  );
}
