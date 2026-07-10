import { Link } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { Plus, ChevronRight, BookCheck } from 'lucide-react';
import { useDosenBkdList, useDosenBkdActions } from '@/lib/queries-bkd';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function DosenBkd() {
  const { data, isLoading, error } = useDosenBkdList();
  const actions = useDosenBkdActions();
  const navigate = useNavigate();
  const [actErr, setActErr] = useState<string | null>(null);

  const buatBaru = async () => {
    setActErr(null);
    try {
      const r = await actions.create.mutateAsync({});
      navigate(`/dosen/bkd/${(r as any).id}`);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="BEBAN KERJA DOSEN"
        title="Laporan BKD"
        subtitle="Susun laporan BKD per semester. Item pengajaran otomatis diisi dari kelas yang Anda ampu — tambah item penelitian/pengabdian/penunjang manual."
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={buatBaru} disabled={actions.create.isPending}>
            {actions.create.isPending ? 'Membuat…' : 'Buat BKD Semester Ini'}
          </Button>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      {data && data.items.length === 0 && (
        <Alert variant="info" title="Belum ada laporan">Klik "Buat BKD Semester Ini" untuk membuat laporan pertama (otomatis diisi dari data Anda).</Alert>
      )}

      <div className="stack">
        {data?.items.map((lap) => (
          <Link key={lap.id} to={`/dosen/bkd/${lap.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card hover>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <BookCheck size={16} className="muted" />
                    <strong style={{ color: 'var(--text-strong)' }}>
                      {lap.semester ? `${lap.semester.jenis} ${lap.semester.tahunAjaran.kode}` : 'Semester'}
                    </strong>
                    <StatusPill status={lap.status} />
                  </div>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                    Total ekuivalen: <strong>{lap.totalSks.toFixed(1)} SKS</strong>
                    {' · '}{lap._count?.items ?? 0} item
                    {lap.diverifikasiPada && ` · Diverifikasi ${formatTanggalWaktu(lap.diverifikasiPada)}`}
                  </div>
                  {lap.catatanAkademik && (
                    <div style={{ marginTop: 8, padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Catatan akademik:</div>
                      <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>{lap.catatanAkademik}</p>
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
