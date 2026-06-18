import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useLaporanPpepp, type StatusPencapaian, type KategoriTemuan, type StatusCapa, type StatusKeputusan } from '@/lib/queries-spmi';
import { formatTanggal } from '@/lib/format';
import { KopInstitusi } from '@/components/KopInstitusi';

const STATUS_LABEL: Record<StatusPencapaian, string> = {
  tercapai: 'Tercapai', cukup: 'Cukup', belum_tercapai: 'Belum Tercapai', belum_diukur: 'Belum Diukur',
};
const TEMUAN_LABEL: Record<KategoriTemuan, string> = {
  ktsm: 'KTS Major', kts: 'KTS Minor', observasi: 'Observasi', saran: 'Saran',
};
const CAPA_LABEL: Record<StatusCapa, string> = {
  rencana: 'Rencana', pelaksanaan: 'Pelaksanaan', verifikasi: 'Verifikasi', closed: 'Closed', ditolak: 'Ditolak',
};
const KEP_LABEL: Record<StatusKeputusan, string> = {
  open: 'Open', in_progress: 'Dilaksanakan', done: 'Selesai', cancelled: 'Dibatalkan',
};

export function LaporanPpepp() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const periode = sp.get('periode') ?? undefined;
  const { data, isLoading } = useLaporanPpepp(periode);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Data tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/akademik/spmi/laporan')} leftIcon={<ArrowLeft size={14} />}>Kembali</Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>Cetak</Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <KopInstitusi subtitle="Lembaga Penjaminan Mutu (LPM)" />
          <h2 className="krs-cetak__title">LAPORAN SPMI KOMPREHENSIF</h2>
          <div className="krs-cetak__subtitle">Siklus PPEPP — Periode {data.periode}</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>Periode</td><td>:</td><td><strong>{data.periode}</strong></td><td>Tanggal Cetak</td><td>:</td><td>{tanggalCetak}</td></tr>
            <tr><td>Institusi</td><td>:</td><td colSpan={4}>{data.institusi}</td></tr>
            <tr><td>Dasar</td><td>:</td><td colSpan={4}>Permenristekdikti No. 39 Tahun 2025 — Sistem Penjaminan Mutu Pendidikan Tinggi</td></tr>
          </tbody>
        </table>

        {/* ============ I. PENETAPAN ============ */}
        <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-strong)', paddingBottom: 4 }}>
          I. Penetapan
        </h3>
        <p>Sistem Penjaminan Mutu Internal Tazkia menetapkan <strong>{data.penetapan.totalStandar} standar mutu</strong> aktif yang mencakup standar nasional pendidikan tinggi dan standar tambahan/pelampauan PT.</p>

        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead><tr><th style={{ width: '10%' }}>Kode</th><th>Standar</th><th style={{ width: '12%' }}>Kategori</th><th style={{ width: '12%' }}>Target</th></tr></thead>
          <tbody>
            {data.penetapan.standar.map((s) => {
              const target = s.targetMin != null ? `≥ ${s.targetMin}${s.satuan ? ` ${s.satuan}` : ''}`
                : s.targetMax != null ? `≤ ${s.targetMax}${s.satuan ? ` ${s.satuan}` : ''}` : '—';
              return (
                <tr key={s.id}>
                  <td className="mono"><strong>{s.kode}</strong></td>
                  <td>{s.nama}{s.prodi && <div className="muted" style={{ fontSize: '10px' }}>Prodi: {s.prodi.kode}</div>}</td>
                  <td>{s.kategori}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{target}</td>
                </tr>
              );
            })}
            {data.penetapan.standar.length === 0 && (
              <tr><td colSpan={4} className="center muted">Belum ada standar mutu.</td></tr>
            )}
          </tbody>
        </table>

        {/* ============ II. PELAKSANAAN ============ */}
        <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-strong)', paddingBottom: 4 }}>
          II. Pelaksanaan
        </h3>
        <p>Pelaksanaan standar mutu dijalankan oleh unit-unit fungsional Tazkia melalui modul operasional di Sistem Informasi Akademik (SIAKAD), meliputi: penyelenggaraan kuliah & kehadiran (Pertemuan, Absensi), penilaian pembelajaran (Krs, Nilai, NilaiCpmk), pelaksanaan EDOM, bimbingan akademik (KonsultasiDpa, Skripsi, KKN, MBKM), beban kerja dosen (BKD), serta layanan administratif (Surat, Tiket, Beasiswa, Yudisium). Data pencapaian ditarik otomatis dari modul-modul ini ke pengukuran standar.</p>

        {/* ============ III. EVALUASI ============ */}
        <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-strong)', paddingBottom: 4 }}>
          III. Evaluasi
        </h3>
        <p>Evaluasi dilakukan melalui (a) pengukuran pencapaian standar pada periode pelaporan, dan (b) Audit Mutu Internal (AMI).</p>

        <h4 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-base)' }}>III.1 Pencapaian Standar</h4>
        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-3)' }}>
          <thead><tr><th>Status</th><th className="num">Tercapai</th><th className="num">Cukup</th><th className="num">Belum Tercapai</th><th className="num">Belum Diukur</th><th className="num">% Tercapai</th></tr></thead>
          <tbody>
            <tr>
              <td>Jumlah</td>
              <td className="num mono">{data.evaluasi.capaian.tercapai}</td>
              <td className="num mono">{data.evaluasi.capaian.cukup}</td>
              <td className="num mono">{data.evaluasi.capaian.belum_tercapai}</td>
              <td className="num mono">{data.evaluasi.capaian.belum_diukur}</td>
              <td className="num mono"><strong>{data.evaluasi.persenTercapai}%</strong></td>
            </tr>
          </tbody>
        </table>

        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead><tr><th style={{ width: '10%' }}>Kode</th><th>Standar</th><th className="num" style={{ width: '12%' }}>Nilai</th><th style={{ width: '14%' }}>Status</th></tr></thead>
          <tbody>
            {data.penetapan.standar.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.kode}</td>
                <td>{s.nama}</td>
                <td className="num mono">{s.pengukuran?.nilai ?? '—'}</td>
                <td>{s.pengukuran ? STATUS_LABEL[s.pengukuran.status] : 'Belum diukur'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-base)' }}>III.2 Audit Mutu Internal (AMI)</h4>
        {data.ami.length === 0 ? (
          <p className="muted">Belum ada AMI pada periode {data.periode}.</p>
        ) : (
          <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Kode AMI</th>
                <th>Nama</th>
                <th style={{ width: '12%' }}>Status</th>
                <th className="num" style={{ width: '8%' }}>Auditor</th>
                <th className="num" style={{ width: '8%' }}>Lingkup</th>
                <th className="num" style={{ width: '8%' }}>KTSM</th>
                <th className="num" style={{ width: '8%' }}>KTS</th>
                <th className="num" style={{ width: '8%' }}>Obs</th>
                <th className="num" style={{ width: '8%' }}>Saran</th>
              </tr>
            </thead>
            <tbody>
              {data.ami.map((a) => (
                <tr key={a.id}>
                  <td className="mono"><strong>{a.kode}</strong></td>
                  <td>{a.nama}</td>
                  <td>{a.status}</td>
                  <td className="num mono">{a.jumlahAuditor}</td>
                  <td className="num mono">{a.jumlahLingkup}</td>
                  <td className="num mono">{a.ringkasanTemuan.ktsm}</td>
                  <td className="num mono">{a.ringkasanTemuan.kts}</td>
                  <td className="num mono">{a.ringkasanTemuan.observasi}</td>
                  <td className="num mono">{a.ringkasanTemuan.saran}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ============ IV. PENGENDALIAN ============ */}
        <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-strong)', paddingBottom: 4 }}>
          IV. Pengendalian
        </h3>
        <p>
          Tindak lanjut atas temuan AMI dikelola melalui mekanisme Corrective &amp; Preventive Action (CAPA).
          Total CAPA aktif: <strong>{data.pengendalian.capaAktif.length}</strong>
          {data.pengendalian.jumlahOverdue > 0 && <> · CAPA overdue: <strong style={{ color: 'var(--danger-fg)' }}>{data.pengendalian.jumlahOverdue}</strong></>}
        </p>

        {data.pengendalian.capaAktif.length > 0 && (
          <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Temuan</th>
                <th style={{ width: '10%' }}>AMI</th>
                <th>Rencana Tindakan</th>
                <th style={{ width: '18%' }}>PIC</th>
                <th style={{ width: '10%' }}>Target</th>
                <th style={{ width: '10%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.pengendalian.capaAktif.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.temuanKode}</td>
                  <td className="mono">{c.amiKode}</td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>{c.rencanaTindakan}</td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>{c.pic ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-sm)', color: c.isOverdue ? 'var(--danger-fg)' : undefined }}>
                    {formatTanggal(c.targetSelesai)}{c.isOverdue && ' (overdue)'}
                  </td>
                  <td>{CAPA_LABEL[c.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ============ V. PENINGKATAN ============ */}
        <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-strong)', paddingBottom: 4 }}>
          V. Peningkatan
        </h3>
        <p>Peningkatan dilakukan melalui Rapat Tinjauan Manajemen (RTM) yang menghasilkan keputusan strategis untuk peningkatan kinerja sistem mutu.</p>

        {data.peningkatan.rtm.length === 0 ? (
          <p className="muted">Belum ada RTM tercatat.</p>
        ) : (
          data.peningkatan.rtm.map((r) => (
            <div key={r.id} style={{ marginBottom: 'var(--space-3)' }}>
              <div className="mono"><strong>{r.kode}</strong> — {r.judul}</div>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {formatTanggal(r.tanggal)} · Status: {r.status} · Keputusan: {r.jumlahKeputusan} ({r.keputusanOpen} masih terbuka)
              </div>
              {r.keputusan.length > 0 && (
                <table className="krs-cetak__table" style={{ marginTop: 4 }}>
                  <thead><tr><th style={{ width: '5%' }}>No.</th><th>Keputusan</th><th style={{ width: '18%' }}>PIC</th><th style={{ width: '10%' }}>Target</th><th style={{ width: '12%' }}>Status</th></tr></thead>
                  <tbody>
                    {r.keputusan.map((k, i) => (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td style={{ fontSize: 'var(--text-sm)' }}>{k.deskripsi}</td>
                        <td style={{ fontSize: 'var(--text-sm)' }}>{k.pic ?? '—'}</td>
                        <td className="mono" style={{ fontSize: 'var(--text-sm)' }}>{k.targetSelesai ? formatTanggal(k.targetSelesai) : '—'}</td>
                        <td>{KEP_LABEL[k.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}

        {/* Survei kepuasan stakeholder */}
        <h3 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--text-strong)', paddingBottom: 4 }}>
          Lampiran: Survei Kepuasan Stakeholder
        </h3>
        {data.survei.items.length === 0 ? (
          <p className="muted">Belum ada survei kepuasan dijalankan.</p>
        ) : (
          <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
            <thead><tr><th>Kode</th><th>Judul</th><th>Kategori</th><th>Status</th><th className="num">Response</th></tr></thead>
            <tbody>
              {data.survei.items.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.kode}</td>
                  <td>{s.judul}</td>
                  <td>{s.kategori}</td>
                  <td>{s.status}</td>
                  <td className="num mono">{s.jumlahResponse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="krs-cetak__ttd">
          <div>
            <div>Mengetahui,</div>
            <div>Rektor / Wakil Rektor I</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Ketua LPM</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: '10px', marginTop: 'var(--space-4)', textAlign: 'center' }}>
          Dokumen ini dihasilkan dari SIAKAD Tazkia · {data.generatedAt.slice(0, 19).replace('T', ' ')}
        </div>
      </div>
    </div>
  );
}
