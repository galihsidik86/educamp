import { Link } from 'react-router-dom';
import { Alert, Badge, Card, ProgressBar, StatCard } from '@/ds';
import {
  ShieldCheck, Target, ClipboardCheck, Wrench, TrendingUp, MessageSquare,
  CheckCircle2, AlertTriangle, Clock, FileText, ArrowRight,
} from 'lucide-react';
import { useSpmiDashboard } from '@/lib/queries-spmi';
import { DashboardHero } from '@/components/DashboardHero';

const KAT_STD_LABEL: Record<string, string> = {
  pendidikan: 'Pendidikan', penelitian: 'Penelitian', pengabdian: 'Pengabdian',
  pengelolaan: 'Pengelolaan', sarpras: 'Sarpras', pembiayaan: 'Pembiayaan',
  spmi_tambahan: 'Standar tambahan', non_akademik: 'Non-akademik',
  standar_internasional: 'Standar Internasional',
};

const STAT_AMI_LABEL: Record<string, string> = {
  perencanaan: 'Perencanaan', pelaksanaan: 'Pelaksanaan',
  selesai: 'Selesai', ditangguhkan: 'Ditangguhkan',
};

const STAT_CAPA_LABEL: Record<string, string> = {
  rencana: 'Rencana', pelaksanaan: 'Pelaksanaan', verifikasi: 'Verifikasi',
  closed: 'Closed', ditolak: 'Ditolak',
};

const KAT_TMN_LABEL: Record<string, string> = {
  ktsm: 'KTS Major', kts: 'KTS Minor', observasi: 'Observasi', saran: 'Saran',
};

const KAT_TMN_VARIANT: Record<string, 'danger' | 'warning' | 'neutral' | 'accent'> = {
  ktsm: 'danger', kts: 'warning', observasi: 'neutral', saran: 'accent',
};

const STAT_CAPA_VARIANT: Record<string, 'neutral' | 'warning' | 'accent' | 'success' | 'danger'> = {
  rencana: 'neutral', pelaksanaan: 'warning', verifikasi: 'accent', closed: 'success', ditolak: 'danger',
};

export function AkademikSpmi() {
  const { data, isLoading, error } = useSpmiDashboard();

  return (
    <div className="stack">
      <DashboardHero
        eyebrow={<><ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Penjaminan Mutu · Permenristekdikti 39/2025</>}
        title="Dashboard SPMI"
        subtitle={<>Pantau siklus <strong>PPEPP</strong> (Penetapan · Pelaksanaan · Evaluasi · Pengendalian · Peningkatan) — capaian standar mutu, audit internal, tindak lanjut, RTM, dan kepuasan stakeholder.</>}
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang halaman.</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      {data && (
        <>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            <StatCard
              icon={<Target size={18} />}
              label="Total Standar Aktif"
              value={data.penetapan.totalStandar}
              delta={`${data.penetapan.perKategori.length} kategori`}
            />
            <StatCard
              icon={<CheckCircle2 size={18} />}
              label="Persentase Tercapai"
              value={`${data.evaluasi.persenTercapai}%`}
              delta={`${data.evaluasi.capaian.tercapai} / ${data.penetapan.totalStandar} standar`}
              deltaDir={data.evaluasi.persenTercapai >= 75 ? 'up' : 'down'}
            />
            <StatCard
              icon={<ClipboardCheck size={18} />}
              label="Temuan AMI"
              value={sum(data.ami.temuanPerKategori)}
              delta={`dari ${sum(data.ami.perStatus)} audit`}
            />
            <StatCard
              icon={<Wrench size={18} />}
              label="CAPA Overdue"
              value={data.pengendalian.overdue}
              delta={data.pengendalian.overdue > 0 ? 'Perlu tindakan' : 'Semua on-track'}
              deltaDir={data.pengendalian.overdue > 0 ? 'down' : 'up'}
            />
          </div>

          {/* Pencapaian — visualisasi capaian */}
          <Card>
            <SectionHead icon={<ShieldCheck size={16} />} label="EVALUASI · PENCAPAIAN STANDAR" title={`${data.evaluasi.persenTercapai}% standar tercapai`} />
            <div style={{ marginTop: 'var(--space-3)' }}>
              <ProgressBar
                value={data.evaluasi.persenTercapai}
                max={100}
                variant={data.evaluasi.persenTercapai >= 75 ? 'success' : data.evaluasi.persenTercapai >= 50 ? 'accent' : 'primary'}
                showValue
              />
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <CapaianTile icon={<CheckCircle2 size={16} />} label="Tercapai" value={data.evaluasi.capaian.tercapai} total={data.penetapan.totalStandar} color="success" />
              <CapaianTile icon={<TrendingUp size={16} />} label="Cukup" value={data.evaluasi.capaian.cukup} total={data.penetapan.totalStandar} color="warning" />
              <CapaianTile icon={<AlertTriangle size={16} />} label="Belum tercapai" value={data.evaluasi.capaian.belum_tercapai} total={data.penetapan.totalStandar} color="danger" />
              <CapaianTile icon={<Clock size={16} />} label="Belum diukur" value={data.evaluasi.capaian.belum_diukur} total={data.penetapan.totalStandar} color="muted" />
            </div>
          </Card>

          {/* Navigasi modul */}
          <div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>
              Modul SPMI
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
              <NavCard
                to="/akademik/spmi/standar"
                icon={<Target size={22} />}
                title="Standar Mutu"
                desc={`${data.penetapan.totalStandar} standar aktif`}
                meta="Penetapan"
              />
              <NavCard
                to="/akademik/spmi/ami"
                icon={<ClipboardCheck size={22} />}
                title="Audit Mutu Internal"
                desc={`${sum(data.ami.perStatus)} audit · ${sum(data.ami.temuanPerKategori)} temuan`}
                meta="Evaluasi"
              />
              <NavCard
                to="/akademik/spmi/capa"
                icon={<Wrench size={22} />}
                title="Tindak Lanjut (CAPA)"
                desc={data.pengendalian.overdue > 0 ? `${data.pengendalian.overdue} overdue` : 'Semua on-track'}
                meta="Pengendalian"
                accent={data.pengendalian.overdue > 0 ? 'danger' : undefined}
              />
              <NavCard
                to="/akademik/spmi/rtm"
                icon={<TrendingUp size={22} />}
                title="Rapat Tinjauan Manajemen"
                desc={`${data.peningkatan.keputusanOpen} keputusan terbuka`}
                meta="Peningkatan"
              />
              <NavCard
                to="/akademik/spmi/survei"
                icon={<MessageSquare size={22} />}
                title="Survei Kepuasan"
                desc={`${data.survei.surveiAktif} aktif · ${data.survei.totalResponse} response`}
                meta="Feedback"
              />
              <NavCard
                to="/akademik/spmi/laporan"
                icon={<FileText size={22} />}
                title="Laporan SPMI"
                desc="Cetak pencapaian, AMI, RTM, PPEPP, survei"
                meta="Pelaporan"
                highlight
              />
            </div>
          </div>

          {/* Breakdown grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
            <Card>
              <SectionHead icon={<Target size={16} />} label="Penetapan" title="Sebaran per kategori" />
              {data.penetapan.perKategori.length === 0 ? (
                <EmptyMini icon={<Target size={20} />} text="Belum ada standar mutu." />
              ) : (
                <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
                  {data.penetapan.perKategori.map((k) => {
                    const pct = data.penetapan.totalStandar > 0 ? (k.jumlah / data.penetapan.totalStandar) * 100 : 0;
                    return (
                      <div key={k.kategori}>
                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 'var(--text-sm)' }}>{KAT_STD_LABEL[k.kategori] ?? k.kategori}</span>
                          <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-strong)', fontWeight: 600 }}>{k.jumlah}</span>
                        </div>
                        <ProgressBar value={pct} max={100} variant="primary" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <SectionHead icon={<ClipboardCheck size={16} />} label="Evaluasi · AMI" title="Audit & temuan" />
              {data.ami.perStatus.length === 0 ? (
                <EmptyMini icon={<ClipboardCheck size={20} />} text="Belum ada AMI dijadwalkan." />
              ) : (
                <>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-3)' }}>Status</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {data.ami.perStatus.map((s) => (
                      <Badge key={s.status} variant="neutral">{STAT_AMI_LABEL[s.status] ?? s.status} · {s.jumlah}</Badge>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-3)' }}>Temuan per kategori</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {data.ami.temuanPerKategori.map((t) => (
                      <Badge key={t.kategori} variant={KAT_TMN_VARIANT[t.kategori] ?? 'neutral'} dot>
                        {KAT_TMN_LABEL[t.kategori] ?? t.kategori} · {t.jumlah}
                      </Badge>
                    ))}
                  </div>
                  {/* Pelaporan SPME — Permenristekdikti 39/2025 */}
                  {data.ami.total != null && data.ami.total > 0 && (
                    <>
                      <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-3)' }}>
                        Dilaporkan ke SPME
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Badge variant={(data.ami.dilaporkanKeSpme ?? 0) === data.ami.total ? 'success' : (data.ami.dilaporkanKeSpme ?? 0) > 0 ? 'warning' : 'neutral'} dot>
                          {data.ami.dilaporkanKeSpme ?? 0} dari {data.ami.total} audit
                        </Badge>
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>

            <Card>
              <SectionHead icon={<Wrench size={16} />} label="Pengendalian · CAPA" title="Tindak lanjut" />
              {data.pengendalian.capaPerStatus.length === 0 ? (
                <EmptyMini icon={<Wrench size={20} />} text="Belum ada CAPA tercatat." />
              ) : (
                <>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-3)' }}>
                    {data.pengendalian.capaPerStatus.map((s) => (
                      <Badge key={s.status} variant={STAT_CAPA_VARIANT[s.status] ?? 'neutral'} dot>
                        {STAT_CAPA_LABEL[s.status] ?? s.status} · {s.jumlah}
                      </Badge>
                    ))}
                  </div>
                  {data.pengendalian.overdue > 0 && (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <Alert variant="warning" title={`${data.pengendalian.overdue} CAPA overdue`}>
                        Periksa daftar tindak lanjut dan segera koordinasikan dengan PIC.
                      </Alert>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function NavCard({
  to, icon, title, desc, meta, accent, highlight,
}: {
  to: string; icon: React.ReactNode; title: string; desc: string; meta?: string;
  accent?: 'danger'; highlight?: boolean;
}) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }} className="spmi-nav-card">
      <Card
        style={{
          height: '100%',
          borderLeft: accent === 'danger' ? '3px solid var(--danger-fg)' : '3px solid var(--accent)',
          background: highlight ? 'linear-gradient(135deg, var(--surface) 0%, rgba(208,166,86,0.08) 100%)' : undefined,
          transition: 'transform .15s ease, box-shadow .15s ease',
          cursor: 'pointer',
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: accent === 'danger' ? 'rgba(239,68,68,0.10)' : 'rgba(208,166,86,0.12)',
              color: accent === 'danger' ? 'var(--danger-fg)' : 'var(--accent)',
              display: 'grid', placeItems: 'center',
            }}
          >
            {icon}
          </div>
          <ArrowRight size={16} className="muted" />
        </div>
        {meta && (
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-2)' }}>
            {meta}
          </div>
        )}
        <strong style={{ color: 'var(--text-strong)', display: 'block', marginTop: 2, fontSize: 'var(--text-base)' }}>
          {title}
        </strong>
        <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>{desc}</div>
      </Card>
    </Link>
  );
}

function SectionHead({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div>
      <div className="muted row" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', gap: 'var(--space-1)', alignItems: 'center' }}>
        {icon}{label}
      </div>
      <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)', display: 'block', marginTop: 2 }}>{title}</strong>
    </div>
  );
}

function CapaianTile({ icon, label, value, total, color }: { icon: React.ReactNode; label: string; value: number; total: number; color: 'success' | 'warning' | 'danger' | 'muted' }) {
  const bg = color === 'success' ? 'rgba(34,197,94,0.10)' : color === 'warning' ? 'rgba(234,179,8,0.12)' : color === 'danger' ? 'rgba(239,68,68,0.10)' : 'var(--surface-sunken)';
  const fg = color === 'success' ? 'var(--success-fg)' : color === 'warning' ? 'var(--warning-fg)' : color === 'danger' ? 'var(--danger-fg)' : 'var(--text-muted)';
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ flex: '1 1 160px', padding: 'var(--space-3)', background: bg, borderRadius: 'var(--radius-sm)' }}>
      <div className="row" style={{ alignItems: 'center', gap: 6, color: fg, fontSize: 'var(--text-xs)' }}>
        {icon}<span style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: fg, lineHeight: 1 }}>{value}</span>
        <span className="mono muted" style={{ fontSize: 'var(--text-xs)' }}>{pct}%</span>
      </div>
    </div>
  );
}

function EmptyMini({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-4) 0', gap: 6 }}>
      <div className="muted" style={{ opacity: 0.6 }}>{icon}</div>
      <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{text}</span>
    </div>
  );
}

function sum(arr: Array<{ jumlah: number }>) {
  return arr.reduce((s, a) => s + a.jumlah, 0);
}
