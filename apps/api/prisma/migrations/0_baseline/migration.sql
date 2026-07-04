-- CreateTable
CREATE TABLE `Absensi` (
    `id` VARCHAR(191) NOT NULL,
    `pertemuanId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `status` ENUM('hadir', 'izin', 'sakit', 'alpa') NOT NULL DEFAULT 'alpa',
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `inputIp` VARCHAR(191) NULL,
    `inputPada` DATETIME(3) NULL,
    `inputUserAgent` VARCHAR(191) NULL,
    `inputViaPin` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Absensi_mahasiswaId_idx`(`mahasiswaId` ASC),
    UNIQUE INDEX `Absensi_pertemuanId_mahasiswaId_key`(`pertemuanId` ASC, `mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Akademik` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nip` VARCHAR(191) NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jabatan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Akademik_nip_key`(`nip` ASC),
    UNIQUE INDEX `Akademik_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorRole` VARCHAR(191) NULL,
    `actorName` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_action_idx`(`action` ASC),
    INDEX `AuditLog_actorId_idx`(`actorId` ASC),
    INDEX `AuditLog_createdAt_idx`(`createdAt` ASC),
    INDEX `AuditLog_entity_entityId_idx`(`entity` ASC, `entityId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditMutuInternal` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `status` ENUM('perencanaan', 'pelaksanaan', 'selesai', 'ditangguhkan') NOT NULL DEFAULT 'perencanaan',
    `ruangLingkup` TEXT NULL,
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `dampakAkreditasi` TEXT NULL,
    `dilaporkanKeSpme` BOOLEAN NOT NULL DEFAULT false,
    `dilaporkanKeSpmePada` DATETIME(3) NULL,

    UNIQUE INDEX `AuditMutuInternal_kode_key`(`kode` ASC),
    INDEX `AuditMutuInternal_periode_idx`(`periode` ASC),
    INDEX `AuditMutuInternal_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditorAmi` (
    `id` VARCHAR(191) NOT NULL,
    `amiId` VARCHAR(191) NOT NULL,
    `dosenId` VARCHAR(191) NOT NULL,
    `peran` VARCHAR(191) NOT NULL DEFAULT 'auditor',

    UNIQUE INDEX `AuditorAmi_amiId_dosenId_key`(`amiId` ASC, `dosenId` ASC),
    INDEX `AuditorAmi_dosenId_idx`(`dosenId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BahanAjar` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `pertemuanId` VARCHAR(191) NULL,
    `jenis` ENUM('link', 'file', 'text', 'video') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `url` TEXT NULL,
    `konten` TEXT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BahanAjar_kelasId_idx`(`kelasId` ASC),
    INDEX `BahanAjar_pertemuanId_idx`(`pertemuanId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Beasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `penyelenggara` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `kuota` INTEGER NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `syaratIpk` DOUBLE NULL,
    `syaratAngkatanMin` INTEGER NULL,
    `syaratAngkatanMax` INTEGER NULL,
    `pendaftaranBuka` BOOLEAN NOT NULL DEFAULT true,
    `tanggalBuka` DATETIME(3) NULL,
    `tanggalTutup` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `persentase` DOUBLE NULL,
    `potongUkt` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Beasiswa_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BkdItem` (
    `id` VARCHAR(191) NOT NULL,
    `laporanId` VARCHAR(191) NOT NULL,
    `kategori` ENUM('pengajaran', 'penelitian', 'pengabdian', 'penunjang') NOT NULL,
    `jenis` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `bobotSks` DOUBLE NOT NULL,
    `sumberEntity` VARCHAR(191) NULL,
    `sumberId` VARCHAR(191) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BkdItem_kategori_idx`(`kategori` ASC),
    INDEX `BkdItem_laporanId_idx`(`laporanId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BkdLaporan` (
    `id` VARCHAR(191) NOT NULL,
    `dosenId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'diajukan', 'disetujui', 'ditolak') NOT NULL DEFAULT 'draft',
    `totalSks` DOUBLE NOT NULL DEFAULT 0,
    `catatanDosen` TEXT NULL,
    `catatanAkademik` TEXT NULL,
    `diverifikasiOleh` VARCHAR(191) NULL,
    `diverifikasiPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BkdLaporan_dosenId_semesterId_key`(`dosenId` ASC, `semesterId` ASC),
    INDEX `BkdLaporan_semesterId_fkey`(`semesterId` ASC),
    INDEX `BkdLaporan_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cpl` (
    `id` VARCHAR(191) NOT NULL,
    `prodiId` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `aspek` ENUM('sikap', 'pengetahuan', 'ketrampilan_umum', 'ketrampilan_khusus') NOT NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cpl_aspek_idx`(`aspek` ASC),
    UNIQUE INDEX `Cpl_prodiId_kode_key`(`prodiId` ASC, `kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cpmk` (
    `id` VARCHAR(191) NOT NULL,
    `mataKuliahId` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `bobotPenilaian` DOUBLE NOT NULL DEFAULT 1,
    `ambangTercapai` DOUBLE NOT NULL DEFAULT 56,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Cpmk_mataKuliahId_kode_key`(`mataKuliahId` ASC, `kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CpmkCpl` (
    `cpmkId` VARCHAR(191) NOT NULL,
    `cplId` VARCHAR(191) NOT NULL,
    `bobot` DOUBLE NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CpmkCpl_cplId_idx`(`cplId` ASC),
    PRIMARY KEY (`cpmkId` ASC, `cplId` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dokumen` (
    `id` VARCHAR(191) NOT NULL,
    `kategoriId` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `versi` VARCHAR(191) NULL,
    `target` VARCHAR(191) NOT NULL DEFAULT 'all',
    `fileUrl` TEXT NOT NULL,
    `jenisFile` VARCHAR(191) NULL,
    `ukuranByte` INTEGER NULL,
    `tanggalBerlaku` DATETIME(3) NULL,
    `tanggalKedaluwarsa` DATETIME(3) NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Dokumen_isAktif_idx`(`isAktif` ASC),
    INDEX `Dokumen_kategoriId_idx`(`kategoriId` ASC),
    INDEX `Dokumen_target_idx`(`target` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DokumenAkses` (
    `id` VARCHAR(191) NOT NULL,
    `dokumenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `aksi` ENUM('view', 'download') NOT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DokumenAkses_dokumenId_createdAt_idx`(`dokumenId` ASC, `createdAt` ASC),
    INDEX `DokumenAkses_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dosen` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nidn` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `gelarDepan` VARCHAR(191) NULL,
    `gelarBelakang` VARCHAR(191) NULL,
    `prodiId` VARCHAR(191) NOT NULL,
    `jabatanFungsional` ENUM('asisten_ahli', 'lektor', 'lektor_kepala', 'guru_besar', 'tenaga_pengajar') NULL,
    `jabatanStruktural` VARCHAR(191) NULL,
    `isDpa` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Dosen_feederId_key`(`feederId` ASC),
    UNIQUE INDEX `Dosen_nidn_key`(`nidn` ASC),
    INDEX `Dosen_prodiId_idx`(`prodiId` ASC),
    UNIQUE INDEX `Dosen_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EdomAspek` (
    `id` VARCHAR(191) NOT NULL,
    `kuesionerId` VARCHAR(191) NOT NULL,
    `urutan` INTEGER NOT NULL,
    `pertanyaan` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EdomAspek_kuesionerId_urutan_key`(`kuesionerId` ASC, `urutan` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EdomJawaban` (
    `id` VARCHAR(191) NOT NULL,
    `responseId` VARCHAR(191) NOT NULL,
    `aspekId` VARCHAR(191) NOT NULL,
    `nilai` INTEGER NOT NULL,

    INDEX `EdomJawaban_aspekId_fkey`(`aspekId` ASC),
    UNIQUE INDEX `EdomJawaban_responseId_aspekId_key`(`responseId` ASC, `aspekId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EdomKuesioner` (
    `id` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EdomKuesioner_isAktif_idx`(`isAktif` ASC),
    INDEX `EdomKuesioner_semesterId_idx`(`semesterId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EdomResponse` (
    `id` VARCHAR(191) NOT NULL,
    `kuesionerId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EdomResponse_kelasId_idx`(`kelasId` ASC),
    UNIQUE INDEX `EdomResponse_kuesionerId_mahasiswaId_kelasId_key`(`kuesionerId` ASC, `mahasiswaId` ASC, `kelasId` ASC),
    INDEX `EdomResponse_mahasiswaId_fkey`(`mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fakultas` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Fakultas_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeederConfig` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `baseUrl` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `passwordEnc` VARCHAR(191) NULL,
    `semesterAktif` VARCHAR(191) NULL,
    `dryRun` BOOLEAN NOT NULL DEFAULT true,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `lastTestAt` DATETIME(3) NULL,
    `lastTestStatus` VARCHAR(191) NULL,
    `lastTestMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeederQueue` (
    `id` VARCHAR(191) NOT NULL,
    `entity` ENUM('mahasiswa', 'dosen', 'mata_kuliah', 'kelas', 'krs', 'nilai', 'aktivitas') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `operation` ENUM('create', 'update', 'delete') NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('pending', 'processing', 'success', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `lastError` TEXT NULL,
    `nextRetryAt` DATETIME(3) NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeederQueue_entity_entityId_idx`(`entity` ASC, `entityId` ASC),
    INDEX `FeederQueue_status_nextRetryAt_idx`(`status` ASC, `nextRetryAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeederSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `entity` ENUM('mahasiswa', 'dosen', 'mata_kuliah', 'kelas', 'krs', 'nilai', 'aktivitas') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `operation` ENUM('create', 'update', 'delete') NOT NULL,
    `status` ENUM('pending', 'processing', 'success', 'failed', 'skipped') NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `durationMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeederSyncLog_createdAt_idx`(`createdAt` ASC),
    INDEX `FeederSyncLog_entity_entityId_idx`(`entity` ASC, `entityId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ForumReply` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `authorMahasiswaId` VARCHAR(191) NULL,
    `authorDosenId` VARCHAR(191) NULL,
    `isi` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ForumReply_authorDosenId_fkey`(`authorDosenId` ASC),
    INDEX `ForumReply_authorMahasiswaId_fkey`(`authorMahasiswaId` ASC),
    INDEX `ForumReply_threadId_idx`(`threadId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ForumThread` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `authorMahasiswaId` VARCHAR(191) NULL,
    `authorDosenId` VARCHAR(191) NULL,
    `judul` VARCHAR(191) NOT NULL,
    `isi` TEXT NOT NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ForumThread_authorDosenId_fkey`(`authorDosenId` ASC),
    INDEX `ForumThread_authorMahasiswaId_fkey`(`authorMahasiswaId` ASC),
    INDEX `ForumThread_isPinned_idx`(`isPinned` ASC),
    INDEX `ForumThread_kelasId_idx`(`kelasId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Heregistrasi` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('aktif', 'cuti') NOT NULL,
    `alasan` TEXT NULL,
    `dokumenUrl` TEXT NULL,
    `status` ENUM('diajukan', 'disetujui', 'ditolak') NOT NULL DEFAULT 'diajukan',
    `catatanAkademik` TEXT NULL,
    `diverifikasiOleh` VARCHAR(191) NULL,
    `diverifikasiPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Heregistrasi_mahasiswaId_semesterId_key`(`mahasiswaId` ASC, `semesterId` ASC),
    INDEX `Heregistrasi_semesterId_idx`(`semesterId` ASC),
    INDEX `Heregistrasi_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstitusiConfig` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `nama` VARCHAR(191) NOT NULL,
    `namaPendek` VARCHAR(191) NULL,
    `tagline` VARCHAR(191) NULL,
    `akreditasiPT` VARCHAR(191) NULL,
    `akreditasiSk` VARCHAR(191) NULL,
    `alamat` TEXT NULL,
    `kota` VARCHAR(191) NULL,
    `kodePos` VARCHAR(191) NULL,
    `telepon` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logoUrl` TEXT NULL,
    `logoInverseUrl` TEXT NULL,
    `rektorNama` VARCHAR(191) NULL,
    `rektorNip` VARCHAR(191) NULL,
    `rektorJabatan` VARCHAR(191) NULL DEFAULT 'Rektor',
    `bagianAkademikNama` VARCHAR(191) NULL DEFAULT 'Bagian Akademik (BAAK)',
    `kepalaBaakNama` VARCHAR(191) NULL,
    `kopSurat` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JawabanKepuasan` (
    `id` VARCHAR(191) NOT NULL,
    `responseId` VARCHAR(191) NOT NULL,
    `pertanyaanId` VARCHAR(191) NOT NULL,
    `nilai` INTEGER NULL,
    `pilihan` VARCHAR(191) NULL,
    `teks` TEXT NULL,

    INDEX `JawabanKepuasan_pertanyaanId_idx`(`pertanyaanId` ASC),
    UNIQUE INDEX `JawabanKepuasan_responseId_pertanyaanId_key`(`responseId` ASC, `pertanyaanId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KalenderAkademik` (
    `id` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `jenis` ENUM('ujian', 'libur', 'registrasi', 'wisuda', 'akademik', 'lain') NOT NULL DEFAULT 'akademik',
    `tanggalMulai` DATETIME(3) NOT NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `target` VARCHAR(191) NOT NULL DEFAULT 'all',
    `warna` VARCHAR(191) NULL,
    `semesterId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KalenderAkademik_semesterId_idx`(`semesterId` ASC),
    INDEX `KalenderAkademik_tanggalMulai_idx`(`tanggalMulai` ASC),
    INDEX `KalenderAkademik_target_idx`(`target` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KategoriDokumen` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KategoriDokumen_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KategoriUkt` (
    `id` VARCHAR(191) NOT NULL,
    `prodiId` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nominalSemester` DECIMAL(15, 2) NOT NULL,
    `deskripsi` TEXT NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KategoriUkt_prodiId_idx`(`prodiId` ASC),
    UNIQUE INDEX `KategoriUkt_prodiId_kode_key`(`prodiId` ASC, `kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kelas` (
    `id` VARCHAR(191) NOT NULL,
    `mataKuliahId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `dosenId` VARCHAR(191) NOT NULL,
    `ruanganId` VARCHAR(191) NULL,
    `kodeKelas` VARCHAR(191) NOT NULL,
    `kapasitas` INTEGER NOT NULL DEFAULT 40,
    `hari` ENUM('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu') NULL,
    `jamMulai` VARCHAR(191) NULL,
    `jamSelesai` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,

    INDEX `Kelas_dosenId_idx`(`dosenId` ASC),
    UNIQUE INDEX `Kelas_feederId_key`(`feederId` ASC),
    UNIQUE INDEX `Kelas_mataKuliahId_semesterId_kodeKelas_key`(`mataKuliahId` ASC, `semesterId` ASC, `kodeKelas` ASC),
    INDEX `Kelas_ruanganId_fkey`(`ruanganId` ASC),
    INDEX `Kelas_semesterId_idx`(`semesterId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KelasDosen` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `dosenId` VARCHAR(191) NOT NULL,
    `peran` ENUM('lead', 'anggota', 'asisten') NOT NULL DEFAULT 'anggota',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KelasDosen_dosenId_idx`(`dosenId` ASC),
    UNIQUE INDEX `KelasDosen_kelasId_dosenId_key`(`kelasId` ASC, `dosenId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KeputusanRtm` (
    `id` VARCHAR(191) NOT NULL,
    `rtmId` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `picUserId` VARCHAR(191) NULL,
    `picCatatan` VARCHAR(191) NULL,
    `targetSelesai` DATETIME(3) NULL,
    `status` ENUM('open', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'open',
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KeputusanRtm_picUserId_fkey`(`picUserId` ASC),
    INDEX `KeputusanRtm_rtmId_idx`(`rtmId` ASC),
    INDEX `KeputusanRtm_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kkn` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `lokasi` VARCHAR(191) NOT NULL,
    `desa` VARCHAR(191) NULL,
    `kecamatan` VARCHAR(191) NULL,
    `kabupaten` VARCHAR(191) NULL,
    `dplDosenId` VARCHAR(191) NULL,
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `nilai` VARCHAR(191) NULL,
    `status` ENUM('pendaftaran', 'ditugaskan', 'berjalan', 'selesai') NOT NULL DEFAULT 'pendaftaran',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Kkn_dplDosenId_fkey`(`dplDosenId` ASC),
    INDEX `Kkn_mahasiswaId_idx`(`mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KonsultasiDpa` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `dpaId` VARCHAR(191) NOT NULL,
    `topik` VARCHAR(191) NOT NULL,
    `agenda` TEXT NULL,
    `waktuMulai` DATETIME(3) NOT NULL,
    `durasiMenit` INTEGER NOT NULL DEFAULT 30,
    `status` ENUM('diajukan', 'diterima', 'ditolak', 'selesai', 'batal') NOT NULL DEFAULT 'diajukan',
    `catatanDpa` TEXT NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KonsultasiDpa_dpaId_idx`(`dpaId` ASC),
    INDEX `KonsultasiDpa_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `KonsultasiDpa_status_idx`(`status` ASC),
    INDEX `KonsultasiDpa_waktuMulai_idx`(`waktuMulai` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Krs` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'diajukan', 'disetujui', 'ditolak') NOT NULL DEFAULT 'draft',
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Krs_feederId_key`(`feederId` ASC),
    INDEX `Krs_kelasId_fkey`(`kelasId` ASC),
    UNIQUE INDEX `Krs_mahasiswaId_kelasId_key`(`mahasiswaId` ASC, `kelasId` ASC),
    INDEX `Krs_semesterId_idx`(`semesterId` ASC),
    INDEX `Krs_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KuesionerKepuasan` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `kategori` ENUM('layanan_akademik', 'layanan_keuangan', 'layanan_sarpras', 'layanan_perpustakaan', 'layanan_kemahasiswaan', 'dosen_pembimbing', 'lulusan', 'pengguna_lulusan', 'lain') NOT NULL,
    `periode` VARCHAR(191) NULL,
    `target` VARCHAR(191) NOT NULL DEFAULT 'mahasiswa',
    `tokenPublic` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'publish', 'ditutup') NOT NULL DEFAULT 'draft',
    `mulai` DATETIME(3) NULL,
    `selesai` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KuesionerKepuasan_kategori_idx`(`kategori` ASC),
    UNIQUE INDEX `KuesionerKepuasan_kode_key`(`kode` ASC),
    INDEX `KuesionerKepuasan_status_idx`(`status` ASC),
    UNIQUE INDEX `KuesionerKepuasan_tokenPublic_key`(`tokenPublic` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kuis` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `durasiMenit` INTEGER NOT NULL DEFAULT 30,
    `mulai` DATETIME(3) NOT NULL,
    `selesai` DATETIME(3) NOT NULL,
    `acak` BOOLEAN NOT NULL DEFAULT true,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Kuis_kelasId_idx`(`kelasId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KuisAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `kuisId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `mulaiPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `selesaiPada` DATETIME(3) NULL,
    `status` ENUM('berjalan', 'submit', 'expired') NOT NULL DEFAULT 'berjalan',
    `jawaban` JSON NOT NULL,
    `skor` INTEGER NULL,
    `maxSkor` INTEGER NULL,
    `persen` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KuisAttempt_kuisId_idx`(`kuisId` ASC),
    UNIQUE INDEX `KuisAttempt_kuisId_mahasiswaId_key`(`kuisId` ASC, `mahasiswaId` ASC),
    INDEX `KuisAttempt_mahasiswaId_idx`(`mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KuisSoal` (
    `id` VARCHAR(191) NOT NULL,
    `kuisId` VARCHAR(191) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `pertanyaan` TEXT NOT NULL,
    `opsi` JSON NOT NULL,
    `jawaban` INTEGER NOT NULL,
    `bobot` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KuisSoal_kuisId_idx`(`kuisId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kurikulum` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `prodiId` VARCHAR(191) NOT NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Kurikulum_kode_key`(`kode` ASC),
    INDEX `Kurikulum_prodiId_idx`(`prodiId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LingkupAmi` (
    `id` VARCHAR(191) NOT NULL,
    `amiId` VARCHAR(191) NOT NULL,
    `prodiId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `LingkupAmi_amiId_prodiId_key`(`amiId` ASC, `prodiId` ASC),
    INDEX `LingkupAmi_prodiId_fkey`(`prodiId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nim` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jenisKelamin` ENUM('L', 'P') NOT NULL,
    `tempatLahir` VARCHAR(191) NULL,
    `tanggalLahir` DATETIME(3) NULL,
    `alamat` TEXT NULL,
    `telepon` VARCHAR(191) NULL,
    `angkatan` INTEGER NOT NULL,
    `prodiId` VARCHAR(191) NOT NULL,
    `status` ENUM('aktif', 'cuti', 'lulus', 'drop_out', 'mengundurkan_diri') NOT NULL DEFAULT 'aktif',
    `dpaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `kategoriUktId` VARCHAR(191) NULL,
    `defaultCicilanUkt` INTEGER NOT NULL DEFAULT 1,

    INDEX `Mahasiswa_angkatan_idx`(`angkatan` ASC),
    INDEX `Mahasiswa_dpaId_fkey`(`dpaId` ASC),
    UNIQUE INDEX `Mahasiswa_feederId_key`(`feederId` ASC),
    INDEX `Mahasiswa_kategoriUktId_fkey`(`kategoriUktId` ASC),
    UNIQUE INDEX `Mahasiswa_nim_key`(`nim` ASC),
    INDEX `Mahasiswa_prodiId_idx`(`prodiId` ASC),
    INDEX `Mahasiswa_status_idx`(`status` ASC),
    UNIQUE INDEX `Mahasiswa_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MataKuliah` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `namaInggris` VARCHAR(191) NULL,
    `sks` INTEGER NOT NULL,
    `sksTeori` INTEGER NOT NULL DEFAULT 0,
    `sksPraktik` INTEGER NOT NULL DEFAULT 0,
    `jenis` ENUM('wajib_universitas', 'wajib_prodi', 'pilihan') NOT NULL DEFAULT 'wajib_prodi',
    `prodiId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `MataKuliah_feederId_key`(`feederId` ASC),
    UNIQUE INDEX `MataKuliah_kode_key`(`kode` ASC),
    INDEX `MataKuliah_prodiId_idx`(`prodiId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MataKuliahKurikulum` (
    `id` VARCHAR(191) NOT NULL,
    `kurikulumId` VARCHAR(191) NOT NULL,
    `mataKuliahId` VARCHAR(191) NOT NULL,
    `semester` INTEGER NOT NULL,

    INDEX `MataKuliahKurikulum_kurikulumId_idx`(`kurikulumId` ASC),
    UNIQUE INDEX `MataKuliahKurikulum_kurikulumId_mataKuliahId_key`(`kurikulumId` ASC, `mataKuliahId` ASC),
    INDEX `MataKuliahKurikulum_mataKuliahId_fkey`(`mataKuliahId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mbkm` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('pertukaran_mahasiswa', 'magang_industri', 'asistensi_mengajar', 'penelitian', 'proyek_kemanusiaan', 'kewirausahaan', 'studi_independen', 'kkn_tematik') NOT NULL,
    `namaProgram` VARCHAR(191) NOT NULL,
    `mitra` VARCHAR(191) NOT NULL,
    `lokasi` VARCHAR(191) NULL,
    `periode` VARCHAR(191) NOT NULL,
    `dplDosenId` VARCHAR(191) NULL,
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `status` ENUM('pengajuan', 'disetujui', 'berjalan', 'selesai', 'ditolak') NOT NULL DEFAULT 'pengajuan',
    `catatan` TEXT NULL,
    `linkProposal` TEXT NULL,
    `linkLaporan` TEXT NULL,
    `linkSertifikat` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Mbkm_dplDosenId_fkey`(`dplDosenId` ASC),
    INDEX `Mbkm_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Mbkm_periode_idx`(`periode` ASC),
    INDEX `Mbkm_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MbkmKonversi` (
    `id` VARCHAR(191) NOT NULL,
    `mbkmId` VARCHAR(191) NOT NULL,
    `mataKuliahId` VARCHAR(191) NOT NULL,
    `nilaiHuruf` VARCHAR(191) NULL,
    `bobot` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MbkmKonversi_mataKuliahId_idx`(`mataKuliahId` ASC),
    UNIQUE INDEX `MbkmKonversi_mbkmId_mataKuliahId_key`(`mbkmId` ASC, `mataKuliahId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MutasiMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('cuti', 'aktif_kembali', 'pindah_prodi', 'drop_out', 'mengundurkan_diri') NOT NULL,
    `statusSebelum` ENUM('aktif', 'cuti', 'lulus', 'drop_out', 'mengundurkan_diri') NOT NULL,
    `statusSesudah` ENUM('aktif', 'cuti', 'lulus', 'drop_out', 'mengundurkan_diri') NOT NULL,
    `prodiAsalId` VARCHAR(191) NULL,
    `prodiTujuanId` VARCHAR(191) NULL,
    `semesterId` VARCHAR(191) NULL,
    `alasan` TEXT NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `status` ENUM('diajukan', 'disetujui', 'ditolak', 'batal') NOT NULL DEFAULT 'diajukan',
    `catatanAkademik` TEXT NULL,
    `diprosesPada` DATETIME(3) NULL,
    `diprosesOleh` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MutasiMahasiswa_jenis_idx`(`jenis` ASC),
    INDEX `MutasiMahasiswa_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `MutasiMahasiswa_prodiAsalId_fkey`(`prodiAsalId` ASC),
    INDEX `MutasiMahasiswa_prodiTujuanId_fkey`(`prodiTujuanId` ASC),
    INDEX `MutasiMahasiswa_semesterId_fkey`(`semesterId` ASC),
    INDEX `MutasiMahasiswa_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nilai` (
    `id` VARCHAR(191) NOT NULL,
    `krsId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `tugas` DOUBLE NULL,
    `uts` DOUBLE NULL,
    `uas` DOUBLE NULL,
    `praktikum` DOUBLE NULL,
    `kehadiran` DOUBLE NULL,
    `nilaiAngka` DOUBLE NULL,
    `nilaiHuruf` VARCHAR(191) NULL,
    `bobot` DOUBLE NULL,
    `status` ENUM('belum', 'draft', 'finalized') NOT NULL DEFAULT 'belum',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Nilai_feederId_key`(`feederId` ASC),
    UNIQUE INDEX `Nilai_krsId_key`(`krsId` ASC),
    INDEX `Nilai_mahasiswaId_idx`(`mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NilaiCpmk` (
    `id` VARCHAR(191) NOT NULL,
    `krsId` VARCHAR(191) NOT NULL,
    `cpmkId` VARCHAR(191) NOT NULL,
    `nilai` DOUBLE NOT NULL,
    `status` ENUM('belum', 'tercapai', 'belum_tercapai') NOT NULL DEFAULT 'belum',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NilaiCpmk_cpmkId_idx`(`cpmkId` ASC),
    UNIQUE INDEX `NilaiCpmk_krsId_cpmkId_key`(`krsId` ASC, `cpmkId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notifikasi` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NULL,
    `type` VARCHAR(191) NULL,
    `link` VARCHAR(191) NULL,
    `entity` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notifikasi_userId_createdAt_idx`(`userId` ASC, `createdAt` ASC),
    INDEX `Notifikasi_userId_readAt_idx`(`userId` ASC, `readAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` VARCHAR(191) NOT NULL,
    `tagihanId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jumlah` DECIMAL(15, 2) NOT NULL,
    `tanggalBayar` DATETIME(3) NOT NULL,
    `metode` ENUM('transfer_bank', 'va', 'tunai', 'qris', 'ewallet') NOT NULL,
    `buktiUrl` VARCHAR(191) NULL,
    `catatan` TEXT NULL,
    `divalidasiOleh` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `bankPenerima` VARCHAR(191) NULL,
    `bankPengirim` VARCHAR(191) NULL,
    `catatanValidasi` TEXT NULL,
    `noReferensi` VARCHAR(191) NULL,
    `status` ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'disetujui',
    `validasiPada` DATETIME(3) NULL,

    INDEX `Pembayaran_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Pembayaran_status_idx`(`status` ASC),
    INDEX `Pembayaran_tagihanId_idx`(`tagihanId` ASC),
    INDEX `Pembayaran_tanggalBayar_idx`(`tanggalBayar` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendaftaranBeasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `beasiswaId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `status` ENUM('diajukan', 'dalam_seleksi', 'diterima', 'ditolak', 'batal') NOT NULL DEFAULT 'diajukan',
    `catatan` TEXT NULL,
    `motivasi` TEXT NOT NULL,
    `linkDokumen` TEXT NULL,
    `ipkSaatDaftar` DOUBLE NOT NULL,
    `semesterSaatDaftar` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PendaftaranBeasiswa_beasiswaId_idx`(`beasiswaId` ASC),
    UNIQUE INDEX `PendaftaranBeasiswa_beasiswaId_mahasiswaId_key`(`beasiswaId` ASC, `mahasiswaId` ASC),
    INDEX `PendaftaranBeasiswa_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `PendaftaranBeasiswa_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Penelitian` (
    `id` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `abstrak` TEXT NULL,
    `tahun` INTEGER NOT NULL,
    `sumberDana` VARCHAR(191) NULL,
    `jumlahDana` DECIMAL(15, 2) NULL,
    `ketuaDosenId` VARCHAR(191) NOT NULL,
    `status` ENUM('proposal', 'disetujui', 'berjalan', 'selesai', 'ditolak') NOT NULL DEFAULT 'proposal',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Penelitian_ketuaDosenId_idx`(`ketuaDosenId` ASC),
    INDEX `Penelitian_tahun_idx`(`tahun` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PenelitianMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `penelitianId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `peran` VARCHAR(191) NOT NULL,

    INDEX `PenelitianMahasiswa_mahasiswaId_fkey`(`mahasiswaId` ASC),
    UNIQUE INDEX `PenelitianMahasiswa_penelitianId_mahasiswaId_key`(`penelitianId` ASC, `mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengabdian` (
    `id` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `tahun` INTEGER NOT NULL,
    `lokasi` VARCHAR(191) NULL,
    `sumberDana` VARCHAR(191) NULL,
    `jumlahDana` DECIMAL(15, 2) NULL,
    `ketuaDosenId` VARCHAR(191) NOT NULL,
    `status` ENUM('proposal', 'disetujui', 'berjalan', 'selesai', 'ditolak') NOT NULL DEFAULT 'proposal',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Pengabdian_ketuaDosenId_idx`(`ketuaDosenId` ASC),
    INDEX `Pengabdian_tahun_idx`(`tahun` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengabdianMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `pengabdianId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `peran` VARCHAR(191) NOT NULL,

    INDEX `PengabdianMahasiswa_mahasiswaId_fkey`(`mahasiswaId` ASC),
    UNIQUE INDEX `PengabdianMahasiswa_pengabdianId_mahasiswaId_key`(`pengabdianId` ASC, `mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengukuranStandar` (
    `id` VARCHAR(191) NOT NULL,
    `standarId` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `nilai` DOUBLE NOT NULL,
    `status` ENUM('belum_diukur', 'tercapai', 'cukup', 'belum_tercapai') NOT NULL DEFAULT 'belum_diukur',
    `catatan` TEXT NULL,
    `sumberData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PengukuranStandar_periode_idx`(`periode` ASC),
    UNIQUE INDEX `PengukuranStandar_standarId_periode_key`(`standarId` ASC, `periode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengumuman` (
    `id` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `isi` TEXT NOT NULL,
    `pengirim` VARCHAR(191) NULL,
    `target` VARCHAR(191) NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isPenting` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Pengumuman_tanggal_idx`(`tanggal` ASC),
    INDEX `Pengumuman_target_idx`(`target` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PeriodeWisuda` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `isPendaftaranBuka` BOOLEAN NOT NULL DEFAULT true,
    `batasIpk` DOUBLE NULL,
    `batasSks` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PeriodeWisuda_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PertanyaanKepuasan` (
    `id` VARCHAR(191) NOT NULL,
    `kuesionerId` VARCHAR(191) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `pertanyaan` TEXT NOT NULL,
    `jenis` ENUM('likert', 'pilihan', 'open') NOT NULL DEFAULT 'likert',
    `wajib` BOOLEAN NOT NULL DEFAULT true,
    `opsi` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PertanyaanKepuasan_kuesionerId_idx`(`kuesionerId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pertemuan` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `pertemuanKe` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `topik` TEXT NULL,
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `alasanReschedule` TEXT NULL,
    `direschedulePada` DATETIME(3) NULL,
    `ruanganId` VARCHAR(191) NULL,
    `tanggalAsli` DATETIME(3) NULL,
    `pinDibuatPada` DATETIME(3) NULL,
    `pinExpiresAt` DATETIME(3) NULL,
    `pinKehadiran` VARCHAR(191) NULL,

    INDEX `Pertemuan_kelasId_idx`(`kelasId` ASC),
    UNIQUE INDEX `Pertemuan_kelasId_pertemuanKe_key`(`kelasId` ASC, `pertemuanKe` ASC),
    INDEX `Pertemuan_ruanganId_idx`(`ruanganId` ASC),
    INDEX `Pertemuan_tanggal_idx`(`tanggal` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prasyarat` (
    `id` VARCHAR(191) NOT NULL,
    `mkUtamaId` VARCHAR(191) NOT NULL,
    `mkPrasyaratId` VARCHAR(191) NOT NULL,
    `nilaiMinimal` VARCHAR(191) NULL,

    INDEX `Prasyarat_mkPrasyaratId_fkey`(`mkPrasyaratId` ASC),
    UNIQUE INDEX `Prasyarat_mkUtamaId_mkPrasyaratId_key`(`mkUtamaId` ASC, `mkPrasyaratId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prestasi` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('lomba_akademik', 'lomba_non_akademik', 'kepanitiaan', 'organisasi', 'publikasi', 'lain') NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `penyelenggara` VARCHAR(191) NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `level` ENUM('internasional', 'nasional', 'regional', 'lokal', 'internal') NULL,
    `peran` VARCHAR(191) NULL,
    `deskripsi` TEXT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `status` ENUM('draft', 'diajukan', 'diverifikasi', 'ditolak') NOT NULL DEFAULT 'draft',
    `catatanVerifikator` TEXT NULL,
    `diverifikasiOleh` VARCHAR(191) NULL,
    `diverifikasiPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Prestasi_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Prestasi_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prodi` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jenjang` ENUM('d3', 'd4', 's1', 's2', 's3', 'profesi') NOT NULL,
    `fakultasId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `tarifSppDefault` DECIMAL(15, 2) NULL,
    `tarifUangPangkal` DECIMAL(15, 2) NULL,

    INDEX `Prodi_fakultasId_idx`(`fakultasId` ASC),
    UNIQUE INDEX `Prodi_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RapatTinjauanManajemen` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `agenda` TEXT NOT NULL,
    `notulen` TEXT NULL,
    `peserta` TEXT NULL,
    `status` ENUM('perencanaan', 'selesai') NOT NULL DEFAULT 'perencanaan',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RapatTinjauanManajemen_kode_key`(`kode` ASC),
    INDEX `RapatTinjauanManajemen_tanggal_idx`(`tanggal` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `userAgent` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash` ASC),
    INDEX `RefreshToken_userId_idx`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResponseKepuasan` (
    `id` VARCHAR(191) NOT NULL,
    `kuesionerId` VARCHAR(191) NOT NULL,
    `rolePelapor` VARCHAR(191) NULL,
    `identitasOpsional` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ResponseKepuasan_kuesionerId_idx`(`kuesionerId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ruangan` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `gedung` VARCHAR(191) NULL,
    `lantai` INTEGER NULL,
    `kapasitas` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ruangan_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Semester` (
    `id` VARCHAR(191) NOT NULL,
    `tahunAjaranId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('ganjil', 'genap', 'pendek') NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `krsMulai` DATETIME(3) NULL,
    `krsSelesai` DATETIME(3) NULL,
    `prsMulai` DATETIME(3) NULL,
    `prsSelesai` DATETIME(3) NULL,
    `nilaiMulai` DATETIME(3) NULL,
    `nilaiSelesai` DATETIME(3) NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Semester_isAktif_idx`(`isAktif` ASC),
    UNIQUE INDEX `Semester_kode_key`(`kode` ASC),
    INDEX `Semester_tahunAjaranId_idx`(`tahunAjaranId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sertifikasi` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('bahasa', 'kompetensi', 'pelatihan', 'lain') NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `penerbit` VARCHAR(191) NOT NULL,
    `nomorSertifikat` VARCHAR(191) NULL,
    `tanggalTerbit` DATETIME(3) NOT NULL,
    `tanggalKadaluwarsa` DATETIME(3) NULL,
    `level` ENUM('internasional', 'nasional', 'regional', 'lokal', 'internal') NULL,
    `skor` VARCHAR(191) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `status` ENUM('draft', 'diajukan', 'diverifikasi', 'ditolak') NOT NULL DEFAULT 'draft',
    `catatanVerifikator` TEXT NULL,
    `diverifikasiOleh` VARCHAR(191) NULL,
    `diverifikasiPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Sertifikasi_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Sertifikasi_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SertifikatDigital` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('kkn', 'mbkm', 'edom', 'workshop', 'panitia', 'asisten', 'lain') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `nomorSertifikat` VARCHAR(191) NOT NULL,
    `tanggalTerbit` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sumberEntity` VARCHAR(191) NULL,
    `sumberId` VARCHAR(191) NULL,
    `periode` VARCHAR(191) NULL,
    `ttdNama` VARCHAR(191) NULL,
    `ttdJabatan` VARCHAR(191) NULL,
    `verifikasiToken` VARCHAR(191) NOT NULL,
    `status` ENUM('terbit', 'dicabut') NOT NULL DEFAULT 'terbit',
    `alasanCabut` TEXT NULL,
    `dicabutPada` DATETIME(3) NULL,
    `dicabutOleh` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SertifikatDigital_jenis_idx`(`jenis` ASC),
    INDEX `SertifikatDigital_mahasiswaId_idx`(`mahasiswaId` ASC),
    UNIQUE INDEX `SertifikatDigital_nomorSertifikat_key`(`nomorSertifikat` ASC),
    INDEX `SertifikatDigital_status_idx`(`status` ASC),
    INDEX `SertifikatDigital_sumberEntity_sumberId_idx`(`sumberEntity` ASC, `sumberId` ASC),
    UNIQUE INDEX `SertifikatDigital_verifikasiToken_key`(`verifikasiToken` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skripsi` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `judul` TEXT NOT NULL,
    `abstrak` TEXT NULL,
    `topik` VARCHAR(191) NULL,
    `status` ENUM('diajukan', 'disetujui', 'proposal', 'penelitian', 'sidang', 'lulus', 'ditolak', 'batal') NOT NULL DEFAULT 'diajukan',
    `catatan` TEXT NULL,
    `pembimbing1Id` VARCHAR(191) NULL,
    `pembimbing2Id` VARCHAR(191) NULL,
    `tanggalAjuan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggalDisetujui` DATETIME(3) NULL,
    `tanggalSidang` DATETIME(3) NULL,
    `nilaiHuruf` VARCHAR(191) NULL,
    `linkDokumen` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Skripsi_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Skripsi_pembimbing1Id_idx`(`pembimbing1Id` ASC),
    INDEX `Skripsi_pembimbing2Id_idx`(`pembimbing2Id` ASC),
    INDEX `Skripsi_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StandarMutu` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `kategori` ENUM('pendidikan', 'penelitian', 'pengabdian', 'pengelolaan', 'sarpras', 'pembiayaan', 'spmi_tambahan', 'non_akademik', 'standar_internasional') NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `rumusan` TEXT NULL,
    `satuan` VARCHAR(191) NULL,
    `targetMin` DOUBLE NULL,
    `targetMax` DOUBLE NULL,
    `ambangCukup` DOUBLE NULL,
    `sumberData` ENUM('manual', 'ipk_lulusan', 'masa_studi', 'tingkat_kelulusan', 'edom_dosen', 'kehadiran_dosen', 'kehadiran_mahasiswa', 'rasio_dosen_mhs', 'bkd_compliance', 'capaian_cpl') NOT NULL DEFAULT 'manual',
    `prodiId` VARCHAR(191) NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StandarMutu_kategori_idx`(`kategori` ASC),
    UNIQUE INDEX `StandarMutu_kode_key`(`kode` ASC),
    INDEX `StandarMutu_prodiId_idx`(`prodiId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubmitTugas` (
    `id` VARCHAR(191) NOT NULL,
    `tugasId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `linkJawaban` TEXT NULL,
    `isiJawaban` TEXT NULL,
    `waktuSubmit` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `terlambat` BOOLEAN NOT NULL DEFAULT false,
    `nilai` DOUBLE NULL,
    `catatan` TEXT NULL,
    `status` ENUM('terkumpul', 'terlambat', 'dinilai') NOT NULL DEFAULT 'terkumpul',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SubmitTugas_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `SubmitTugas_tugasId_idx`(`tugasId` ASC),
    UNIQUE INDEX `SubmitTugas_tugasId_mahasiswaId_key`(`tugasId` ASC, `mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Surat` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('aktif_kuliah', 'keterangan_mahasiswa', 'pengantar_beasiswa', 'pengantar_penelitian', 'pengantar_magang', 'pengganti_ktm', 'lainnya') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `keperluan` TEXT NOT NULL,
    `status` ENUM('diajukan', 'disetujui', 'ditolak', 'selesai', 'batal') NOT NULL DEFAULT 'diajukan',
    `catatan` TEXT NULL,
    `nomorSurat` VARCHAR(191) NULL,
    `tanggalDiajukan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggalDisetujui` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Surat_jenis_idx`(`jenis` ASC),
    INDEX `Surat_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Surat_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tagihan` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('spp', 'ukt', 'cicilan_ukt', 'uang_pangkal', 'pembangunan', 'praktikum', 'wisuda', 'ujian', 'lainnya') NOT NULL,
    `deskripsi` VARCHAR(191) NOT NULL,
    `jumlah` DECIMAL(15, 2) NOT NULL,
    `jatuhTempo` DATETIME(3) NOT NULL,
    `status` ENUM('belum_bayar', 'cicil', 'lunas', 'jatuh_tempo') NOT NULL DEFAULT 'belum_bayar',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tagihan_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Tagihan_semesterId_idx`(`semesterId` ASC),
    INDEX `Tagihan_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TahunAjaran` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `tahunMulai` INTEGER NOT NULL,
    `tahunSelesai` INTEGER NOT NULL,
    `isAktif` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TahunAjaran_kode_key`(`kode` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemuanAmi` (
    `id` VARCHAR(191) NOT NULL,
    `amiId` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `kategori` ENUM('ktsm', 'kts', 'observasi', 'saran') NOT NULL,
    `standarId` VARCHAR(191) NULL,
    `deskripsi` TEXT NOT NULL,
    `buktiUrl` TEXT NULL,
    `rekomendasi` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TemuanAmi_amiId_kode_key`(`amiId` ASC, `kode` ASC),
    INDEX `TemuanAmi_kategori_idx`(`kategori` ASC),
    INDEX `TemuanAmi_standarId_idx`(`standarId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tiket` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `kategori` ENUM('krs', 'keuangan', 'akun', 'nilai', 'layanan', 'lain') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `status` ENUM('terbuka', 'proses', 'menunggu_user', 'selesai', 'ditutup') NOT NULL DEFAULT 'terbuka',
    `prioritas` ENUM('rendah', 'normal', 'tinggi') NOT NULL DEFAULT 'normal',
    `tanggalTutup` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tiket_kategori_idx`(`kategori` ASC),
    INDEX `Tiket_mahasiswaId_idx`(`mahasiswaId` ASC),
    INDEX `Tiket_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TiketReply` (
    `id` VARCHAR(191) NOT NULL,
    `tiketId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `authorRole` VARCHAR(191) NOT NULL,
    `isi` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TiketReply_authorId_fkey`(`authorId` ASC),
    INDEX `TiketReply_tiketId_idx`(`tiketId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TindakLanjutCapa` (
    `id` VARCHAR(191) NOT NULL,
    `temuanId` VARCHAR(191) NOT NULL,
    `akarMasalah` TEXT NULL,
    `rencanaTindakan` TEXT NOT NULL,
    `picUserId` VARCHAR(191) NULL,
    `picDosenId` VARCHAR(191) NULL,
    `targetSelesai` DATETIME(3) NOT NULL,
    `realisasiTindakan` TEXT NULL,
    `bukti` TEXT NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `verifikator` VARCHAR(191) NULL,
    `verifikasiPada` DATETIME(3) NULL,
    `catatanVerifikasi` TEXT NULL,
    `status` ENUM('rencana', 'pelaksanaan', 'verifikasi', 'closed', 'ditolak') NOT NULL DEFAULT 'rencana',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TindakLanjutCapa_picDosenId_fkey`(`picDosenId` ASC),
    INDEX `TindakLanjutCapa_picUserId_fkey`(`picUserId` ASC),
    INDEX `TindakLanjutCapa_status_idx`(`status` ASC),
    INDEX `TindakLanjutCapa_targetSelesai_idx`(`targetSelesai` ASC),
    UNIQUE INDEX `TindakLanjutCapa_temuanId_key`(`temuanId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tugas` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `pertemuanId` VARCHAR(191) NULL,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `maxNilai` INTEGER NOT NULL DEFAULT 100,
    `linkLampiran` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tugas_deadline_idx`(`deadline` ASC),
    INDEX `Tugas_kelasId_idx`(`kelasId` ASC),
    INDEX `Tugas_pertemuanId_fkey`(`pertemuanId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('mahasiswa', 'dosen', 'akademik', 'wali') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `passwordMustChange` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email` ASC),
    INDEX `User_role_idx`(`role` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Wali` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `telepon` VARCHAR(191) NULL,
    `alamat` TEXT NULL,
    `pekerjaan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Wali_userId_key`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WaliMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `waliId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `hubungan` ENUM('ayah', 'ibu', 'kakak', 'saudara', 'wali_lain') NOT NULL DEFAULT 'wali_lain',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WaliMahasiswa_mahasiswaId_idx`(`mahasiswaId` ASC),
    UNIQUE INDEX `WaliMahasiswa_waliId_mahasiswaId_key`(`waliId` ASC, `mahasiswaId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Yudisium` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `periodeWisudaId` VARCHAR(191) NOT NULL,
    `status` ENUM('pendaftaran', 'verifikasi', 'layak', 'tidak_layak', 'wisuda', 'batal') NOT NULL DEFAULT 'pendaftaran',
    `ipk` DOUBLE NOT NULL,
    `sksLulus` INTEGER NOT NULL,
    `predikat` ENUM('cumlaude', 'sangat_memuaskan', 'memuaskan', 'tidak_lulus') NULL,
    `catatan` TEXT NULL,
    `noIjazah` VARCHAR(191) NULL,
    `noSkl` VARCHAR(191) NULL,
    `tanggalLulus` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `verifikasiToken` VARCHAR(191) NULL,

    UNIQUE INDEX `Yudisium_mahasiswaId_periodeWisudaId_key`(`mahasiswaId` ASC, `periodeWisudaId` ASC),
    INDEX `Yudisium_periodeWisudaId_idx`(`periodeWisudaId` ASC),
    INDEX `Yudisium_status_idx`(`status` ASC),
    UNIQUE INDEX `Yudisium_verifikasiToken_key`(`verifikasiToken` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_pertemuanId_fkey` FOREIGN KEY (`pertemuanId`) REFERENCES `Pertemuan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Akademik` ADD CONSTRAINT `Akademik_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditorAmi` ADD CONSTRAINT `AuditorAmi_amiId_fkey` FOREIGN KEY (`amiId`) REFERENCES `AuditMutuInternal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditorAmi` ADD CONSTRAINT `AuditorAmi_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BahanAjar` ADD CONSTRAINT `BahanAjar_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BahanAjar` ADD CONSTRAINT `BahanAjar_pertemuanId_fkey` FOREIGN KEY (`pertemuanId`) REFERENCES `Pertemuan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BkdItem` ADD CONSTRAINT `BkdItem_laporanId_fkey` FOREIGN KEY (`laporanId`) REFERENCES `BkdLaporan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BkdLaporan` ADD CONSTRAINT `BkdLaporan_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BkdLaporan` ADD CONSTRAINT `BkdLaporan_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cpl` ADD CONSTRAINT `Cpl_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cpmk` ADD CONSTRAINT `Cpmk_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CpmkCpl` ADD CONSTRAINT `CpmkCpl_cplId_fkey` FOREIGN KEY (`cplId`) REFERENCES `Cpl`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CpmkCpl` ADD CONSTRAINT `CpmkCpl_cpmkId_fkey` FOREIGN KEY (`cpmkId`) REFERENCES `Cpmk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dokumen` ADD CONSTRAINT `Dokumen_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `KategoriDokumen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DokumenAkses` ADD CONSTRAINT `DokumenAkses_dokumenId_fkey` FOREIGN KEY (`dokumenId`) REFERENCES `Dokumen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DokumenAkses` ADD CONSTRAINT `DokumenAkses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomAspek` ADD CONSTRAINT `EdomAspek_kuesionerId_fkey` FOREIGN KEY (`kuesionerId`) REFERENCES `EdomKuesioner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomJawaban` ADD CONSTRAINT `EdomJawaban_aspekId_fkey` FOREIGN KEY (`aspekId`) REFERENCES `EdomAspek`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomJawaban` ADD CONSTRAINT `EdomJawaban_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `EdomResponse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomKuesioner` ADD CONSTRAINT `EdomKuesioner_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomResponse` ADD CONSTRAINT `EdomResponse_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomResponse` ADD CONSTRAINT `EdomResponse_kuesionerId_fkey` FOREIGN KEY (`kuesionerId`) REFERENCES `EdomKuesioner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EdomResponse` ADD CONSTRAINT `EdomResponse_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumReply` ADD CONSTRAINT `ForumReply_authorDosenId_fkey` FOREIGN KEY (`authorDosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumReply` ADD CONSTRAINT `ForumReply_authorMahasiswaId_fkey` FOREIGN KEY (`authorMahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumReply` ADD CONSTRAINT `ForumReply_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `ForumThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumThread` ADD CONSTRAINT `ForumThread_authorDosenId_fkey` FOREIGN KEY (`authorDosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumThread` ADD CONSTRAINT `ForumThread_authorMahasiswaId_fkey` FOREIGN KEY (`authorMahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumThread` ADD CONSTRAINT `ForumThread_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Heregistrasi` ADD CONSTRAINT `Heregistrasi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Heregistrasi` ADD CONSTRAINT `Heregistrasi_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JawabanKepuasan` ADD CONSTRAINT `JawabanKepuasan_pertanyaanId_fkey` FOREIGN KEY (`pertanyaanId`) REFERENCES `PertanyaanKepuasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JawabanKepuasan` ADD CONSTRAINT `JawabanKepuasan_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `ResponseKepuasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KalenderAkademik` ADD CONSTRAINT `KalenderAkademik_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KategoriUkt` ADD CONSTRAINT `KategoriUkt_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kelas` ADD CONSTRAINT `Kelas_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kelas` ADD CONSTRAINT `Kelas_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kelas` ADD CONSTRAINT `Kelas_ruanganId_fkey` FOREIGN KEY (`ruanganId`) REFERENCES `Ruangan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kelas` ADD CONSTRAINT `Kelas_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasDosen` ADD CONSTRAINT `KelasDosen_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KelasDosen` ADD CONSTRAINT `KelasDosen_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KeputusanRtm` ADD CONSTRAINT `KeputusanRtm_picUserId_fkey` FOREIGN KEY (`picUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KeputusanRtm` ADD CONSTRAINT `KeputusanRtm_rtmId_fkey` FOREIGN KEY (`rtmId`) REFERENCES `RapatTinjauanManajemen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kkn` ADD CONSTRAINT `Kkn_dplDosenId_fkey` FOREIGN KEY (`dplDosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kkn` ADD CONSTRAINT `Kkn_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KonsultasiDpa` ADD CONSTRAINT `KonsultasiDpa_dpaId_fkey` FOREIGN KEY (`dpaId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KonsultasiDpa` ADD CONSTRAINT `KonsultasiDpa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Krs` ADD CONSTRAINT `Krs_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Krs` ADD CONSTRAINT `Krs_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Krs` ADD CONSTRAINT `Krs_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kuis` ADD CONSTRAINT `Kuis_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KuisAttempt` ADD CONSTRAINT `KuisAttempt_kuisId_fkey` FOREIGN KEY (`kuisId`) REFERENCES `Kuis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KuisAttempt` ADD CONSTRAINT `KuisAttempt_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KuisSoal` ADD CONSTRAINT `KuisSoal_kuisId_fkey` FOREIGN KEY (`kuisId`) REFERENCES `Kuis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kurikulum` ADD CONSTRAINT `Kurikulum_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LingkupAmi` ADD CONSTRAINT `LingkupAmi_amiId_fkey` FOREIGN KEY (`amiId`) REFERENCES `AuditMutuInternal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LingkupAmi` ADD CONSTRAINT `LingkupAmi_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_dpaId_fkey` FOREIGN KEY (`dpaId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_kategoriUktId_fkey` FOREIGN KEY (`kategoriUktId`) REFERENCES `KategoriUkt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MataKuliah` ADD CONSTRAINT `MataKuliah_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MataKuliahKurikulum` ADD CONSTRAINT `MataKuliahKurikulum_kurikulumId_fkey` FOREIGN KEY (`kurikulumId`) REFERENCES `Kurikulum`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MataKuliahKurikulum` ADD CONSTRAINT `MataKuliahKurikulum_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mbkm` ADD CONSTRAINT `Mbkm_dplDosenId_fkey` FOREIGN KEY (`dplDosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mbkm` ADD CONSTRAINT `Mbkm_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MbkmKonversi` ADD CONSTRAINT `MbkmKonversi_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MbkmKonversi` ADD CONSTRAINT `MbkmKonversi_mbkmId_fkey` FOREIGN KEY (`mbkmId`) REFERENCES `Mbkm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MutasiMahasiswa` ADD CONSTRAINT `MutasiMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MutasiMahasiswa` ADD CONSTRAINT `MutasiMahasiswa_prodiAsalId_fkey` FOREIGN KEY (`prodiAsalId`) REFERENCES `Prodi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MutasiMahasiswa` ADD CONSTRAINT `MutasiMahasiswa_prodiTujuanId_fkey` FOREIGN KEY (`prodiTujuanId`) REFERENCES `Prodi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MutasiMahasiswa` ADD CONSTRAINT `MutasiMahasiswa_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nilai` ADD CONSTRAINT `Nilai_krsId_fkey` FOREIGN KEY (`krsId`) REFERENCES `Krs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nilai` ADD CONSTRAINT `Nilai_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NilaiCpmk` ADD CONSTRAINT `NilaiCpmk_cpmkId_fkey` FOREIGN KEY (`cpmkId`) REFERENCES `Cpmk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NilaiCpmk` ADD CONSTRAINT `NilaiCpmk_krsId_fkey` FOREIGN KEY (`krsId`) REFERENCES `Krs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notifikasi` ADD CONSTRAINT `Notifikasi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_tagihanId_fkey` FOREIGN KEY (`tagihanId`) REFERENCES `Tagihan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranBeasiswa` ADD CONSTRAINT `PendaftaranBeasiswa_beasiswaId_fkey` FOREIGN KEY (`beasiswaId`) REFERENCES `Beasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranBeasiswa` ADD CONSTRAINT `PendaftaranBeasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penelitian` ADD CONSTRAINT `Penelitian_ketuaDosenId_fkey` FOREIGN KEY (`ketuaDosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenelitianMahasiswa` ADD CONSTRAINT `PenelitianMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenelitianMahasiswa` ADD CONSTRAINT `PenelitianMahasiswa_penelitianId_fkey` FOREIGN KEY (`penelitianId`) REFERENCES `Penelitian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengabdian` ADD CONSTRAINT `Pengabdian_ketuaDosenId_fkey` FOREIGN KEY (`ketuaDosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengabdianMahasiswa` ADD CONSTRAINT `PengabdianMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengabdianMahasiswa` ADD CONSTRAINT `PengabdianMahasiswa_pengabdianId_fkey` FOREIGN KEY (`pengabdianId`) REFERENCES `Pengabdian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengukuranStandar` ADD CONSTRAINT `PengukuranStandar_standarId_fkey` FOREIGN KEY (`standarId`) REFERENCES `StandarMutu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PertanyaanKepuasan` ADD CONSTRAINT `PertanyaanKepuasan_kuesionerId_fkey` FOREIGN KEY (`kuesionerId`) REFERENCES `KuesionerKepuasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pertemuan` ADD CONSTRAINT `Pertemuan_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pertemuan` ADD CONSTRAINT `Pertemuan_ruanganId_fkey` FOREIGN KEY (`ruanganId`) REFERENCES `Ruangan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prasyarat` ADD CONSTRAINT `Prasyarat_mkPrasyaratId_fkey` FOREIGN KEY (`mkPrasyaratId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prasyarat` ADD CONSTRAINT `Prasyarat_mkUtamaId_fkey` FOREIGN KEY (`mkUtamaId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prestasi` ADD CONSTRAINT `Prestasi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prodi` ADD CONSTRAINT `Prodi_fakultasId_fkey` FOREIGN KEY (`fakultasId`) REFERENCES `Fakultas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseKepuasan` ADD CONSTRAINT `ResponseKepuasan_kuesionerId_fkey` FOREIGN KEY (`kuesionerId`) REFERENCES `KuesionerKepuasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Semester` ADD CONSTRAINT `Semester_tahunAjaranId_fkey` FOREIGN KEY (`tahunAjaranId`) REFERENCES `TahunAjaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sertifikasi` ADD CONSTRAINT `Sertifikasi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SertifikatDigital` ADD CONSTRAINT `SertifikatDigital_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skripsi` ADD CONSTRAINT `Skripsi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skripsi` ADD CONSTRAINT `Skripsi_pembimbing1Id_fkey` FOREIGN KEY (`pembimbing1Id`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skripsi` ADD CONSTRAINT `Skripsi_pembimbing2Id_fkey` FOREIGN KEY (`pembimbing2Id`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StandarMutu` ADD CONSTRAINT `StandarMutu_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmitTugas` ADD CONSTRAINT `SubmitTugas_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmitTugas` ADD CONSTRAINT `SubmitTugas_tugasId_fkey` FOREIGN KEY (`tugasId`) REFERENCES `Tugas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Surat` ADD CONSTRAINT `Surat_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tagihan` ADD CONSTRAINT `Tagihan_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tagihan` ADD CONSTRAINT `Tagihan_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemuanAmi` ADD CONSTRAINT `TemuanAmi_amiId_fkey` FOREIGN KEY (`amiId`) REFERENCES `AuditMutuInternal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemuanAmi` ADD CONSTRAINT `TemuanAmi_standarId_fkey` FOREIGN KEY (`standarId`) REFERENCES `StandarMutu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tiket` ADD CONSTRAINT `Tiket_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TiketReply` ADD CONSTRAINT `TiketReply_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TiketReply` ADD CONSTRAINT `TiketReply_tiketId_fkey` FOREIGN KEY (`tiketId`) REFERENCES `Tiket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TindakLanjutCapa` ADD CONSTRAINT `TindakLanjutCapa_picDosenId_fkey` FOREIGN KEY (`picDosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TindakLanjutCapa` ADD CONSTRAINT `TindakLanjutCapa_picUserId_fkey` FOREIGN KEY (`picUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TindakLanjutCapa` ADD CONSTRAINT `TindakLanjutCapa_temuanId_fkey` FOREIGN KEY (`temuanId`) REFERENCES `TemuanAmi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tugas` ADD CONSTRAINT `Tugas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tugas` ADD CONSTRAINT `Tugas_pertemuanId_fkey` FOREIGN KEY (`pertemuanId`) REFERENCES `Pertemuan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Wali` ADD CONSTRAINT `Wali_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WaliMahasiswa` ADD CONSTRAINT `WaliMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WaliMahasiswa` ADD CONSTRAINT `WaliMahasiswa_waliId_fkey` FOREIGN KEY (`waliId`) REFERENCES `Wali`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Yudisium` ADD CONSTRAINT `Yudisium_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Yudisium` ADD CONSTRAINT `Yudisium_periodeWisudaId_fkey` FOREIGN KEY (`periodeWisudaId`) REFERENCES `PeriodeWisuda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

