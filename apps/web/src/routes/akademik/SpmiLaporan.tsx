import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@/ds';
import { FileText, Target, ClipboardCheck, TrendingUp, MessageSquare, BookOpen, Calendar, Download, Printer } from 'lucide-react';
import { useAmiList, useRtmList, useSurveiList, type LaporanPencapaian } from '@/lib/queries-spmi';
import { api } from '@/lib/api';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';

export function AkademikSpmiLaporan() {
  const [periode, setPeriode] = useState(new Date().getFullYear().toString());

  const ami = useAmiList();
  const rtm = useRtmList();
  const survei = useSurveiList();

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAPORAN MUTU"
        title="Laporan SPMI"
        subtitle="Cetak dokumen pelaporan SPMI untuk audit internal, BAN-PT, dan LLDIKTI sesuai siklus PPEPP."
      />

      <Alert variant="info" title="Cara penggunaan">
        Setiap laporan terbuka di tab baru dalam mode cetak. Pakai tombol <strong>Cetak</strong> di laporan untuk simpan PDF (via printer "Save as PDF") atau cetak fisik.
      </Alert>

      {/* Periode-based reports */}
      <Card>
        <SectionHead label="Laporan per Periode" desc="Tentukan periode (mis. 2025, 2025-1, 2025/2026 Ganjil) — laporan akan menarik data sesuai filter." />
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', marginTop: 'var(--space-3)' }}>
          <div style={{ minWidth: 240 }}>
            <Input label="Periode" value={periode} onChange={(e) => setPeriode((e.target as HTMLInputElement).value)} placeholder="2025-1 atau 2025/2026 Ganjil" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          <LaporanCard
            icon={<Target size={22} />}
            title="Pencapaian Standar Mutu"
            desc="Tabel pencapaian seluruh standar aktif vs target — untuk evaluasi SPMI per periode."
            cta="Buka laporan"
            ctaIcon={<Printer size={14} />}
            disabled={!periode}
            to={`/akademik/spmi/laporan/pencapaian?periode=${encodeURIComponent(periode)}`}
          />
          <LaporanCard
            icon={<BookOpen size={22} />}
            title="Laporan PPEPP Komprehensif"
            desc="Dokumen lengkap penetapan → peningkatan untuk pimpinan & audit eksternal."
            cta="Buka laporan"
            ctaIcon={<Printer size={14} />}
            disabled={!periode}
            to={`/akademik/spmi/laporan/ppepp?periode=${encodeURIComponent(periode)}`}
            highlight
          />
          <LaporanCard
            icon={<Download size={22} />}
            title="Export CSV Pencapaian"
            desc="Data tabular untuk pengolahan lanjutan (Excel / Google Sheets)."
            cta="Unduh CSV"
            ctaIcon={<Download size={14} />}
            disabled={!periode}
            onClick={() => downloadCsv(periode)}
          />
        </div>
      </Card>

      {/* AMI */}
      <Card>
        <SectionHead
          icon={<ClipboardCheck size={16} />}
          label="Laporan AMI"
          desc="Pilih audit untuk mencetak detail auditor, lingkup, temuan, dan tindak lanjut."
        />
        {ami.data && ami.data.items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {ami.data.items.slice(0, 12).map((a) => (
              <EntityCetakCard
                key={a.id}
                kode={a.kode}
                judul={a.nama}
                meta={`Periode ${a.periode}`}
                status={a.status}
                statusVariant={a.status === 'selesai' ? 'success' : a.status === 'pelaksanaan' ? 'warning' : 'neutral'}
                to={`/akademik/spmi/laporan/ami/${a.id}`}
              />
            ))}
          </div>
        ) : <Empty text="Belum ada AMI." />}
      </Card>

      {/* RTM */}
      <Card>
        <SectionHead
          icon={<TrendingUp size={16} />}
          label="Risalah RTM"
          desc="Cetak risalah/berita acara RTM lengkap dengan notulen & keputusan."
        />
        {rtm.data && rtm.data.items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {rtm.data.items.slice(0, 12).map((r) => (
              <EntityCetakCard
                key={r.id}
                kode={r.kode}
                judul={r.judul}
                meta={<><Calendar size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{formatTanggal(r.tanggal)}</>}
                status={r.status}
                statusVariant={r.status === 'selesai' ? 'success' : 'neutral'}
                to={`/akademik/spmi/laporan/rtm/${r.id}`}
              />
            ))}
          </div>
        ) : <Empty text="Belum ada RTM." />}
      </Card>

      {/* Survei */}
      <Card>
        <SectionHead
          icon={<MessageSquare size={16} />}
          label="Hasil Survei Kepuasan"
          desc="Cetak agregasi hasil survei (Likert + pilihan + sample esai)."
        />
        {survei.data && survei.data.items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {survei.data.items.slice(0, 12).map((s) => (
              <EntityCetakCard
                key={s.id}
                kode={s.kode}
                judul={s.judul}
                meta={`${s._count?.response ?? 0} response`}
                status={s.status}
                statusVariant={s.status === 'publish' ? 'success' : s.status === 'ditutup' ? 'danger' : 'neutral'}
                to={`/akademik/spmi/laporan/survei/${s.id}`}
              />
            ))}
          </div>
        ) : <Empty text="Belum ada survei." />}
      </Card>
    </div>
  );
}

function SectionHead({ icon, label, desc }: { icon?: React.ReactNode; label: string; desc: string }) {
  return (
    <div>
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        {icon && <div className="muted">{icon}</div>}
        <strong style={{ color: 'var(--text-strong)' }}>{label}</strong>
      </div>
      <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>{desc}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-4) 0', marginTop: 'var(--space-2)' }} className="muted">
      {text}
    </div>
  );
}

function EntityCetakCard({
  kode, judul, meta, status, statusVariant, to,
}: {
  kode: string; judul: string; meta: React.ReactNode;
  status: string; statusVariant: 'success' | 'warning' | 'danger' | 'neutral';
  to: string;
}) {
  return (
    <Link to={to} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} className="spmi-nav-card">
      <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="mono muted" style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}>{kode}</div>
          <Badge variant={statusVariant} dot>{status}</Badge>
        </div>
        <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>{judul}</strong>
        <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{meta}</div>
        <div className="row" style={{ gap: 4, color: 'var(--accent)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)', fontWeight: 600 }}>
          <Printer size={14} /> Buka & cetak →
        </div>
      </Card>
    </Link>
  );
}

function LaporanCard({
  icon, title, desc, cta, ctaIcon, to, onClick, disabled, highlight,
}: {
  icon: React.ReactNode; title: string; desc: string;
  cta?: string; ctaIcon?: React.ReactNode;
  to?: string; onClick?: () => void; disabled?: boolean; highlight?: boolean;
}) {
  const content = (
    <Card
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderLeft: '3px solid var(--accent)',
        background: highlight ? 'linear-gradient(135deg, var(--surface) 0%, rgba(208,166,86,0.08) 100%)' : undefined,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-sm)',
        background: 'rgba(208,166,86,0.12)', color: 'var(--accent)',
        display: 'grid', placeItems: 'center',
      }}>
        {icon}
      </div>
      <strong style={{ color: 'var(--text-strong)', marginTop: 4 }}>{title}</strong>
      <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{desc}</div>
      {cta && (
        <div className="row" style={{ gap: 4, color: 'var(--accent)', fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
          {ctaIcon}{cta} →
        </div>
      )}
    </Card>
  );
  if (disabled) return <div className="spmi-nav-card">{content}</div>;
  if (onClick) return <div onClick={onClick} role="button" tabIndex={0} className="spmi-nav-card">{content}</div>;
  return <Link to={to ?? '#'} style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer" className="spmi-nav-card">{content}</Link>;
}

async function downloadCsv(periode: string) {
  let data: LaporanPencapaian;
  try {
    data = await api<LaporanPencapaian>(`/akademik/spmi/laporan/standar?periode=${encodeURIComponent(periode)}`);
  } catch {
    alert('Gagal mengunduh laporan');
    return;
  }
  const rows: string[] = [];
  rows.push(['Kode', 'Nama Standar', 'Kategori', 'Satuan', 'Target Min', 'Target Max', 'Ambang Cukup', 'Sumber Data', 'Periode', 'Nilai Aktual', 'Status'].join(','));
  for (const it of data.items) {
    const p = it.pengukuran;
    rows.push([
      it.kode,
      `"${it.nama.replace(/"/g, '""')}"`,
      it.kategori,
      it.satuan ?? '',
      it.targetMin ?? '',
      it.targetMax ?? '',
      it.ambangCukup ?? '',
      it.sumberData,
      data.periode,
      p?.nilai ?? '',
      p?.status ?? 'belum_diukur',
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-pencapaian-standar-${periode}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
