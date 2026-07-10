import { useState } from 'react';
import { Alert, Badge, Card, Select } from '@/ds';
import { FlaskConical, HeartHandshake, MessageSquare } from 'lucide-react';
import { useOversightKonsultasi, useOversightPenelitian, useOversightPengabdian } from '@/lib/queries-portfolio';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';

type Tab = 'konsultasi' | 'penelitian' | 'pengabdian';

export function AkademikOversight() {
  const [tab, setTab] = useState<Tab>('konsultasi');

  return (
    <div className="stack">
      <PageHead
        eyebrow="AUDIT & OVERSIGHT"
        title="Aktivitas Lintas Dosen"
        subtitle="Pantau konsultasi DPA, penelitian, dan pengabdian masyarakat lintas dosen — read-only untuk keperluan audit & laporan."
      />

      <div className="row" style={{ gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        <TabBtn icon={<MessageSquare size={14} />} label="Konsultasi DPA" active={tab === 'konsultasi'} onClick={() => setTab('konsultasi')} />
        <TabBtn icon={<FlaskConical size={14} />} label="Penelitian" active={tab === 'penelitian'} onClick={() => setTab('penelitian')} />
        <TabBtn icon={<HeartHandshake size={14} />} label="Pengabdian" active={tab === 'pengabdian'} onClick={() => setTab('pengabdian')} />
      </div>

      {tab === 'konsultasi' && <KonsultasiPanel />}
      {tab === 'penelitian' && <PenelitianPanel />}
      {tab === 'pengabdian' && <PengabdianPanel />}
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--surface-sunken)' : 'transparent',
        border: 'none',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 'var(--text-sm)',
        color: active ? 'var(--accent)' : 'var(--text-fg)',
        fontWeight: active ? 600 : 400,
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {icon}{label}
    </button>
  );
}

function KonsultasiPanel() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useOversightKonsultasi({ status: status || undefined });
  return (
    <>
      <div style={{ minWidth: 180 }}>
        <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
          <option value="">Semua</option>
          <option value="diajukan">Diajukan</option>
          <option value="diterima">Diterima</option>
          <option value="selesai">Selesai</option>
          <option value="ditolak">Ditolak</option>
          <option value="batal">Batal</option>
        </Select>
      </div>
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && <EmptyPanel icon={<MessageSquare size={28} />} text="Tidak ada konsultasi." />}
      {data && data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr><th>Tanggal</th><th>Mahasiswa</th><th>DPA</th><th>Topik</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.items.map((k: any) => (
                <tr key={k.id}>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{formatTanggal(k.waktuMulai)}</td>
                  <td><strong>{k.mahasiswa.nama}</strong><div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{k.mahasiswa.nim}</div></td>
                  <td>{k.dpa.nama}<div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>{k.dpa.nidn}</div></td>
                  <td>{k.topik}</td>
                  <td><Badge variant={k.status === 'selesai' ? 'success' : k.status === 'ditolak' ? 'danger' : 'neutral'} dot>{k.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PenelitianPanel() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useOversightPenelitian({ status: status || undefined });
  return (
    <>
      <div style={{ minWidth: 180 }}>
        <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
          <option value="">Semua</option>
          <option value="proposal">Proposal</option>
          <option value="berjalan">Berjalan</option>
          <option value="selesai">Selesai</option>
          <option value="batal">Batal</option>
        </Select>
      </div>
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && <EmptyPanel icon={<FlaskConical size={28} />} text="Tidak ada penelitian." />}
      {data && data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr><th>Tahun</th><th>Judul</th><th>Ketua</th><th>Sumber Dana</th><th>Dana</th><th>Status</th><th className="num">Mhs</th></tr>
            </thead>
            <tbody>
              {data.items.map((p: any) => (
                <tr key={p.id}>
                  <td className="mono">{p.tahun}</td>
                  <td><strong>{p.judul}</strong></td>
                  <td>{p.ketuaDosen?.nama ?? '—'}</td>
                  <td>{p.sumberDana ?? '—'}</td>
                  <td className="mono">{p.jumlahDana ? `Rp ${Number(p.jumlahDana).toLocaleString('id-ID')}` : '—'}</td>
                  <td><Badge variant={p.status === 'selesai' ? 'success' : p.status === 'berjalan' ? 'warning' : 'neutral'} dot>{p.status}</Badge></td>
                  <td className="num mono">{p._count.mahasiswa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PengabdianPanel() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useOversightPengabdian({ status: status || undefined });
  return (
    <>
      <div style={{ minWidth: 180 }}>
        <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
          <option value="">Semua</option>
          <option value="proposal">Proposal</option>
          <option value="berjalan">Berjalan</option>
          <option value="selesai">Selesai</option>
          <option value="batal">Batal</option>
        </Select>
      </div>
      {isLoading && <p className="muted">Memuat…</p>}
      {data && data.items.length === 0 && <EmptyPanel icon={<HeartHandshake size={28} />} text="Tidak ada pengabdian." />}
      {data && data.items.length > 0 && (
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr><th>Tahun</th><th>Judul</th><th>Lokasi</th><th>Ketua</th><th>Status</th><th className="num">Mhs</th></tr>
            </thead>
            <tbody>
              {data.items.map((p: any) => (
                <tr key={p.id}>
                  <td className="mono">{p.tahun}</td>
                  <td><strong>{p.judul}</strong></td>
                  <td>{p.lokasi ?? '—'}</td>
                  <td>{p.ketuaDosen?.nama ?? '—'}</td>
                  <td><Badge variant={p.status === 'selesai' ? 'success' : p.status === 'berjalan' ? 'warning' : 'neutral'} dot>{p.status}</Badge></td>
                  <td className="num mono">{p._count.mahasiswa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function EmptyPanel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
        <span className="muted">{icon}</span>
        <p className="muted" style={{ marginTop: 'var(--space-2)' }}>{text}</p>
      </div>
    </Card>
  );
}

