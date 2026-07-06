import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Search, CheckCircle2, XCircle, Trash2, FileBadge } from 'lucide-react';
import { useAdminSertifikasi, useAdminSertifikasiActions, type SertifikasiAdmin } from '@/lib/queries-portfolio';
import { PageHead } from '@/components/PageHead';
import { formatTanggal, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';

const JENIS_LABEL: Record<string, string> = {
  bahasa: 'Bahasa', kompetensi: 'Kompetensi', pelatihan: 'Pelatihan', lain: 'Lain',
};

export function AkademikSertifikasi() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading } = useAdminSertifikasi({ status: status || undefined, q: activeQ || undefined });
  const actions = useAdminSertifikasiActions();
  const [actErr, setActErr] = useState<string | null>(null);

  const verif = (s: SertifikasiAdmin, action: 'verifikasi' | 'tolak') => {
    const catatan = action === 'tolak' ? prompt('Alasan penolakan (opsional):') ?? undefined : undefined;
    actions.verifikasi.mutate({ id: s.id, action, catatan }, {
      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
    });
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="VERIFIKASI"
        title="Sertifikasi Mahasiswa"
        subtitle="Verifikasi sertifikasi yang dimiliki mahasiswa (TOEFL, IELTS, AWS, MTCNA, dll)."
      />
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
            <option value="">Semua</option>
            <option value="diajukan">Diajukan</option>
            <option value="diverifikasi">Diverifikasi</option>
            <option value="ditolak">Ditolak</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="Nama sertifikasi / penerbit / NIM" onKeyDown={(e) => e.key === 'Enter' && setActiveQ(q)} />
        </div>
        <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
      </div>

      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
            <FileBadge size={28} className="muted" />
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Tidak ada sertifikasi pada filter ini.</p>
          </div>
        </Card>
      )}
      {data && data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>Sertifikasi</th>
                <th>Jenis</th>
                <th>Tgl. Terbit</th>
                <th>Skor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div><strong>{s.mahasiswa.nama}</strong></div>
                    <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{s.mahasiswa.nim} · {s.mahasiswa.prodi.kode}</div>
                  </td>
                  <td>
                    <strong>{s.nama}</strong>
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Penerbit: {s.penerbit}</div>
                    {s.nomorSertifikat && <div className="mono" style={{ fontSize: 'var(--text-xs)' }}>No. {s.nomorSertifikat}</div>}
                    {s.fileUrl && <div style={{ fontSize: 'var(--text-xs)' }}><a href={safeHref(s.fileUrl) ?? undefined} target="_blank" rel="noopener noreferrer">📎 Bukti</a></div>}
                  </td>
                  <td>{JENIS_LABEL[s.jenis] ?? s.jenis}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{formatTanggal(s.tanggalTerbit)}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{s.skor ?? '—'}</td>
                  <td>
                    <Badge variant={s.status === 'diverifikasi' ? 'success' : s.status === 'ditolak' ? 'danger' : s.status === 'diajukan' ? 'warning' : 'neutral'} dot>
                      {s.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {(s.status === 'diajukan' || s.status === 'draft') && (
                      <>
                        <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />} onClick={() => verif(s, 'verifikasi')}>Verifikasi</Button>
                        <Button variant="ghost" size="sm" leftIcon={<XCircle size={14} />} onClick={() => verif(s, 'tolak')}>Tolak</Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => {
                      if (!confirm(`Hapus sertifikasi "${s.nama}"?`)) return;
                      actions.remove.mutate(s.id, { onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal') });
                    }}>Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
