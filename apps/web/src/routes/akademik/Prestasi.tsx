import { useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Search, CheckCircle2, XCircle, Trash2, Award } from 'lucide-react';
import { useAdminPrestasi, useAdminPrestasiActions, type PrestasiAdmin } from '@/lib/queries-portfolio';
import { PageHead } from '@/components/PageHead';
import { formatTanggal, safeHref } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { TableSkeletonRows } from '@/components/Skeleton';

const JENIS_LABEL: Record<string, string> = {
  lomba_akademik: 'Lomba Akademik',
  lomba_non_akademik: 'Lomba Non-Akademik',
  kepanitiaan: 'Kepanitiaan',
  organisasi: 'Organisasi',
  publikasi: 'Publikasi',
  lain: 'Lain',
};
const LEVEL_LABEL: Record<string, string> = {
  internasional: 'Internasional', nasional: 'Nasional', regional: 'Regional', lokal: 'Lokal', internal: 'Internal',
};

export function AkademikPrestasi() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading } = useAdminPrestasi({ status: status || undefined, q: activeQ || undefined });
  const actions = useAdminPrestasiActions();
  const [actErr, setActErr] = useState<string | null>(null);

  const verif = (p: PrestasiAdmin, action: 'verifikasi' | 'tolak') => {
    const catatan = action === 'tolak' ? prompt('Alasan penolakan (opsional):') ?? undefined : undefined;
    actions.verifikasi.mutate({ id: p.id, action, catatan }, {
      onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
    });
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="VERIFIKASI"
        title="Prestasi Mahasiswa"
        subtitle="Verifikasi pengajuan prestasi mahasiswa (lomba, organisasi, publikasi, kepanitiaan)."
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
          <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="Nama prestasi / NIM / Nama" onKeyDown={(e) => e.key === 'Enter' && setActiveQ(q)} />
        </div>
        <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
      </div>

      {data && data.items.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
            <Award size={28} className="muted" />
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Tidak ada prestasi pada filter ini.</p>
          </div>
        </Card>
      )}
      {(isLoading || (data && data.items.length > 0)) && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>Prestasi</th>
                <th>Jenis</th>
                <th>Level</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeletonRows cols={7} rows={5} />}
              {data?.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div><strong>{p.mahasiswa.nama}</strong></div>
                    <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{p.mahasiswa.nim} · {p.mahasiswa.prodi.kode}</div>
                  </td>
                  <td>
                    <strong>{p.nama}</strong>
                    {p.penyelenggara && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{p.penyelenggara}</div>}
                    {p.peran && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Peran: {p.peran}</div>}
                    {p.fileUrl && <div style={{ fontSize: 'var(--text-xs)' }}><a href={safeHref(p.fileUrl) ?? undefined} target="_blank" rel="noopener noreferrer">📎 Bukti</a></div>}
                  </td>
                  <td>{JENIS_LABEL[p.jenis] ?? p.jenis}</td>
                  <td>{p.level ? LEVEL_LABEL[p.level] ?? p.level : '—'}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{formatTanggal(p.tanggal)}</td>
                  <td>
                    <Badge variant={p.status === 'diverifikasi' ? 'success' : p.status === 'ditolak' ? 'danger' : p.status === 'diajukan' ? 'warning' : 'neutral'} dot>
                      {p.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {(p.status === 'diajukan' || p.status === 'draft') && (
                      <>
                        <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />} onClick={() => verif(p, 'verifikasi')}>Verifikasi</Button>
                        <Button variant="ghost" size="sm" leftIcon={<XCircle size={14} />} onClick={() => verif(p, 'tolak')}>Tolak</Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => {
                      if (!confirm(`Hapus prestasi "${p.nama}"?`)) return;
                      actions.remove.mutate(p.id, { onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal') });
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
