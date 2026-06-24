import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Map slug path-segment → label Bahasa Indonesia.
 * Segmen dinamis (UUID, NIM, dll) auto-skip — di-render sebagai '…'
 * atau di-omit dengan flag DROP_DYNAMIC.
 */
const LABEL: Record<string, string> = {
  // Role home
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  akademik: 'Akademik',
  wali: 'Wali',
  // Perkuliahan
  krs: 'KRS',
  riwayat: 'Riwayat',
  cetak: 'Cetak',
  jadwal: 'Jadwal Kuliah',
  absensi: 'Presensi',
  pin: 'Self Check-In',
  materi: 'Materi',
  tugas: 'Pengumpulan',
  kuis: 'Kuis',
  forum: 'Forum',
  nilai: 'Nilai',
  cpmk: 'CPMK',
  pertemuan: 'Pertemuan',
  bimbingan: 'Bimbingan',
  dashboard: 'Dashboard',
  // Layanan
  keuangan: 'Keuangan',
  beasiswa: 'Beasiswa',
  surat: 'Surat Keterangan',
  konsultasi: 'Konsultasi DPA',
  tiket: 'Tiket Bantuan',
  skpi: 'SKPI',
  sertifikat: 'Sertifikat',
  mutasi: 'Mutasi',
  heregistrasi: 'Heregistrasi',
  pendaftar: 'Pendaftar',
  // Tri dharma
  penelitian: 'Penelitian',
  pengabdian: 'Pengabdian',
  kkn: 'KKN',
  mbkm: 'MBKM',
  // Tahap akhir
  edom: 'EDOM',
  skripsi: 'Skripsi',
  yudisium: 'Wisuda & Yudisium',
  // Info
  pengumuman: 'Pengumuman',
  kalender: 'Kalender Akademik',
  dokumen: 'Pusat Dokumen',
  notifikasi: 'Notifikasi',
  profil: 'Profil',
  // Akademik staff
  mahasiswadata: 'Data Mahasiswa',
  prodi: 'Program Studi',
  matakuliah: 'Mata Kuliah',
  kurikulum: 'Kurikulum',
  ruangan: 'Ruangan',
  semester: 'Semester',
  kelas: 'Kelas',
  laporan: 'Laporan',
  kehadiran: 'Kehadiran',
  ews: 'Early Warning',
  audit: 'Audit Log',
  institusi: 'Profil Institusi',
  // Dosen
  bkd: 'Beban Kerja',
  // Misc
  ews_dosen: 'Peringatan Dini',
};

/** Cek apakah segment ini ID dinamis (UUID/NIM/numerik). */
function isDynamic(seg: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg)) return true; // UUID
  if (/^\d{6,}$/.test(seg)) return true; // NIM/NIDN/long number
  return false;
}

function humanize(seg: string): string {
  return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Sembunyikan kalau cuma 1 level (root role page seperti /mahasiswa)
  if (segments.length <= 1) return null;
  // Sembunyikan untuk halaman cetak / login / verifikasi
  if (segments.includes('cetak')) return null;

  const crumbs: Array<{ to: string; label: string; isLast: boolean }> = [];
  let acc = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    acc += '/' + seg;
    if (isDynamic(seg)) continue; // skip ID dinamis
    const label = LABEL[seg] ?? humanize(seg);
    crumbs.push({ to: acc, label, isLast: i === segments.length - 1 });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to={`/${segments[0]}`} className="breadcrumb__home" aria-label="Beranda">
        <Home size={14} />
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.to} className="breadcrumb__item">
          <ChevronRight size={12} className="breadcrumb__sep" />
          {c.isLast || i === crumbs.length - 1 ? (
            <span className="breadcrumb__current" aria-current="page">{c.label}</span>
          ) : (
            <Link to={c.to} className="breadcrumb__link">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
