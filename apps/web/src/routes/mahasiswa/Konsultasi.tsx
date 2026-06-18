import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { Plus, X, MessageSquare } from 'lucide-react';
import { useKonsultasiMahasiswa, useKonsultasiMahasiswaActions, type KonsultasiMahasiswa } from '@/lib/queries-konsultasi';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function MahasiswaKonsultasi() {
  const { data, isLoading, error } = useKonsultasiMahasiswa();
  const actions = useKonsultasiMahasiswaActions();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ topik: '', agenda: '', waktuMulai: '', durasiMenit: 30 });
  const [actErr, setActErr] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ topik: '', agenda: '', waktuMulai: '', durasiMenit: 30 });
    setActErr(null);
    setModalOpen(true);
  };

  const save = async () => {
    setActErr(null);
    if (!form.topik.trim() || !form.waktuMulai) { setActErr('Topik dan waktu wajib diisi'); return; }
    try {
      await actions.create.mutateAsync({
        topik: form.topik,
        agenda: form.agenda || null,
        waktuMulai: new Date(form.waktuMulai).toISOString(),
        durasiMenit: form.durasiMenit,
      });
      setModalOpen(false);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onCancel = async (k: KonsultasiMahasiswa) => {
    if (!confirm(`Batalkan permintaan konsultasi "${k.topik}"?`)) return;
    setActErr(null);
    try { await actions.cancel.mutateAsync(k.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAYANAN"
        title="Konsultasi DPA"
        subtitle="Ajukan sesi konsultasi ke Dosen Pembimbing Akademik (DPA) Anda."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
            Ajukan Konsultasi
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada konsultasi">Klik "Ajukan Konsultasi" untuk membuat permintaan pertama.</Alert>
      )}

      <div className="stack">
        {data?.items.map((k) => (
          <Card key={k.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                  <MessageSquare size={16} className="muted" />
                  <strong style={{ color: 'var(--text-strong)' }}>{k.topik}</strong>
                  <StatusPill status={k.status} />
                </div>
                <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {formatTanggalWaktu(k.waktuMulai)} · {k.durasiMenit} menit
                  {' · DPA '}{[k.dpa.gelarDepan, k.dpa.nama, k.dpa.gelarBelakang].filter(Boolean).join(' ')}
                </div>
                {k.agenda && (
                  <div style={{ marginTop: 8 }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Agenda:</div>
                    <p className="muted" style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{k.agenda}</p>
                  </div>
                )}
                {k.catatanDpa && (
                  <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan DPA:</div>
                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{k.catatanDpa}</p>
                  </div>
                )}
              </div>
              {(k.status === 'diajukan' || k.status === 'diterima') && (
                <Button size="sm" variant="ghost" leftIcon={<X size={14} />} onClick={() => onCancel(k)}>Batalkan</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajukan konsultasi" width={620}>
        <div className="stack" style={{ padding: 'var(--space-4)' }}>
          <Input label="Topik" value={form.topik} onChange={(e) => setForm({ ...form, topik: (e.target as HTMLInputElement).value })} placeholder="Konsultasi pengambilan SKS semester ganjil" />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Agenda (opsional)</label>
            <textarea
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              rows={4}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
              placeholder="Diskusi pilihan MK pilihan dan prasyarat..."
            />
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <div style={{ flex: 2 }}>
              <Input label="Waktu mulai" type="datetime-local" value={form.waktuMulai} onChange={(e) => setForm({ ...form, waktuMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Durasi (menit)" type="number" min="15" max="180" value={String(form.durasiMenit)} onChange={(e) => setForm({ ...form, durasiMenit: Number((e.target as HTMLInputElement).value) })} />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={actions.create.isPending} onClick={save}>
              {actions.create.isPending ? 'Mengirim…' : 'Kirim permintaan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
