import { Router } from 'express';
import { requireAuth, requireRole, subRoleGate } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { profilRouter } from './profil.js';
import { dashboardRouter } from './dashboard.js';
import { laporanRouter } from './laporan.js';
import { mahasiswaRouter } from './mahasiswa.js';
import { dosenRouter } from './dosen.js';
import { kurikulumRouter } from './kurikulum.js';
import { periodeRouter } from './periode.js';
import { krsRouter } from './krs.js';
import { keuanganRouter } from './keuangan.js';
import { kknRouter } from './kkn.js';
import { mbkmRouter } from './mbkm.js';
import { edomRouter } from './edom.js';
import { skripsiRouter } from './skripsi.js';
import { yudisiumRouter } from './yudisium.js';
import { beasiswaRouter } from './beasiswa.js';
import { suratRouter } from './surat.js';
import { pengumumanRouter } from './pengumuman.js';
import { kalenderRouter } from './kalender.js';
import { tiketRouter } from './tiket.js';
import { skpiRouter } from './skpi.js';
import { mutasiRouter } from './mutasi.js';
import { akreditasiRouter } from './akreditasi.js';
import { usersRouter } from './users.js';
import { dokumenAdminRouter } from './dokumen.js';
import { feederRouter } from './feeder.js';
import { bkdAdminRouter } from './bkd.js';
import { waliAdminRouter } from './wali.js';
import { obeRouter } from './obe.js';
import { sertifikatAdminRouter } from './sertifikat.js';
import { spmiStandarRouter } from './spmi-standar.js';
import { spmiAmiRouter } from './spmi-ami.js';
import { spmiRtmRouter } from './spmi-rtm.js';
import { spmiSurveiRouter } from './spmi-survei.js';
import { spmiDashboardRouter } from './spmi-dashboard.js';
import { spmiLaporanRouter } from './spmi-laporan.js';
import { institusiAdminRouter } from './institusi.js';
import { prestasiAdminRouter } from './prestasi.js';
import { sertifikasiAdminRouter } from './sertifikasi.js';
import { oversightRouter } from './oversight.js';
import { kategoriUktRouter } from './kategori-ukt.js';
import { heregistrasiAdminRouter } from './heregistrasi.js';
import { ewsRouter } from './ews.js';
import { auditRouter } from './audit.js';
import { skalaNilaiRouter } from './skala-nilai.js';
import { akmRouter } from './akm.js';
import { aktivitasMhsRouter } from './aktivitas-mhs.js';
import { dayaTampungRouter } from './daya-tampung.js';
import { refRouter } from './ref.js';

export const akademikRouter = Router();

akademikRouter.use(requireAuth, requireRole('akademik'));
// rate-limit mutation untuk semua subroute akademik
akademikRouter.use((req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) return writeLimiter(req, res, next);
  next();
});
// ============================================================
// Routing per sub-role.
// super_admin selalu lolos (handled di middleware).
// Modul shared (profil, dashboard, kalender view, pengumuman view) tidak
// di-gate ekstra — semua sub-role bisa akses.
// ============================================================

// Shared — semua sub-role bisa lihat
akademikRouter.use(profilRouter);
akademikRouter.use(dashboardRouter);
akademikRouter.use(pengumumanRouter);
akademikRouter.use(kalenderRouter);
akademikRouter.use(tiketRouter);
akademikRouter.use(refRouter);

// Akademik core — administrasi mahasiswa, dosen, kurikulum, kelas.
// 'prodi' boleh akses modul yang punya scope filter (auto-filter
// per prodi-nya). subRoleGate = path-scoped supaya middleware tidak
// salah blok request untuk router lain di rantai berikutnya.
akademikRouter.use(subRoleGate(['/mahasiswa', '/pddikti'], 'akademik', 'prodi'), mahasiswaRouter);
akademikRouter.use(subRoleGate(['/dosen'], 'akademik', 'prodi'), dosenRouter);
akademikRouter.use(subRoleGate(['/fakultas', '/prodi', '/mata-kuliah', '/kelas', '/ruangan'], 'akademik', 'prodi'), kurikulumRouter);
akademikRouter.use(subRoleGate(['/periode'], 'akademik'), periodeRouter);
akademikRouter.use(subRoleGate(['/krs'], 'akademik'), krsRouter);
akademikRouter.use(subRoleGate(['/surat'], 'akademik'), suratRouter);
akademikRouter.use(subRoleGate(['/wali'], 'akademik'), waliAdminRouter);
akademikRouter.use(subRoleGate(['/mutasi'], 'akademik'), mutasiRouter);
akademikRouter.use(subRoleGate(['/skpi'], 'akademik'), skpiRouter);
akademikRouter.use(subRoleGate(['/skripsi'], 'akademik'), skripsiRouter);
akademikRouter.use(subRoleGate(['/yudisium', '/periode-wisuda'], 'akademik'), yudisiumRouter);
akademikRouter.use(subRoleGate(['/edom'], 'akademik'), edomRouter);
akademikRouter.use(subRoleGate(['/kkn'], 'akademik'), kknRouter);
akademikRouter.use(subRoleGate(['/mbkm'], 'akademik'), mbkmRouter);
akademikRouter.use(subRoleGate(['/bkd'], 'akademik'), bkdAdminRouter);
akademikRouter.use(subRoleGate(['/ews'], 'akademik'), ewsRouter);
akademikRouter.use(subRoleGate(['/prestasi'], 'akademik'), prestasiAdminRouter);
akademikRouter.use(subRoleGate(['/sertifikasi'], 'akademik'), sertifikasiAdminRouter);
akademikRouter.use(subRoleGate(['/feeder'], 'akademik'), feederRouter);
akademikRouter.use(subRoleGate(['/skala-nilai'], 'akademik'), skalaNilaiRouter);
akademikRouter.use(subRoleGate(['/laporan'], 'akademik'), laporanRouter);
// Phase 2 PDDikti
akademikRouter.use(subRoleGate(['/akm'], 'akademik', 'prodi'), akmRouter);
akademikRouter.use(subRoleGate(['/aktivitas-mahasiswa'], 'akademik'), aktivitasMhsRouter);
akademikRouter.use(subRoleGate(['/daya-tampung'], 'akademik', 'prodi'), dayaTampungRouter);

// Keuangan — tagihan, pembayaran, UKT, heregistrasi, beasiswa
akademikRouter.use(subRoleGate(['/keuangan'], 'keuangan'), keuanganRouter);
akademikRouter.use(subRoleGate(['/kategori-ukt'], 'keuangan'), kategoriUktRouter);
akademikRouter.use(subRoleGate(['/heregistrasi'], 'keuangan'), heregistrasiAdminRouter);
akademikRouter.use(subRoleGate(['/beasiswa'], 'keuangan'), beasiswaRouter);

// Prodi — akreditasi, OBE (akademik core juga bisa)
akademikRouter.use(subRoleGate(['/akreditasi'], 'akademik', 'prodi'), akreditasiRouter);
akademikRouter.use(subRoleGate(['/obe', '/cpl', '/cpmk'], 'akademik', 'prodi'), obeRouter);

// SPMI — penjaminan mutu (standar, AMI, RTM, survei)
akademikRouter.use(subRoleGate(['/spmi'], 'spmi'), spmiStandarRouter);
akademikRouter.use(subRoleGate(['/spmi'], 'spmi'), spmiAmiRouter);
akademikRouter.use(subRoleGate(['/spmi'], 'spmi'), spmiRtmRouter);
akademikRouter.use(subRoleGate(['/spmi'], 'spmi'), spmiSurveiRouter);
akademikRouter.use(subRoleGate(['/spmi'], 'spmi'), spmiDashboardRouter);
akademikRouter.use(subRoleGate(['/spmi'], 'spmi'), spmiLaporanRouter);

// Super admin only — manage akun, institusi, audit, dokumen, sertifikat,
// oversight. subRoleGate tanpa allowed → hanya super_admin yang lolos.
akademikRouter.use(subRoleGate(['/users']), usersRouter);
akademikRouter.use(subRoleGate(['/institusi']), institusiAdminRouter);
akademikRouter.use(subRoleGate(['/audit']), auditRouter);
akademikRouter.use(subRoleGate(['/konsultasi', '/penelitian', '/pengabdian']), oversightRouter);
akademikRouter.use(subRoleGate(['/dokumen']), dokumenAdminRouter);
akademikRouter.use(subRoleGate(['/sertifikat']), sertifikatAdminRouter);
