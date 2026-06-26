import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Login } from './routes/Login';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
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
import { MahasiswaSurat } from './routes/mahasiswa/Surat';
import { MahasiswaSuratCetak } from './routes/mahasiswa/SuratCetak';
import { ForumKelasList } from './routes/shared/ForumKelas';
import { ForumKelasDetail } from './routes/shared/ForumThreadList';
import { ForumThreadDetail } from './routes/shared/ForumThread';
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
import { AkademikLaporanHonorDosen } from './routes/akademik/LaporanHonorDosen';
import { LaporanHonorDosenCetak } from './routes/akademik/LaporanHonorDosenCetak';
import { AkademikInstitusi } from './routes/akademik/Institusi';
import { AkademikRuangan } from './routes/akademik/Ruangan';
import { AkademikPrestasi } from './routes/akademik/Prestasi';
import { AkademikSertifikasi } from './routes/akademik/Sertifikasi';
import { AkademikOversight } from './routes/akademik/Oversight';
import { AkademikVerifikasiPembayaran } from './routes/akademik/VerifikasiPembayaran';
import { AkademikRekonsiliasiBank } from './routes/akademik/RekonsiliasiBank';
import { AkademikTarifUkt } from './routes/akademik/TarifUkt';
import { AkademikPengumuman } from './routes/akademik/Pengumuman';
import { AkademikKalender } from './routes/akademik/Kalender';
import { KalenderShared } from './routes/shared/Kalender';
import { MahasiswaKonsultasi } from './routes/mahasiswa/Konsultasi';
import { DosenKonsultasi } from './routes/dosen/Konsultasi';
import { DosenKuisList } from './routes/dosen/Kuis';
import { DosenKuisKelas } from './routes/dosen/KuisKelas';
import { DosenKuisDetail } from './routes/dosen/KuisDetail';
import { MahasiswaKuis } from './routes/mahasiswa/Kuis';
import { MahasiswaKuisKerjakan } from './routes/mahasiswa/KuisKerjakan';
import { MahasiswaKuisHasil } from './routes/mahasiswa/KuisHasil';
import { MahasiswaTiket } from './routes/mahasiswa/Tiket';
import { MahasiswaHeregistrasi } from './routes/mahasiswa/Heregistrasi';
import { AdminHeregistrasi } from './routes/akademik/Heregistrasi';
import { AdminEws } from './routes/akademik/Ews';
import { DosenEws } from './routes/dosen/Ews';
import { AdminMahasiswaTranskripCetak } from './routes/akademik/MahasiswaTranskripCetak';
import { AdminMahasiswaKehadiranCetak } from './routes/akademik/MahasiswaKehadiranCetak';
import { AkademikTiket } from './routes/akademik/Tiket';
import { TiketDetailShared } from './routes/shared/TiketDetail';
import { MahasiswaSkpi } from './routes/mahasiswa/Skpi';
import { MahasiswaSkpiCetak } from './routes/mahasiswa/SkpiCetak';
import { AkademikSkpi } from './routes/akademik/Skpi';
import { MahasiswaMutasi } from './routes/mahasiswa/Mutasi';
import { AkademikMutasi } from './routes/akademik/Mutasi';
import { AkademikAkreditasi } from './routes/akademik/Akreditasi';
import { AkademikUsers } from './routes/akademik/Users';
import { GantiPassword } from './routes/GantiPassword';
import { DosenBimbinganDashboard } from './routes/dosen/BimbinganDashboard';
import { AkademikDokumen } from './routes/akademik/Dokumen';
import { DokumenShared } from './routes/shared/Dokumen';
import { AkademikFeeder } from './routes/akademik/Feeder';
import { DosenBkd } from './routes/dosen/Bkd';
import { DosenBkdDetail } from './routes/dosen/BkdDetail';
import { AkademikBkd } from './routes/akademik/Bkd';
import { AkademikBkdDetail } from './routes/akademik/BkdDetail';
import { AkademikWali } from './routes/akademik/Wali';
import { WaliDashboard } from './routes/wali/Dashboard';
import { WaliTranskrip } from './routes/wali/Transkrip';
import { MahasiswaAbsensiPin } from './routes/mahasiswa/AbsensiPin';
import { VerifikasiIjazah } from './routes/VerifikasiIjazah';
import { AkademikObe } from './routes/akademik/Obe';
import { LaporanObe } from './routes/akademik/LaporanObe';
import { DosenNilaiCpmk } from './routes/dosen/NilaiCpmk';
import { MahasiswaSertifikat } from './routes/mahasiswa/Sertifikat';
import { MahasiswaSertifikatCetak } from './routes/mahasiswa/SertifikatCetak';
import { AkademikSertifikat } from './routes/akademik/Sertifikat';
import { VerifikasiSertifikat } from './routes/VerifikasiSertifikat';
import { AkademikSpmi } from './routes/akademik/Spmi';
import { AkademikSpmiStandar } from './routes/akademik/SpmiStandar';
import { AkademikSpmiSurvei } from './routes/akademik/SpmiSurvei';
import { AkademikSpmiAmi } from './routes/akademik/SpmiAmi';
import { AkademikSpmiAmiDetail } from './routes/akademik/SpmiAmiDetail';
import { AkademikSpmiCapa } from './routes/akademik/SpmiCapa';
import { AkademikSpmiRtm } from './routes/akademik/SpmiRtm';
import { AkademikSpmiRtmDetail } from './routes/akademik/SpmiRtmDetail';
import { AkademikSpmiLaporan } from './routes/akademik/SpmiLaporan';
import { LaporanPencapaian } from './routes/akademik/LaporanPencapaian';
import { LaporanAmi } from './routes/akademik/LaporanAmi';
import { LaporanRtm } from './routes/akademik/LaporanRtm';
import { LaporanSurvei } from './routes/akademik/LaporanSurvei';
import { LaporanPpepp } from './routes/akademik/LaporanPpepp';
import { PublicSurvei } from './routes/Survei';
import { AdminKknPage } from './routes/akademik/Kkn';
import { AdminMbkmPage } from './routes/akademik/Mbkm';
import { AkademikEdom } from './routes/akademik/Edom';
import { AkademikEdomRekap } from './routes/akademik/EdomRekap';
import { AdminSkripsiPage } from './routes/akademik/Skripsi';
import { AdminPeriodeWisuda } from './routes/akademik/PeriodeWisuda';
import { AdminYudisiumPage } from './routes/akademik/Yudisium';
import { AdminBeasiswaPage } from './routes/akademik/Beasiswa';
import { AdminBeasiswaPendaftar } from './routes/akademik/BeasiswaPendaftar';
import { AdminSuratPage } from './routes/akademik/Surat';
import { AdminSuratCetak } from './routes/akademik/SuratCetak';
import { AdminMahasiswaPage } from './routes/akademik/Mahasiswa';
import { AdminDosenPage } from './routes/akademik/Dosen';
import { AdminSkalaNilai } from './routes/akademik/SkalaNilai';
import { AkmPage } from './routes/akademik/Akm';
import { AktivitasMhsPage } from './routes/akademik/AktivitasMhs';
import { DayaTampungPage } from './routes/akademik/DayaTampung';
import { KomponenEvaluasiPage } from './routes/dosen/KomponenEvaluasi';
import { AdminProdi } from './routes/akademik/Prodi';
import { AdminFakultas } from './routes/akademik/Fakultas';
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

  // Public verifikasi page: tampilkan langsung tanpa menunggu bootstrap auth.
  if (typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/verifikasi/') ||
    window.location.pathname.startsWith('/verifikasi-sertifikat/') ||
    window.location.pathname.startsWith('/survei/')
  )) {
    return (
      <Routes>
        <Route path="/verifikasi/:token" element={<VerifikasiIjazah />} />
        <Route path="/verifikasi-sertifikat/:token" element={<VerifikasiSertifikat />} />
        <Route path="/survei/:token" element={<PublicSurvei />} />
      </Routes>
    );
  }

  if (state.status === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Loader2 />
      </div>
    );
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <ScrollToTop />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/ganti-password" element={<GantiPassword />} />
      <Route path="/verifikasi/:token" element={<VerifikasiIjazah />} />
      <Route path="/verifikasi-sertifikat/:token" element={<VerifikasiSertifikat />} />
      <Route path="/survei/:token" element={<PublicSurvei />} />

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
        <Route path="absensi/pin"            element={<MahasiswaAbsensiPin />} />
        <Route path="absensi/cetak"          element={<MahasiswaAbsensiCetak />} />
        <Route path="pengumuman"             element={<MahasiswaPengumuman />} />
        <Route path="kalender"               element={<KalenderShared />} />
        <Route path="dokumen"                element={<DokumenShared />} />
        <Route path="konsultasi"             element={<MahasiswaKonsultasi />} />
        <Route path="kuis"                   element={<MahasiswaKuis />} />
        <Route path="kuis/:id/kerjakan"      element={<MahasiswaKuisKerjakan />} />
        <Route path="kuis/:id/hasil"         element={<MahasiswaKuisHasil />} />
        <Route path="tiket"                  element={<MahasiswaTiket />} />
        <Route path="heregistrasi"           element={<MahasiswaHeregistrasi />} />
        <Route path="tiket/:id"              element={<TiketDetailShared />} />
        <Route path="skpi"                   element={<MahasiswaSkpi />} />
        <Route path="skpi/cetak"             element={<MahasiswaSkpiCetak />} />
        <Route path="sertifikat"             element={<MahasiswaSertifikat />} />
        <Route path="sertifikat/:id/cetak"   element={<MahasiswaSertifikatCetak />} />
        <Route path="mutasi"                 element={<MahasiswaMutasi />} />
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
        <Route path="surat"              element={<MahasiswaSurat />} />
        <Route path="surat/:id/cetak"    element={<MahasiswaSuratCetak />} />
        <Route path="forum"                            element={<ForumKelasList />} />
        <Route path="forum/:kelasId"                   element={<ForumKelasDetail />} />
        <Route path="forum/:kelasId/:threadId"         element={<ForumThreadDetail />} />
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
        <Route path="nilai/:kelasId/cpmk" element={<DosenNilaiCpmk />} />
        <Route path="nilai/:kelasId/komponen-evaluasi" element={<KomponenEvaluasiPage />} />
        <Route path="absensi"                              element={<DosenAbsensiList />} />
        <Route path="absensi/:kelasId"                     element={<DosenAbsensiKelas />} />
        <Route path="absensi/:kelasId/:pertemuanId"        element={<DosenAbsensiPertemuan />} />
        <Route path="pengumuman"                           element={<DosenPengumuman />} />
        <Route path="kalender"                             element={<KalenderShared />} />
        <Route path="dokumen"                              element={<DokumenShared />} />
        <Route path="konsultasi"                           element={<DosenKonsultasi />} />
        <Route path="kuis"                                 element={<DosenKuisList />} />
        <Route path="kuis/:kelasId"                        element={<DosenKuisKelas />} />
        <Route path="kuis/:kelasId/:kuisId"                element={<DosenKuisDetail />} />
        <Route path="skripsi"                              element={<DosenSkripsi />} />
        <Route path="materi"                               element={<DosenMateriList />} />
        <Route path="materi/:kelasId"                      element={<DosenMateriKelas />} />
        <Route path="tugas"                                element={<DosenTugasList />} />
        <Route path="tugas/:kelasId"                       element={<DosenTugasKelas />} />
        <Route path="tugas/:kelasId/:tugasId"              element={<DosenTugasSubmission />} />
        <Route path="forum"                                element={<ForumKelasList />} />
        <Route path="forum/:kelasId"                       element={<ForumKelasDetail />} />
        <Route path="forum/:kelasId/:threadId"             element={<ForumThreadDetail />} />
        <Route path="bimbingan"             element={<DosenBimbingan />} />
        <Route path="bimbingan/dashboard"   element={<DosenBimbinganDashboard />} />
        <Route path="ews"                   element={<DosenEws />} />
        <Route path="bkd"                   element={<DosenBkd />} />
        <Route path="bkd/:id"               element={<DosenBkdDetail />} />
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
        <Route path="fakultas"      element={<AdminFakultas />} />
        <Route path="mata-kuliah"   element={<AdminMataKuliah />} />
        <Route path="kelas"         element={<AdminKelas />} />
        <Route path="periode"       element={<AdminPeriode />} />
        <Route path="krs"           element={<AdminValidasiKrsList />} />
        <Route path="krs/:mahasiswaId" element={<AdminValidasiKrsDetail />} />
        <Route path="keuangan"      element={<AdminKeuangan />} />
        <Route path="laporan"             element={<AkademikLaporan />} />
        <Route path="laporan/kehadiran"   element={<AkademikLaporanKehadiran />} />
        <Route path="laporan/honor-dosen"        element={<AkademikLaporanHonorDosen />} />
        <Route path="laporan/honor-dosen/cetak"  element={<LaporanHonorDosenCetak />} />
        <Route path="pengumuman"          element={<AkademikPengumuman />} />
        <Route path="kalender"            element={<AkademikKalender />} />
        <Route path="tiket"               element={<AkademikTiket />} />
        <Route path="tiket/:id"           element={<TiketDetailShared />} />
        <Route path="skpi"                element={<AkademikSkpi />} />
        <Route path="mutasi"              element={<AkademikMutasi />} />
        <Route path="akreditasi"          element={<AkademikAkreditasi />} />
        <Route path="users"               element={<AkademikUsers />} />
        <Route path="institusi"           element={<AkademikInstitusi />} />
        <Route path="ruangan"             element={<AkademikRuangan />} />
        <Route path="prestasi"            element={<AkademikPrestasi />} />
        <Route path="sertifikasi"         element={<AkademikSertifikasi />} />
        <Route path="oversight"           element={<AkademikOversight />} />
        <Route path="keuangan/verifikasi" element={<AkademikVerifikasiPembayaran />} />
        <Route path="keuangan/rekonsiliasi" element={<AkademikRekonsiliasiBank />} />
        <Route path="tarif-ukt"             element={<AkademikTarifUkt />} />
        <Route path="dokumen"             element={<AkademikDokumen />} />
        <Route path="feeder"              element={<AkademikFeeder />} />
        <Route path="akm"                 element={<AkmPage />} />
        <Route path="aktivitas-mahasiswa" element={<AktivitasMhsPage />} />
        <Route path="daya-tampung"        element={<DayaTampungPage />} />
        <Route path="bkd"                 element={<AkademikBkd />} />
        <Route path="bkd/:id"             element={<AkademikBkdDetail />} />
        <Route path="heregistrasi"        element={<AdminHeregistrasi />} />
        <Route path="ews"                 element={<AdminEws />} />
        <Route path="mahasiswa/:id/transkrip" element={<AdminMahasiswaTranskripCetak />} />
        <Route path="mahasiswa/:id/kehadiran" element={<AdminMahasiswaKehadiranCetak />} />
        <Route path="obe"                 element={<AkademikObe />} />
        <Route path="laporan/obe"         element={<LaporanObe />} />
        <Route path="sertifikat"          element={<AkademikSertifikat />} />
        <Route path="spmi"                element={<AkademikSpmi />} />
        <Route path="spmi/standar"        element={<AkademikSpmiStandar />} />
        <Route path="spmi/ami"            element={<AkademikSpmiAmi />} />
        <Route path="spmi/ami/:id"        element={<AkademikSpmiAmiDetail />} />
        <Route path="spmi/capa"           element={<AkademikSpmiCapa />} />
        <Route path="spmi/rtm"            element={<AkademikSpmiRtm />} />
        <Route path="spmi/rtm/:id"        element={<AkademikSpmiRtmDetail />} />
        <Route path="spmi/survei"         element={<AkademikSpmiSurvei />} />
        <Route path="spmi/laporan"             element={<AkademikSpmiLaporan />} />
        <Route path="spmi/laporan/pencapaian"  element={<LaporanPencapaian />} />
        <Route path="spmi/laporan/ppepp"       element={<LaporanPpepp />} />
        <Route path="spmi/laporan/ami/:id"     element={<LaporanAmi />} />
        <Route path="spmi/laporan/rtm/:id"     element={<LaporanRtm />} />
        <Route path="spmi/laporan/survei/:id"  element={<LaporanSurvei />} />
        <Route path="wali"                element={<AkademikWali />} />
        <Route path="kkn"                 element={<AdminKknPage />} />
        <Route path="mbkm"                element={<AdminMbkmPage />} />
        <Route path="edom"                element={<AkademikEdom />} />
        <Route path="edom/:id/rekap"      element={<AkademikEdomRekap />} />
        <Route path="skripsi"             element={<AdminSkripsiPage />} />
        <Route path="periode-wisuda"      element={<AdminPeriodeWisuda />} />
        <Route path="yudisium"            element={<AdminYudisiumPage />} />
        <Route path="beasiswa"            element={<AdminBeasiswaPage />} />
        <Route path="beasiswa/:id/pendaftar" element={<AdminBeasiswaPendaftar />} />
        <Route path="surat"               element={<AdminSuratPage />} />
        <Route path="surat/:id/cetak"     element={<AdminSuratCetak />} />
        <Route path="skala-nilai"         element={<AdminSkalaNilai />} />
        <Route path="audit"         element={<AdminAuditLog />} />
        <Route path="notifikasi"    element={<NotifikasiPage />} />
        <Route path="profil"        element={<AkademikProfil />} />
      </Route>

      {/* Wali */}
      <Route
        path="/wali"
        element={<ProtectedRoute role="wali"><AppShell role="wali" /></ProtectedRoute>}
      >
        <Route index element={<WaliDashboard />} />
        <Route path=":mahasiswaId/transkrip" element={<WaliTranskrip />} />
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
    </ConfirmProvider>
    </ToastProvider>
  );
}
