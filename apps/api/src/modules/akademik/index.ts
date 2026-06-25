import { Router } from 'express';
import { requireAuth, requireRole, requireAkademikSubRole } from '../../middleware/auth.js';
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

// Akademik core — administrasi mahasiswa, dosen, kurikulum, kelas
akademikRouter.use(requireAkademikSubRole('akademik'), mahasiswaRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), dosenRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), kurikulumRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), periodeRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), krsRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), suratRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), waliAdminRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), mutasiRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), skpiRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), skripsiRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), yudisiumRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), edomRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), kknRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), mbkmRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), bkdAdminRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), ewsRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), prestasiAdminRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), sertifikasiAdminRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), feederRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), skalaNilaiRouter);
akademikRouter.use(requireAkademikSubRole('akademik'), laporanRouter);

// Keuangan — tagihan, pembayaran, UKT, heregistrasi, beasiswa
akademikRouter.use(requireAkademikSubRole('keuangan'), keuanganRouter);
akademikRouter.use(requireAkademikSubRole('keuangan'), kategoriUktRouter);
akademikRouter.use(requireAkademikSubRole('keuangan'), heregistrasiAdminRouter);
akademikRouter.use(requireAkademikSubRole('keuangan'), beasiswaRouter);

// Prodi — akreditasi, OBE (akademik core juga bisa)
akademikRouter.use(requireAkademikSubRole('akademik', 'prodi'), akreditasiRouter);
akademikRouter.use(requireAkademikSubRole('akademik', 'prodi'), obeRouter);

// SPMI — penjaminan mutu (standar, AMI, RTM, survei)
akademikRouter.use(requireAkademikSubRole('spmi'), spmiStandarRouter);
akademikRouter.use(requireAkademikSubRole('spmi'), spmiAmiRouter);
akademikRouter.use(requireAkademikSubRole('spmi'), spmiRtmRouter);
akademikRouter.use(requireAkademikSubRole('spmi'), spmiSurveiRouter);
akademikRouter.use(requireAkademikSubRole('spmi'), spmiDashboardRouter);
akademikRouter.use(requireAkademikSubRole('spmi'), spmiLaporanRouter);

// Super admin only — manage akun, institusi, audit, dokumen, sertifikat,
// oversight. Pakai sub-role kosong supaya hanya super_admin yang lolos.
akademikRouter.use(requireAkademikSubRole(), usersRouter);
akademikRouter.use(requireAkademikSubRole(), institusiAdminRouter);
akademikRouter.use(requireAkademikSubRole(), auditRouter);
akademikRouter.use(requireAkademikSubRole(), oversightRouter);
akademikRouter.use(requireAkademikSubRole(), dokumenAdminRouter);
akademikRouter.use(requireAkademikSubRole(), sertifikatAdminRouter);
