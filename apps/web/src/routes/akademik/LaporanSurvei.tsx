import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useSurveiDetail, useSurveiHasil } from '@/lib/queries-spmi';
import { KopInstitusi } from '@/components/KopInstitusi';

const KATEGORI_LABEL: Record<string, string> = {
  layanan_akademik: 'Layanan Akademik',
  layanan_keuangan: 'Layanan Keuangan',
  layanan_sarpras: 'Sarana Prasarana',
  layanan_perpustakaan: 'Perpustakaan',
  layanan_kemahasiswaan: 'Kemahasiswaan',
  dosen_pembimbing: 'Dosen Pembimbing',
  lulusan: 'Lulusan/Alumni',
  pengguna_lulusan: 'Pengguna Lulusan',
  lain: 'Lain',
};

export function LaporanSurvei() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: survei, isLoading: lSur } = useSurveiDetail(id);
  const { data: hasil, isLoading: lHas } = useSurveiHasil(id);

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (lSur || lHas) return <p className="muted">Memuat…</p>;
  if (!survei || !hasil) return <p className="muted">Data survei tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Indeks Kepuasan Masyarakat (IKM) — rata-rata Likert dikonversi ke skala 100
  const likertResults = hasil.hasil.filter((h) => h.jenis === 'likert' && h.n > 0);
  const overallLikert = likertResults.length > 0
    ? likertResults.reduce((s, h) => s + (h.rataRata ?? 0), 0) / likertResults.length
    : 0;
  const indexKepuasan = (overallLikert / 5) * 100;

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/akademik/spmi/laporan')} leftIcon={<ArrowLeft size={14} />}>Kembali</Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>Cetak</Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <KopInstitusi subtitle="Sistem Penjaminan Mutu Internal" />
          <h2 className="krs-cetak__title">LAPORAN HASIL SURVEI KEPUASAN</h2>
          <div className="krs-cetak__subtitle">No. {survei.kode}</div>
        </header>

        <table className="krs-cetak__bio">
          <tbody>
            <tr><td>Kode Survei</td><td>:</td><td className="mono"><strong>{survei.kode}</strong></td><td>Status</td><td>:</td><td>{survei.status}</td></tr>
            <tr><td>Judul</td><td>:</td><td colSpan={4}><strong>{survei.judul}</strong></td></tr>
            <tr><td>Kategori</td><td>:</td><td>{KATEGORI_LABEL[survei.kategori] ?? survei.kategori}</td><td>Target Responden</td><td>:</td><td>{survei.target}</td></tr>
            <tr><td>Periode</td><td>:</td><td>{survei.periode ?? '—'}</td><td>Tanggal Cetak</td><td>:</td><td>{tanggalCetak}</td></tr>
          </tbody>
        </table>

        {survei.deskripsi && (
          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-2)', border: '1px solid var(--text-strong)' }}>
            <strong>Deskripsi:</strong> {survei.deskripsi}
          </div>
        )}

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ringkasan</h3>
        <table className="krs-cetak__table" style={{ marginBottom: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th>Indikator</th>
              <th className="num">Total Responden</th>
              <th className="num">Rata-rata Likert</th>
              <th className="num">Indeks Kepuasan (skala 100)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hasil agregat</td>
              <td className="num mono">{hasil.totalResponse}</td>
              <td className="num mono">{overallLikert.toFixed(2)} / 5</td>
              <td className="num mono"><strong>{indexKepuasan.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasil per Pertanyaan</h3>

        {hasil.hasil.map((h) => (
          <div key={h.pertanyaanId} style={{ border: '1px solid var(--text-strong)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <strong>{h.urutan}. {h.pertanyaan}</strong>
              <div className="muted" style={{ fontSize: '10px' }}>Jenis: {h.jenis} · {h.n} responden menjawab</div>
            </div>

            {h.jenis === 'likert' && (
              <>
                <div className="row" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                  <div><strong>Rata-rata:</strong> <span className="mono">{h.rataRata?.toFixed(2)} / 5</span></div>
                  <div><strong>Indeks (skala 100):</strong> <span className="mono">{(((h.rataRata ?? 0) / 5) * 100).toFixed(2)}</span></div>
                </div>
                <table className="krs-cetak__table">
                  <thead>
                    <tr>
                      <th>Skala</th>
                      <th className="num">1 (Sangat Kurang)</th>
                      <th className="num">2 (Kurang)</th>
                      <th className="num">3 (Cukup)</th>
                      <th className="num">4 (Baik)</th>
                      <th className="num">5 (Sangat Baik)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Frekuensi</td>
                      <td className="num mono">{h.distribusi?.['1'] ?? 0}</td>
                      <td className="num mono">{h.distribusi?.['2'] ?? 0}</td>
                      <td className="num mono">{h.distribusi?.['3'] ?? 0}</td>
                      <td className="num mono">{h.distribusi?.['4'] ?? 0}</td>
                      <td className="num mono">{h.distribusi?.['5'] ?? 0}</td>
                    </tr>
                    <tr>
                      <td>Persentase</td>
                      <td className="num mono">{persen(h.distribusi?.['1'], h.n)}</td>
                      <td className="num mono">{persen(h.distribusi?.['2'], h.n)}</td>
                      <td className="num mono">{persen(h.distribusi?.['3'], h.n)}</td>
                      <td className="num mono">{persen(h.distribusi?.['4'], h.n)}</td>
                      <td className="num mono">{persen(h.distribusi?.['5'], h.n)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {h.jenis === 'pilihan' && h.distribusi && (
              <table className="krs-cetak__table">
                <thead><tr><th>Pilihan</th><th className="num">Frekuensi</th><th className="num">Persentase</th></tr></thead>
                <tbody>
                  {Object.entries(h.distribusi).map(([opt, count]) => (
                    <tr key={opt}>
                      <td>{opt}</td>
                      <td className="num mono">{count}</td>
                      <td className="num mono">{persen(count, h.n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {h.jenis === 'open' && h.sample && h.sample.length > 0 && (
              <div>
                <div className="muted" style={{ fontSize: '10px', marginBottom: 4 }}>Contoh jawaban ({h.sample.length}):</div>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--text-sm)' }}>
                  {h.sample.slice(0, 10).map((teks, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>"{teks}"</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}

        <div className="krs-cetak__ttd">
          <div>
            <div>Mengetahui,</div>
            <div>Ketua LPM / Kepala SPMI</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
          <div>
            <div>Bogor, {tanggalCetak}</div>
            <div>Disiapkan oleh,</div>
            <div className="krs-cetak__sign" />
            <div><strong>(...........................................)</strong></div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: '10px', marginTop: 'var(--space-4)', textAlign: 'center' }}>
          Dokumen ini dihasilkan dari SIAKAD Tazkia · {new Date().toISOString().slice(0, 19).replace('T', ' ')}
        </div>
      </div>
    </div>
  );
}

function persen(n: number | undefined, total: number): string {
  if (!n || total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}
