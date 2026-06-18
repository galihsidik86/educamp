import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { FileText, Download, ExternalLink, Search, Library } from 'lucide-react';
import {
  useDokumenKategoriShared, useDokumenShared, useDokumenAksesActions,
  type Dokumen,
} from '@/lib/queries-dokumen';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';

const FILE_LABEL: Record<string, string> = {
  pdf: 'PDF', doc: 'DOC', xls: 'XLS', ppt: 'PPT', zip: 'ZIP', link: 'Link', lain: 'File',
};

export function DokumenShared() {
  const kategori = useDokumenKategoriShared();
  const [filterKategori, setFilterKategori] = useState('');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading, error } = useDokumenShared({
    kategoriId: filterKategori || undefined,
    q: activeQ || undefined,
  });
  const actions = useDokumenAksesActions();

  const onOpen = async (d: Dokumen) => {
    void actions.log.mutateAsync({ id: d.id, aksi: 'view' });
    window.open(d.fileUrl, '_blank', 'noopener,noreferrer');
  };
  const onDownload = async (d: Dokumen) => {
    void actions.log.mutateAsync({ id: d.id, aksi: 'download' });
    // Untuk file URL eksternal, buka di tab baru — browser akan handle download bila MIME type sesuai
    const a = document.createElement('a');
    a.href = d.fileUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Group by kategori untuk tampilan rapi
  const groupedByKategori = (data?.items ?? []).reduce<Record<string, { nama: string; items: Dokumen[] }>>((acc, d) => {
    const key = d.kategori?.id ?? 'unknown';
    if (!acc[key]) acc[key] = { nama: d.kategori?.nama ?? 'Lain', items: [] };
    acc[key].items.push(d);
    return acc;
  }, {});

  return (
    <div className="stack">
      <PageHead
        eyebrow="REPOSITORY"
        title="Pusat Dokumen"
        subtitle="Panduan akademik, tata tertib, pedoman skripsi, SOP, dan dokumen institusional lain."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}

      <Card>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220 }}>
            <Select label="Kategori" value={filterKategori} onChange={(e) => setFilterKategori((e.target as HTMLSelectElement).value)}>
              <option value="">Semua kategori</option>
              {kategori.data?.items.map((k) => (
                <option key={k.id} value={k.id}>{k.nama} ({k._count?.dokumen ?? 0})</option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="cari judul atau deskripsi" onKeyDown={(e) => { if (e.key === 'Enter') setActiveQ(q); }} />
          </div>
          <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
        </div>
      </Card>

      {isLoading && <p className="muted">Memuat…</p>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada dokumen">
          Belum ada dokumen yang tersedia untuk peran Anda pada kategori/filter ini.
        </Alert>
      )}

      <div className="stack">
        {Object.entries(groupedByKategori).map(([key, group]) => (
          <div key={key}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--space-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Library size={12} /> {group.nama}
            </div>
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              {group.items.map((d) => (
                <Card key={d.id}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                        <FileText size={16} className="muted" />
                        <strong style={{ color: 'var(--text-strong)' }}>{d.judul}</strong>
                        {d.jenisFile && <span className="pill pill--neutral">{FILE_LABEL[d.jenisFile] ?? d.jenisFile.toUpperCase()}</span>}
                        {d.versi && <span className="pill pill--neutral">v{d.versi}</span>}
                      </div>
                      {d.deskripsi && <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{d.deskripsi}</p>}
                      <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
                        Diperbarui {formatTanggal(d.updatedAt)}
                        {d.tanggalBerlaku && ` · Berlaku dari ${formatTanggal(d.tanggalBerlaku)}`}
                        {d.tanggalKedaluwarsa && ` · Hingga ${formatTanggal(d.tanggalKedaluwarsa)}`}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                      <Button size="sm" variant="ghost" leftIcon={<ExternalLink size={12} />} onClick={() => onOpen(d)}>Buka</Button>
                      <Button size="sm" variant="primary" leftIcon={<Download size={12} />} onClick={() => onDownload(d)}>Unduh</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
