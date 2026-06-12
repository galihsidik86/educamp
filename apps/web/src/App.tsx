import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Login } from './routes/Login';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MahasiswaDashboard } from './routes/mahasiswa/Dashboard';
import { MahasiswaKrs } from './routes/mahasiswa/Krs';
import { MahasiswaKrsRiwayat } from './routes/mahasiswa/KrsRiwayat';
import { MahasiswaKrsCetak } from './routes/mahasiswa/KrsCetak';
import { MahasiswaNilaiKhsCetak } from './routes/mahasiswa/NilaiKhsCetak';
import { MahasiswaNilaiTranskripCetak } from './routes/mahasiswa/NilaiTranskripCetak';
import { MahasiswaAbsensi } from './routes/mahasiswa/Absensi';
import { MahasiswaAbsensiCetak } from './routes/mahasiswa/AbsensiCetak';
import { MahasiswaPengumuman } from './routes/mahasiswa/Pengumuman';
import { MahasiswaKartu } from './routes/mahasiswa/KartuMahasiswa';
import { MahasiswaJadwal } from './routes/mahasiswa/Jadwal';
import { MahasiswaNilai } from './routes/mahasiswa/Nilai';
import { MahasiswaKeuangan } from './routes/mahasiswa/Keuangan';
import { MahasiswaPenelitian } from './routes/mahasiswa/Penelitian';
import { MahasiswaPengabdian } from './routes/mahasiswa/Pengabdian';
import { MahasiswaKkn } from './routes/mahasiswa/Kkn';
import { MahasiswaMbkm } from './routes/mahasiswa/Mbkm';
import { MahasiswaEdom } from './routes/mahasiswa/Edom';
import { MahasiswaEdomDetail } from './routes/mahasiswa/EdomDetail';
import { MahasiswaSkripsi } from './routes/mahasiswa/Skripsi';
import { MahasiswaYudisium } from './routes/mahasiswa/Yudisium';
import { MahasiswaYudisiumCetakSkl } from './routes/mahasiswa/YudisiumCetakSkl';
import { MahasiswaMateri } from './routes/mahasiswa/Materi';
import { MahasiswaMateriKelas } from './routes/mahasiswa/MateriKelas';
import { MahasiswaBeasiswa } from './routes/mahasiswa/Beasiswa';
import { MahasiswaTugas } from './routes/mahasiswa/Tugas';
import { MahasiswaTugasDetail } from './routes/mahasiswa/TugasDetail';
import { MahasiswaProfil } from './routes/mahasiswa/Profil';
import { DosenDashboard } from './routes/dosen/Dashboard';
import { DosenJadwal } from './routes/dosen/Jadwal';
import { DosenProfil } from './routes/dosen/Profil';
import { DosenInputNilaiList } from './routes/dosen/InputNilai';
import { DosenInputNilaiDetail } from './routes/dosen/InputNilaiDetail';
import { DosenPengumuman } from './routes/dosen/Pengumuman';
import { DosenSkripsi } from './routes/dosen/Skripsi';
import { DosenMateriList } from './routes/dosen/Materi';
import { DosenMateriKelas } from './routes/dosen/MateriKelas';
import { DosenTugasList } from './routes/dosen/Tugas';
import { DosenTugasKelas } from './routes/dosen/TugasKelas';
import { DosenTugasSubmission } from './routes/dosen/TugasSubmission';
import { DosenAbsensiList } from './routes/dosen/Absensi';
import { DosenAbsensiKelas } from './routes/dosen/AbsensiKelas';
import { DosenAbsensiPertemuan } from './routes/dosen/AbsensiPertemuan';
import { DosenBimbingan } from './routes/dosen/Bimbingan';
import { DosenBimbinganDetail } from './routes/dosen/BimbinganDetail';
import { DosenPenelitian } from './routes/dosen/Penelitian';
import { DosenPengabdian } from './routes/dosen/Pengabdian';
import { AkademikDashboard } from './routes/akademik/Dashboard';
import { AkademikProfil } from './routes/akademik/Profil';
import { AkademikLaporan } from './routes/akademik/Laporan';
import { AkademikLaporanKehadiran } from './routes/akademik/LaporanKehadiran';
import { AkademikPengumuman } from './routes/akademik/Pengumuman';
import { AdminKknPage } from './routes/akademik/Kkn';
import { AdminMbkmPage } from './routes/akademik/Mbkm';
import { AkademikEdom } from './routes/akademik/Edom';
import { AkademikEdomRekap } from './routes/akademik/EdomRekap';
import { AdminSkripsiPage } from './routes/akademik/Skripsi';
import { AdminPeriodeWisuda } from './routes/akademik/PeriodeWisuda';
import { AdminYudisiumPage } from './routes/akademik/Yudisium';
import { AdminBeasiswaPage } from './routes/akademik/Beasiswa';
import { AdminBeasiswaPendaftar } from './routes/akademik/BeasiswaPendaftar';
import { AdminMahasiswaPage } from './routes/akademik/Mahasiswa';
import { AdminDosenPage } from './routes/akademik/Dosen';
import { AdminProdi } from './routes/akademik/Prodi';
import { AdminMataKuliah } from './routes/akademik/MataKuliah';
import { AdminKelas } from './routes/akademik/Kelas';
import { AdminPeriode } from './routes/akademik/Periode';
import { AdminValidasiKrsList, AdminValidasiKrsDetail } from './routes/akademik/ValidasiKrs';
import { AdminKeuangan } from './routes/akademik/Keuangan';
import { AdminAuditLog } from './routes/akademik/AuditLog';
import { NotifikasiPage } from './routes/Notifikasi';
import { useAuth } from './lib/auth';
import { roleHomePath } from './lib/routing';

export function App() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Loader2 />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Mahasiswa */}
      <Route
        path="/mahasiswa"
        element={<ProtectedRoute role="mahasiswa"><AppShell role="mahasiswa" /></ProtectedRoute>}
      >
        <Route index element={<MahasiswaDashboard />} />
        <Route path="krs"            element={<MahasiswaKrs />} />
        <Route path="krs/riwayat"    element={<MahasiswaKrsRiwayat />} />
        <Route path="krs/cetak"      element={<MahasiswaKrsCetak />} />
        <Route path="jadwal"     element={<MahasiswaJadwal />} />
        <Route path="nilai"                  element={<MahasiswaNilai />} />
        <Route path="nilai/khs/cetak"        element={<MahasiswaNilaiKhsCetak />} />
        <Route path="nilai/transkrip/cetak"  element={<MahasiswaNilaiTranskripCetak />} />
        <Route path="absensi"                element={<MahasiswaAbsensi />} />
        <Route path="absensi/cetak"          element={<MahasiswaAbsensiCetak />} />
        <Route path="pengumuman"             element={<MahasiswaPengumuman />} />
        <Route path="keuangan"   element={<MahasiswaKeuangan />} />
        <Route path="penelitian" element={<MahasiswaPenelitian />} />
        <Route path="pengabdian" element={<MahasiswaPengabdian />} />
        <Route path="kkn"        element={<MahasiswaKkn />} />
        <Route path="mbkm"       element={<MahasiswaMbkm />} />
        <Route path="edom"             element={<MahasiswaEdom />} />
        <Route path="edom/:kelasId"    element={<MahasiswaEdomDetail />} />
        <Route path="skripsi"          element={<MahasiswaSkripsi />} />
        <Route path="yudisium"           element={<MahasiswaYudisium />} />
        <Route path="yudisium/:id/skl"   element={<MahasiswaYudisiumCetakSkl />} />
        <Route path="materi"             element={<MahasiswaMateri />} />
        <Route path="materi/:kelasId"    element={<MahasiswaMateriKelas />} />
        <Route path="beasiswa"           element={<MahasiswaBeasiswa />} />
        <Route path="tugas"              element={<MahasiswaTugas />} />
        <Route path="tugas/:id"          element={<MahasiswaTugasDetail />} />
        <Route path="notifikasi" element={<NotifikasiPage />} />
        <Route path="profil"             element={<MahasiswaProfil />} />
        <Route path="profil/kartu"       element={<MahasiswaKartu />} />
      </Route>

      {/* Dosen */}
      <Route
        path="/dosen"
        element={<ProtectedRoute role="dosen"><AppShell role="dosen" /></ProtectedRoute>}
      >
        <Route index element={<DosenDashboard />} />
        <Route path="jadwal"             element={<DosenJadwal />} />
        <Route path="nilai"              element={<DosenInputNilaiList />} />
        <Route path="nilai/:kelasId"     element={<DosenInputNilaiDetail />} />
        <Route path="absensi"                              element={<DosenAbsensiList />} />
        <Route path="absensi/:kelasId"                     element={<DosenAbsensiKelas />} />
        <Route path="absensi/:kelasId/:pertemuanId"        element={<DosenAbsensiPertemuan />} />
        <Route path="pengumuman"                           element={<DosenPengumuman />} />
        <Route path="skripsi"                              element={<DosenSkripsi />} />
        <Route path="materi"                               element={<DosenMateriList />} />
        <Route path="materi/:kelasId"                      element={<DosenMateriKelas />} />
        <Route path="tugas"                                element={<DosenTugasList />} />
        <Route path="tugas/:kelasId"                       element={<DosenTugasKelas />} />
        <Route path="tugas/:kelasId/:tugasId"              element={<DosenTugasSubmission />} />
        <Route path="bimbingan"          element={<DosenBimbingan />} />
        <Route path="bimbingan/:mahasiswaId" element={<DosenBimbinganDetail />} />
        <Route path="penelitian"         element={<DosenPenelitian />} />
        <Route path="pengabdian"         element={<DosenPengabdian />} />
        <Route path="notifikasi"         element={<NotifikasiPage />} />
        <Route path="profil"             element={<DosenProfil />} />
      </Route>

      {/* Akademik (Admin) */}
      <Route
        path="/akademik"
        element={<ProtectedRoute role="akademik"><AppShell role="akademik" /></ProtectedRoute>}
      >
        <Route index element={<AkademikDashboard />} />
        <Route path="mahasiswa"     element={<AdminMahasiswaPage />} />
        <Route path="dosen"         element={<AdminDosenPage />} />
        <Route path="prodi"         element={<AdminProdi />} />
        <Route path="mata-kuliah"   element={<AdminMataKuliah />} />
        <Route path="kelas"         element={<AdminKelas />} />
        <Route path="periode"       element={<AdminPeriode />} />
        <Route path="krs"           element={<AdminValidasiKrsList />} />
        <Route path="krs/:mahasiswaId" element={<AdminValidasiKrsDetail />} />
        <Route path="keuangan"      element={<AdminKeuangan />} />
        <Route path="laporan"             element={<AkademikLaporan />} />
        <Route path="laporan/kehadiran"   element={<AkademikLaporanKehadiran />} />
        <Route path="pengumuman"          element={<AkademikPengumuman />} />
        <Route path="kkn"                 element={<AdminKknPage />} />
        <Route path="mbkm"                element={<AdminMbkmPage />} />
        <Route path="edom"                element={<AkademikEdom />} />
        <Route path="edom/:id/rekap"      element={<AkademikEdomRekap />} />
        <Route path="skripsi"             element={<AdminSkripsiPage />} />
        <Route path="periode-wisuda"      element={<AdminPeriodeWisuda />} />
        <Route path="yudisium"            element={<AdminYudisiumPage />} />
        <Route path="beasiswa"            element={<AdminBeasiswaPage />} />
        <Route path="beasiswa/:id/pendaftar" element={<AdminBeasiswaPendaftar />} />
        <Route path="audit"         element={<AdminAuditLog />} />
        <Route path="notifikasi"    element={<NotifikasiPage />} />
        <Route path="profil"        element={<AkademikProfil />} />
      </Route>

      {/* Default */}
      <Route
        path="/"
        element={
          state.status === 'authenticated'
            ? <Navigate to={roleHomePath(state.user.role)} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
