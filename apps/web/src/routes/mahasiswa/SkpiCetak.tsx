import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/ds';
import { useSkpiData, type SkpiData } from '@/lib/queries-skpi';
import { formatTanggal } from '@/lib/format';

const LEVEL_LABEL: Record<string, { id: string; en: string }> = {
  internasional: { id: 'Internasional', en: 'International' },
  nasional: { id: 'Nasional', en: 'National' },
  regional: { id: 'Regional', en: 'Regional' },
  lokal: { id: 'Lokal', en: 'Local' },
  internal: { id: 'Internal', en: 'Internal' },
};

const JENIS_SERTIFIKAT_LABEL: Record<string, { id: string; en: string }> = {
  bahasa: { id: 'Bahasa', en: 'Language' },
  kompetensi: { id: 'Kompetensi', en: 'Competency' },
  pelatihan: { id: 'Pelatihan', en: 'Training' },
  lain: { id: 'Lain', en: 'Other' },
};

const JENIS_PRESTASI_LABEL: Record<string, { id: string; en: string }> = {
  lomba_akademik: { id: 'Lomba Akademik', en: 'Academic Competition' },
  lomba_non_akademik: { id: 'Lomba Non-Akademik', en: 'Non-academic Competition' },
  kepanitiaan: { id: 'Kepanitiaan', en: 'Event Committee' },
  organisasi: { id: 'Organisasi', en: 'Organisation' },
  publikasi: { id: 'Publikasi', en: 'Publication' },
  lain: { id: 'Lain', en: 'Other' },
};

const ASPEK_LABEL: Record<string, { id: string; en: string }> = {
  sikap:              { id: 'Sikap', en: 'Attitude' },
  pengetahuan:        { id: 'Pengetahuan', en: 'Knowledge' },
  ketrampilan_umum:   { id: 'Ketrampilan Umum', en: 'General Skills' },
  ketrampilan_khusus: { id: 'Ketrampilan Khusus', en: 'Specific Skills' },
};

const JENJANG_LABEL: Record<string, { id: string; en: string }> = {
  d3: { id: 'Diploma 3 (D3)', en: 'Associate Degree' },
  d4: { id: 'Diploma 4 (D4)', en: 'Applied Bachelor' },
  s1: { id: 'Sarjana (S1)', en: "Bachelor's Degree" },
  s2: { id: 'Magister (S2)', en: "Master's Degree" },
  s3: { id: 'Doktor (S3)', en: 'Doctoral Degree' },
  profesi: { id: 'Profesi', en: 'Professional Programme' },
};

export function MahasiswaSkpiCetak() {
  const navigate = useNavigate();
  const { data, isLoading } = useSkpiData();

  useEffect(() => {
    document.body.classList.add('print-mode');
    return () => { document.body.classList.remove('print-mode'); };
  }, []);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <p className="muted">Data tidak tersedia.</p>;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalEntries = data.sertifikasi.length + data.prestasi.length + data.penelitian.length + data.pengabdian.length + data.kkn.length + data.mbkm.length;
  const inst = data.institusi;
  const jenjang = data.kualifikasi.jenjang;

  return (
    <div className="krs-cetak">
      <div className="krs-cetak__toolbar no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mahasiswa/skpi')} leftIcon={<ArrowLeft size={14} />}>
          Kembali
        </Button>
        <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer size={14} />}>
          Cetak
        </Button>
      </div>

      <div className="krs-cetak__sheet">
        <header className="krs-cetak__head">
          <div className="krs-cetak__brand">
            <strong>{inst?.nama ?? 'Institut Agama Islam Tazkia'}</strong>
            <div>{data.mahasiswa.fakultas.nama}</div>
            <div>Program Studi {data.mahasiswa.prodi.nama}</div>
            {inst?.alamat && <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{inst.alamat}{inst.kota ? `, ${inst.kota}` : ''}</div>}
          </div>
          <h2 className="krs-cetak__title">
            SURAT KETERANGAN PENDAMPING IJAZAH<br />
            <span style={{ fontWeight: 400, fontSize: '0.85em' }}>Diploma Supplement</span>
          </h2>
          {inst?.akreditasiPT && (
            <div className="krs-cetak__subtitle" style={{ marginTop: 6 }}>
              Akreditasi Perguruan Tinggi: <strong>{inst.akreditasiPT}</strong>
              {inst.akreditasiSk && <> · {inst.akreditasiSk}</>}
            </div>
          )}
        </header>

        {totalEntries === 0 && (
          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)' }} className="muted">
            Belum ada data terverifikasi. SKPI akan terbit setelah minimal satu sertifikat/prestasi diverifikasi akademik.
          </p>
        )}

        {/* I. Identitas */}
        <section style={{ marginBottom: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
            I. INFORMASI PEMEGANG SKPI <span style={{ fontWeight: 400 }}>· Holder Information</span>
          </h3>
          <table className="krs-cetak__bio">
            <tbody>
              <tr><td>Nama / <em>Name</em></td><td>:</td><td colSpan={4}><strong>{data.mahasiswa.nama}</strong></td></tr>
              <tr><td>NIM / <em>Student ID</em></td><td>:</td><td className="mono" colSpan={4}>{data.mahasiswa.nim}</td></tr>
              <tr><td>Tempat, tgl lahir / <em>Place, Date of Birth</em></td><td>:</td><td colSpan={4}>
                {data.mahasiswa.tempatLahir ?? '—'}
                {data.mahasiswa.tanggalLahir && `, ${formatTanggal(data.mahasiswa.tanggalLahir)}`}
              </td></tr>
              <tr><td>Jenis kelamin / <em>Sex</em></td><td>:</td><td colSpan={4}>
                {data.mahasiswa.jenisKelamin === 'L' ? 'Laki-laki / Male' : 'Perempuan / Female'}
              </td></tr>
              <tr><td>Angkatan / <em>Year of Entry</em></td><td>:</td><td className="mono" colSpan={4}>{data.mahasiswa.angkatan}</td></tr>
            </tbody>
          </table>
        </section>

        {/* II. Kualifikasi */}
        <section style={{ marginBottom: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
            II. INFORMASI KUALIFIKASI <span style={{ fontWeight: 400 }}>· Qualification Information</span>
          </h3>
          <table className="krs-cetak__bio">
            <tbody>
              <tr><td>Program Studi / <em>Study Programme</em></td><td>:</td><td colSpan={4}>{data.mahasiswa.prodi.nama}</td></tr>
              <tr><td>Fakultas / <em>Faculty</em></td><td>:</td><td colSpan={4}>{data.mahasiswa.fakultas.nama}</td></tr>
              <tr><td>Jenjang / <em>Level of Qualification</em></td><td>:</td><td colSpan={4}>
                {JENJANG_LABEL[jenjang]?.id ?? jenjang.toUpperCase()} / <em>{JENJANG_LABEL[jenjang]?.en ?? jenjang.toUpperCase()}</em>
              </td></tr>
              {data.kualifikasi.kkniLevel != null && (
                <tr><td>KKNI / <em>IQF Level</em></td><td>:</td><td colSpan={4}><strong>Level {data.kualifikasi.kkniLevel}</strong></td></tr>
              )}
              <tr><td>IPK / <em>GPA</em></td><td>:</td><td className="mono" colSpan={4}><strong>{data.kualifikasi.ipk.toFixed(2)}</strong> / 4.00</td></tr>
              <tr><td>Total SKS / <em>Total Credits</em></td><td>:</td><td className="mono" colSpan={4}>{data.kualifikasi.totalSks}</td></tr>
            </tbody>
          </table>
        </section>

        {/* III. Capaian Pembelajaran */}
        {data.cpl.length > 0 && (
          <section style={{ marginBottom: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
              III. CAPAIAN PEMBELAJARAN LULUSAN <span style={{ fontWeight: 400 }}>· Programme Learning Outcomes</span>
            </h3>
            {(Object.keys(ASPEK_LABEL) as Array<keyof typeof ASPEK_LABEL>).map((aspek) => {
              const items = data.cpl.filter((c) => c.aspek === aspek);
              if (items.length === 0) return null;
              return (
                <div key={aspek} style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>
                    {ASPEK_LABEL[aspek].id} · <em>{ASPEK_LABEL[aspek].en}</em>
                  </div>
                  <ol style={{ marginTop: 0, paddingLeft: 'var(--space-4)' }}>
                    {items.map((c, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <strong className="mono">{c.kode}</strong> — {c.deskripsi}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        )}

        <SectionSertifikasi sertifikasi={data.sertifikasi} />
        <SectionPrestasi prestasi={data.prestasi} />
        <SectionRiset penelitian={data.penelitian} pengabdian={data.pengabdian} />
        <SectionMbkmKkn kkn={data.kkn} mbkm={data.mbkm} />

        {/* TTD */}
        <div className="krs-cetak__ttd">
          <div></div>
          <div style={{ textAlign: 'center' }}>
            <div>{inst?.kota ?? 'Bogor'}, {tanggalCetak}</div>
            <div>{inst?.rektorJabatan ?? 'Rektor'}</div>
            <div className="krs-cetak__sign" style={{ height: 60 }}></div>
            <div><strong>{inst?.rektorNama ?? '(...........................................)'}</strong></div>
            {inst?.rektorNip && <div className="mono" style={{ fontSize: 'var(--text-xs)' }}>NIP. {inst.rektorNip}</div>}
          </div>
        </div>

        <div className="muted" style={{ textAlign: 'center', fontSize: 'var(--text-xs)', marginTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-2)' }}>
          Dokumen ini diterbitkan oleh sistem akademik dan sah tanpa tanda tangan basah jika diverifikasi via portal resmi.
          <br />
          <em>This document is system-generated and valid without wet signature if verified via the official portal.</em>
        </div>
      </div>
    </div>
  );
}

function SectionSertifikasi({ sertifikasi }: { sertifikasi: SkpiData['sertifikasi'] }) {
  if (sertifikasi.length === 0) return null;
  return (
    <section style={{ marginBottom: 'var(--space-5)' }}>
      <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
        IV. SERTIFIKASI KOMPETENSI & BAHASA <span style={{ fontWeight: 400 }}>· Competency & Language Certificates</span>
      </h3>
      <table className="krs-cetak__bio" style={{ width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Nama / <em>Name</em></th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Penerbit / <em>Issuer</em></th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Jenis / Level</th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Skor / <em>Score</em></th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Tanggal / <em>Date</em></th>
          </tr>
        </thead>
        <tbody>
          {sertifikasi.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 'var(--space-2)' }}><strong>{s.nama}</strong></td>
              <td style={{ padding: 'var(--space-2)' }}>{s.penerbit}</td>
              <td style={{ padding: 'var(--space-2)' }}>
                {JENIS_SERTIFIKAT_LABEL[s.jenis]?.id ?? s.jenis}
                {s.level && ` · ${LEVEL_LABEL[s.level]?.id ?? s.level}`}
              </td>
              <td style={{ padding: 'var(--space-2)' }} className="mono">{s.skor ?? '—'}</td>
              <td style={{ padding: 'var(--space-2)' }} className="mono">{formatTanggal(s.tanggalTerbit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SectionPrestasi({ prestasi }: { prestasi: SkpiData['prestasi'] }) {
  if (prestasi.length === 0) return null;
  return (
    <section style={{ marginBottom: 'var(--space-5)' }}>
      <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
        V. PRESTASI & KEGIATAN NON-AKADEMIK <span style={{ fontWeight: 400 }}>· Achievements & Activities</span>
      </h3>
      <table className="krs-cetak__bio" style={{ width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Kegiatan / <em>Activity</em></th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Penyelenggara / <em>Organiser</em></th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Jenis / Level</th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Peran / <em>Role</em></th>
            <th style={{ textAlign: 'left', padding: 'var(--space-2)' }}>Tanggal / <em>Date</em></th>
          </tr>
        </thead>
        <tbody>
          {prestasi.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 'var(--space-2)' }}><strong>{p.nama}</strong></td>
              <td style={{ padding: 'var(--space-2)' }}>{p.penyelenggara ?? '—'}</td>
              <td style={{ padding: 'var(--space-2)' }}>
                {JENIS_PRESTASI_LABEL[p.jenis]?.id ?? p.jenis}
                {p.level && ` · ${LEVEL_LABEL[p.level]?.id ?? p.level}`}
              </td>
              <td style={{ padding: 'var(--space-2)' }}>{p.peran ?? '—'}</td>
              <td style={{ padding: 'var(--space-2)' }} className="mono">{formatTanggal(p.tanggal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SectionRiset({ penelitian, pengabdian }: { penelitian: SkpiData['penelitian']; pengabdian: SkpiData['pengabdian'] }) {
  if (penelitian.length === 0 && pengabdian.length === 0) return null;
  return (
    <section style={{ marginBottom: 'var(--space-5)' }}>
      <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
        VI. PENELITIAN & PENGABDIAN MASYARAKAT <span style={{ fontWeight: 400 }}>· Research & Community Service</span>
      </h3>
      {penelitian.length > 0 && (
        <>
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>Penelitian / <em>Research</em></div>
          <ul style={{ marginTop: 0, marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-4)' }}>
            {penelitian.map((p, i) => (
              <li key={i}>
                <strong>{p.judul}</strong> ({p.tahun})
                {p.peran && ` · ${p.peran}`}
                {p.sumberDana && ` · ${p.sumberDana}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {pengabdian.length > 0 && (
        <>
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>Pengabdian Masyarakat / <em>Community Service</em></div>
          <ul style={{ marginTop: 0, paddingLeft: 'var(--space-4)' }}>
            {pengabdian.map((p, i) => (
              <li key={i}>
                <strong>{p.judul}</strong> ({p.tahun})
                {p.lokasi && ` · ${p.lokasi}`}
                {p.peran && ` · ${p.peran}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SectionMbkmKkn({ kkn, mbkm }: { kkn: SkpiData['kkn']; mbkm: SkpiData['mbkm'] }) {
  if (kkn.length === 0 && mbkm.length === 0) return null;
  return (
    <section style={{ marginBottom: 'var(--space-5)' }}>
      <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
        VII. PENGALAMAN LAPANGAN (KKN & MBKM) <span style={{ fontWeight: 400 }}>· Field Experience</span>
      </h3>
      {mbkm.length > 0 && (
        <>
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>MBKM <em>(Independent Learning)</em></div>
          <ul style={{ marginTop: 0, marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-4)' }}>
            {mbkm.map((m, i) => (
              <li key={i}>
                <strong>{m.namaProgram}</strong> · {m.mitra}
                {m.tanggalMulai && ` (${formatTanggal(m.tanggalMulai)}${m.tanggalSelesai ? ` – ${formatTanggal(m.tanggalSelesai)}` : ''})`}
                {m.totalSks > 0 && ` · ${m.totalSks} SKS dikonversi`}
              </li>
            ))}
          </ul>
        </>
      )}
      {kkn.length > 0 && (
        <>
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>KKN <em>(Community Field Programme)</em></div>
          <ul style={{ marginTop: 0, paddingLeft: 'var(--space-4)' }}>
            {kkn.map((k, i) => (
              <li key={i}>
                <strong>{k.lokasi}</strong> · Periode {k.periode}
                {k.nilai && ` · Nilai: ${k.nilai}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
