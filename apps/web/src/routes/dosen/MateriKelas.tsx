import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { ChevronLeft, Plus, Trash2, Pencil, ExternalLink, Link as LinkIcon, FileText, Video, FileType } from 'lucide-react';
import { useDosenBahanAjar, useBahanAjarActions, useDosenPertemuan, type BahanAjarInput, type BahanAjarItem, type JenisBahanAjar } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { safeHref } from '@/lib/format';
import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api';
import { PageLoadingSkeleton } from '@/components/Skeleton';

const JENIS_LABEL: Record<JenisBahanAjar, string> = {
  link: 'Tautan', file: 'File', text: 'Catatan', video: 'Video',
};

function jenisIcon(j: JenisBahanAjar) {
  switch (j) {
    case 'link': return <LinkIcon size={14} />;
    case 'file': return <FileType size={14} />;
    case 'video': return <Video size={14} />;
    case 'text': return <FileText size={14} />;
  }
}

export function DosenMateriKelas() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const { data, isLoading } = useDosenBahanAjar(kelasId);
  const pertemuan = useDosenPertemuan(kelasId);
  const { create, update, remove } = useBahanAjarActions(kelasId);

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: BahanAjarItem } | null>(null);

  const onDelete = async (item: BahanAjarItem) => {
    if (!confirm(`Hapus materi "${item.judul}"?`)) return;
    try { await remove.mutateAsync(item.id); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  if (isLoading) return <PageLoadingSkeleton />;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Kelas tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link
        to="/dosen/materi"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={data.kelas.namaMK}
        subtitle="Materi ajar yang dapat dilihat mahasiswa kelas ini."
        right={<Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setModal({ mode: 'create' })}>Tambah Materi</Button>}
      />

      {data.items.length === 0 && (
        <Alert variant="info" title="Belum ada materi">Klik "Tambah Materi" untuk mulai mengunggah link, file, atau catatan untuk mahasiswa.</Alert>
      )}

      <div className="stack">
        {data.items.map((it) => (
          <Card key={it.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="pill pill--neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {jenisIcon(it.jenis)} {JENIS_LABEL[it.jenis]}
                  </span>
                  {it.pertemuanKe && <span className="pill pill--info">Pertemuan {it.pertemuanKe}</span>}
                </div>
                <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 6 }}>{it.judul}</strong>
                {it.deskripsi && <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{it.deskripsi}</p>}
                {it.url && (
                  <a href={safeHref(it.url) ?? undefined} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-link)', marginTop: 6 }}>
                    Buka <ExternalLink size={10} />
                  </a>
                )}
                {it.jenis === 'text' && it.konten && (
                  <pre style={{ margin: '8px 0 0', padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {it.konten}
                  </pre>
                )}
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" leftIcon={<Pencil size={12} />} onClick={() => setModal({ mode: 'edit', item: it })}>Edit</Button>
                <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => onDelete(it)}>Hapus</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <BahanAjarModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.item : undefined}
          pertemuanOptions={pertemuan.data?.items.map((p) => ({ id: p.id, label: `Pertemuan ${p.pertemuanKe}${p.topik ? ` — ${p.topik}` : ''}` })) ?? []}
          onClose={() => setModal(null)}
          onSubmit={async (input, id) => {
            try {
              if (id) await update.mutateAsync({ id, patch: input });
              else await create.mutateAsync(input);
              setModal(null);
            } catch (e) { alert(e instanceof ApiError ? e.message : 'Gagal'); }
          }}
        />
      )}
    </div>
  );
}

function BahanAjarModal({ mode, initial, pertemuanOptions, onClose, onSubmit }: {
  mode: 'create' | 'edit';
  initial?: BahanAjarItem;
  pertemuanOptions: Array<{ id: string; label: string }>;
  onClose: () => void;
  onSubmit: (input: BahanAjarInput, id?: string) => void;
}) {
  const [form, setForm] = useState<BahanAjarInput>({
    jenis: initial?.jenis ?? 'link',
    judul: initial?.judul ?? '',
    deskripsi: initial?.deskripsi ?? '',
    url: initial?.url ?? '',
    konten: initial?.konten ?? '',
    pertemuanId: initial?.pertemuanId ?? null,
    urutan: initial?.urutan ?? 0,
  });

  return (
    <Modal open onClose={onClose} title={mode === 'create' ? 'Tambah materi' : `Edit materi`} width={640}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Jenis" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: (e.target as HTMLSelectElement).value as JenisBahanAjar })}>
              {Object.entries(JENIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Select label="Pertemuan (opsional)" value={form.pertemuanId ?? ''} onChange={(e) => setForm({ ...form, pertemuanId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— Tidak terikat —</option>
              {pertemuanOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </div>
        </div>

        <Input label="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: (e.target as HTMLInputElement).value })} />

        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Deskripsi (opsional)</label>
          <textarea
            value={form.deskripsi ?? ''}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        {(form.jenis === 'link' || form.jenis === 'video' || form.jenis === 'file') && (
          <Input label="URL" value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: (e.target as HTMLInputElement).value })} placeholder={form.jenis === 'video' ? 'https://youtube.com/...' : 'https://...'} />
        )}

        {form.jenis === 'text' && (
          <div>
            <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Konten</label>
            <textarea
              value={form.konten ?? ''}
              onChange={(e) => setForm({ ...form, konten: e.target.value })}
              rows={8}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
        )}

        <Input label="Urutan (angka, kecil di atas)" type="number" value={(form.urutan ?? 0).toString()} onChange={(e) => setForm({ ...form, urutan: Number((e.target as HTMLInputElement).value) })} />

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" onClick={() => onSubmit(form, initial?.id)}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
