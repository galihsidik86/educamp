-- AlterTable
ALTER TABLE `Akademik` ADD COLUMN `prodiId` VARCHAR(191) NULL,
    ADD COLUMN `subRole` ENUM('super_admin', 'akademik', 'keuangan', 'prodi', 'spmi') NOT NULL DEFAULT 'super_admin';

-- AlterTable
ALTER TABLE `Dosen` ADD COLUMN `agamaKode` INTEGER NULL,
    ADD COLUMN `nik` VARCHAR(16) NULL,
    ADD COLUMN `nip` VARCHAR(20) NULL,
    ADD COLUMN `nuk` VARCHAR(20) NULL,
    ADD COLUMN `pangkatGolongan` VARCHAR(191) NULL,
    ADD COLUMN `pendidikanTerakhirBidang` VARCHAR(191) NULL,
    ADD COLUMN `pendidikanTerakhirGelar` VARCHAR(191) NULL,
    ADD COLUMN `pendidikanTerakhirJenjang` VARCHAR(191) NULL,
    ADD COLUMN `pendidikanTerakhirTahunLulus` INTEGER NULL,
    ADD COLUMN `serdosStatus` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `serdosTanggal` DATETIME(3) NULL,
    ADD COLUMN `statusKeaktifan` VARCHAR(191) NULL DEFAULT 'aktif',
    ADD COLUMN `statusKepegawaian` VARCHAR(191) NULL,
    ADD COLUMN `tanggalMulaiKerja` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `FeederQueue` MODIFY `entity` ENUM('mahasiswa', 'dosen', 'mata_kuliah', 'kelas', 'krs', 'nilai', 'aktivitas', 'yudisium', 'akm', 'komponen_evaluasi', 'nilai_komponen', 'daya_tampung', 'mahasiswa_inbound', 'nilai_transfer') NOT NULL;

-- AlterTable
ALTER TABLE `FeederSyncLog` MODIFY `entity` ENUM('mahasiswa', 'dosen', 'mata_kuliah', 'kelas', 'krs', 'nilai', 'aktivitas', 'yudisium', 'akm', 'komponen_evaluasi', 'nilai_komponen', 'daya_tampung', 'mahasiswa_inbound', 'nilai_transfer') NOT NULL;

-- AlterTable
ALTER TABLE `Kelas` ADD COLUMN `metodePembelajaran` ENUM('tatap_muka', 'daring', 'blended') NULL DEFAULT 'tatap_muka';

-- AlterTable
ALTER TABLE `Kuis` ADD COLUMN `masukNilaiTugas` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Mahasiswa` ADD COLUMN `agamaKode` INTEGER NULL,
    ADD COLUMN `alatTransportasiKode` INTEGER NULL,
    ADD COLUMN `jalurMasukKode` VARCHAR(191) NULL,
    ADD COLUMN `jenisPendaftaran` ENUM('baru', 'pindahan', 'lanjutan', 'ppg', 'transfer', 'rpl') NULL DEFAULT 'baru',
    ADD COLUMN `jenisSekolahAsal` VARCHAR(191) NULL,
    ADD COLUMN `jenisTinggalKode` INTEGER NULL,
    ADD COLUMN `kebutuhanKhusus` VARCHAR(191) NULL,
    ADD COLUMN `kewarganegaraan` VARCHAR(191) NULL DEFAULT 'Indonesia',
    ADD COLUMN `kodeWilayahAlamat` VARCHAR(8) NULL,
    ADD COLUMN `namaSekolahAsal` VARCHAR(191) NULL,
    ADD COLUMN `nik` VARCHAR(16) NULL,
    ADD COLUMN `nisn` VARCHAR(10) NULL,
    ADD COLUMN `npsn` VARCHAR(10) NULL,
    ADD COLUMN `pembiayaan` VARCHAR(191) NULL,
    ADD COLUMN `semesterAwal` VARCHAR(5) NULL,
    ADD COLUMN `tahunLulusSekolah` INTEGER NULL,
    ADD COLUMN `tanggalMasuk` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `MataKuliah` ADD COLUMN `bidangIlmu` VARCHAR(191) NULL,
    ADD COLUMN `deskripsi` TEXT NULL,
    ADD COLUMN `kelompokMatkul` ENUM('MKWU', 'MKDK', 'MKWK', 'MKK', 'MKB', 'MPK') NULL,
    ADD COLUMN `linkRps` TEXT NULL,
    ADD COLUMN `sksLapangan` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sksSimulasi` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Prodi` MODIFY `jenjang` ENUM('d3', 'd4', 's1', 's2', 's3', 'profesi', 'ppg', 'sp1', 'sp2') NOT NULL;

-- AlterTable
ALTER TABLE `Tugas` ADD COLUMN `jenis` ENUM('tugas', 'uts', 'uas', 'praktikum') NOT NULL DEFAULT 'tugas';

-- AlterTable
ALTER TABLE `Yudisium` ADD COLUMN `feederId` VARCHAR(191) NULL,
    ADD COLUMN `lastSyncedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `BobotNilaiKelas` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `bobotTugas` DOUBLE NOT NULL DEFAULT 20,
    `bobotUts` DOUBLE NOT NULL DEFAULT 30,
    `bobotUas` DOUBLE NOT NULL DEFAULT 40,
    `bobotPraktikum` DOUBLE NOT NULL DEFAULT 0,
    `bobotKehadiran` DOUBLE NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BobotNilaiKelas_kelasId_key`(`kelasId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KonfigurasiSkalaNilai` (
    `id` VARCHAR(191) NOT NULL,
    `minA` DOUBLE NOT NULL DEFAULT 85,
    `minAB` DOUBLE NOT NULL DEFAULT 75,
    `minB` DOUBLE NOT NULL DEFAULT 70,
    `minBC` DOUBLE NOT NULL DEFAULT 65,
    `minC` DOUBLE NOT NULL DEFAULT 56,
    `minD` DOUBLE NOT NULL DEFAULT 40,
    `bobotA` DOUBLE NOT NULL DEFAULT 4.0,
    `bobotAB` DOUBLE NOT NULL DEFAULT 3.5,
    `bobotB` DOUBLE NOT NULL DEFAULT 3.0,
    `bobotBC` DOUBLE NOT NULL DEFAULT 2.5,
    `bobotC` DOUBLE NOT NULL DEFAULT 2.0,
    `bobotD` DOUBLE NOT NULL DEFAULT 1.0,
    `bobotE` DOUBLE NOT NULL DEFAULT 0.0,
    `hurufA` VARCHAR(191) NOT NULL DEFAULT 'A',
    `hurufAB` VARCHAR(191) NOT NULL DEFAULT 'AB',
    `hurufB` VARCHAR(191) NOT NULL DEFAULT 'B',
    `hurufBC` VARCHAR(191) NOT NULL DEFAULT 'BC',
    `hurufC` VARCHAR(191) NOT NULL DEFAULT 'C',
    `hurufD` VARCHAR(191) NOT NULL DEFAULT 'D',
    `hurufE` VARCHAR(191) NOT NULL DEFAULT 'E',
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_agama` (
    `kode` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`kode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_jenis_tinggal` (
    `kode` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`kode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_alat_transportasi` (
    `kode` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`kode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_jalur_masuk` (
    `kode` VARCHAR(20) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`kode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrangTuaMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `jenis` ENUM('ayah', 'ibu', 'wali') NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(16) NULL,
    `tahunLahir` INTEGER NULL,
    `pendidikan` VARCHAR(191) NULL,
    `pekerjaan` VARCHAR(191) NULL,
    `penghasilan` DECIMAL(15, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrangTuaMahasiswa_mahasiswaId_idx`(`mahasiswaId`),
    UNIQUE INDEX `OrangTuaMahasiswa_mahasiswaId_jenis_key`(`mahasiswaId`, `jenis`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AktivitasKuliahMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `status` ENUM('aktif', 'cuti', 'non_aktif', 'kampus_merdeka', 'mengundurkan_diri', 'lulus', 'drop_out') NOT NULL DEFAULT 'aktif',
    `ips` DOUBLE NULL,
    `ipk` DOUBLE NULL,
    `sksSemester` INTEGER NULL,
    `sksTotal` INTEGER NULL,
    `biayaKuliah` DECIMAL(15, 2) NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AktivitasKuliahMahasiswa_feederId_key`(`feederId`),
    INDEX `AktivitasKuliahMahasiswa_semesterId_idx`(`semesterId`),
    INDEX `AktivitasKuliahMahasiswa_status_idx`(`status`),
    UNIQUE INDEX `AktivitasKuliahMahasiswa_mahasiswaId_semesterId_key`(`mahasiswaId`, `semesterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KomponenEvaluasiKelas` (
    `id` VARCHAR(191) NOT NULL,
    `kelasId` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jenis` ENUM('tugas', 'uts', 'uas', 'quiz', 'praktikum', 'kehadiran', 'proyek', 'presentasi', 'laporan', 'case_method', 'team_based_project', 'lainnya') NOT NULL,
    `bobotPersen` DOUBLE NOT NULL,
    `deskripsi` TEXT NULL,
    `metodeCaseMethod` BOOLEAN NOT NULL DEFAULT false,
    `metodeTeamBased` BOOLEAN NOT NULL DEFAULT false,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KomponenEvaluasiKelas_feederId_key`(`feederId`),
    INDEX `KomponenEvaluasiKelas_kelasId_idx`(`kelasId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NilaiKomponenEvaluasi` (
    `id` VARCHAR(191) NOT NULL,
    `komponenEvaluasiId` VARCHAR(191) NOT NULL,
    `krsId` VARCHAR(191) NOT NULL,
    `nilai` DOUBLE NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NilaiKomponenEvaluasi_feederId_key`(`feederId`),
    INDEX `NilaiKomponenEvaluasi_krsId_idx`(`krsId`),
    UNIQUE INDEX `NilaiKomponenEvaluasi_komponenEvaluasiId_krsId_key`(`komponenEvaluasiId`, `krsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AktivitasMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `jenis` ENUM('pertukaran_pelajar', 'magang', 'asistensi_mengajar', 'riset', 'pengabdian_masyarakat', 'kewirausahaan', 'proyek_independen', 'proyek_kemanusiaan', 'bela_negara', 'kkn_tematik', 'kerja_praktek', 'studi_independen', 'ppl', 'lainnya') NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `lokasi` VARCHAR(191) NULL,
    `mitra` VARCHAR(191) NULL,
    `isMbkm` BOOLEAN NOT NULL DEFAULT false,
    `isFlagship` BOOLEAN NOT NULL DEFAULT false,
    `isEksternal` BOOLEAN NOT NULL DEFAULT false,
    `linkProposal` TEXT NULL,
    `linkLaporan` TEXT NULL,
    `linkSertifikat` TEXT NULL,
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `status` ENUM('diajukan', 'berjalan', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'diajukan',
    `catatan` TEXT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AktivitasMahasiswa_feederId_key`(`feederId`),
    INDEX `AktivitasMahasiswa_semesterId_idx`(`semesterId`),
    INDEX `AktivitasMahasiswa_jenis_idx`(`jenis`),
    INDEX `AktivitasMahasiswa_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PesertaAktivitas` (
    `id` VARCHAR(191) NOT NULL,
    `aktivitasId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `peran` VARCHAR(191) NULL,
    `konversiSks` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PesertaAktivitas_mahasiswaId_idx`(`mahasiswaId`),
    UNIQUE INDEX `PesertaAktivitas_aktivitasId_mahasiswaId_key`(`aktivitasId`, `mahasiswaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PembimbingAktivitas` (
    `id` VARCHAR(191) NOT NULL,
    `aktivitasId` VARCHAR(191) NOT NULL,
    `dosenId` VARCHAR(191) NOT NULL,
    `peran` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PembimbingAktivitas_dosenId_idx`(`dosenId`),
    UNIQUE INDEX `PembimbingAktivitas_aktivitasId_dosenId_key`(`aktivitasId`, `dosenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DayaTampungProdi` (
    `id` VARCHAR(191) NOT NULL,
    `prodiId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `dayaTampung` INTEGER NOT NULL,
    `jumlahDaftar` INTEGER NULL,
    `jumlahLulusSeleksi` INTEGER NULL,
    `jumlahRegistrasi` INTEGER NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DayaTampungProdi_feederId_key`(`feederId`),
    INDEX `DayaTampungProdi_semesterId_idx`(`semesterId`),
    UNIQUE INDEX `DayaTampungProdi_prodiId_semesterId_key`(`prodiId`, `semesterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MahasiswaInbound` (
    `id` VARCHAR(191) NOT NULL,
    `namaMahasiswa` VARCHAR(191) NOT NULL,
    `nimAsal` VARCHAR(191) NOT NULL,
    `ptAsal` VARCHAR(191) NOT NULL,
    `kodeProdiAsal` VARCHAR(191) NULL,
    `prodiTujuanId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `jenisAktivitas` ENUM('pertukaran_pelajar', 'magang', 'asistensi_mengajar', 'riset', 'pengabdian_masyarakat', 'kewirausahaan', 'proyek_independen', 'proyek_kemanusiaan', 'bela_negara', 'kkn_tematik', 'kerja_praktek', 'studi_independen', 'ppl', 'lainnya') NOT NULL DEFAULT 'pertukaran_pelajar',
    `tanggalMulai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `status` ENUM('diajukan', 'berjalan', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'diajukan',
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MahasiswaInbound_feederId_key`(`feederId`),
    INDEX `MahasiswaInbound_prodiTujuanId_idx`(`prodiTujuanId`),
    INDEX `MahasiswaInbound_semesterId_idx`(`semesterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NilaiTransfer` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `mataKuliahId` VARCHAR(191) NOT NULL,
    `kodeMkAsal` VARCHAR(191) NULL,
    `namaMkAsal` VARCHAR(191) NULL,
    `sksAsal` INTEGER NULL,
    `nilaiHurufAsal` VARCHAR(191) NULL,
    `nilaiHurufAkui` VARCHAR(191) NOT NULL,
    `bobotAkui` DOUBLE NULL,
    `sksAkui` INTEGER NOT NULL,
    `sumber` ENUM('pindahan_pt', 'mbkm', 'rpl', 'konversi_internal', 'lainnya') NOT NULL DEFAULT 'pindahan_pt',
    `catatan` TEXT NULL,
    `feederId` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NilaiTransfer_feederId_key`(`feederId`),
    INDEX `NilaiTransfer_mahasiswaId_idx`(`mahasiswaId`),
    INDEX `NilaiTransfer_mataKuliahId_idx`(`mataKuliahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Mahasiswa_nik_idx` ON `Mahasiswa`(`nik`);

-- CreateIndex
CREATE UNIQUE INDEX `Yudisium_feederId_key` ON `Yudisium`(`feederId`);

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_agamaKode_fkey` FOREIGN KEY (`agamaKode`) REFERENCES `ref_agama`(`kode`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_jenisTinggalKode_fkey` FOREIGN KEY (`jenisTinggalKode`) REFERENCES `ref_jenis_tinggal`(`kode`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_alatTransportasiKode_fkey` FOREIGN KEY (`alatTransportasiKode`) REFERENCES `ref_alat_transportasi`(`kode`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_jalurMasukKode_fkey` FOREIGN KEY (`jalurMasukKode`) REFERENCES `ref_jalur_masuk`(`kode`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_agamaKode_fkey` FOREIGN KEY (`agamaKode`) REFERENCES `ref_agama`(`kode`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Akademik` ADD CONSTRAINT `Akademik_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BobotNilaiKelas` ADD CONSTRAINT `BobotNilaiKelas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrangTuaMahasiswa` ADD CONSTRAINT `OrangTuaMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AktivitasKuliahMahasiswa` ADD CONSTRAINT `AktivitasKuliahMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AktivitasKuliahMahasiswa` ADD CONSTRAINT `AktivitasKuliahMahasiswa_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KomponenEvaluasiKelas` ADD CONSTRAINT `KomponenEvaluasiKelas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NilaiKomponenEvaluasi` ADD CONSTRAINT `NilaiKomponenEvaluasi_komponenEvaluasiId_fkey` FOREIGN KEY (`komponenEvaluasiId`) REFERENCES `KomponenEvaluasiKelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NilaiKomponenEvaluasi` ADD CONSTRAINT `NilaiKomponenEvaluasi_krsId_fkey` FOREIGN KEY (`krsId`) REFERENCES `Krs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AktivitasMahasiswa` ADD CONSTRAINT `AktivitasMahasiswa_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PesertaAktivitas` ADD CONSTRAINT `PesertaAktivitas_aktivitasId_fkey` FOREIGN KEY (`aktivitasId`) REFERENCES `AktivitasMahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PesertaAktivitas` ADD CONSTRAINT `PesertaAktivitas_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PembimbingAktivitas` ADD CONSTRAINT `PembimbingAktivitas_aktivitasId_fkey` FOREIGN KEY (`aktivitasId`) REFERENCES `AktivitasMahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PembimbingAktivitas` ADD CONSTRAINT `PembimbingAktivitas_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DayaTampungProdi` ADD CONSTRAINT `DayaTampungProdi_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DayaTampungProdi` ADD CONSTRAINT `DayaTampungProdi_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MahasiswaInbound` ADD CONSTRAINT `MahasiswaInbound_prodiTujuanId_fkey` FOREIGN KEY (`prodiTujuanId`) REFERENCES `Prodi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MahasiswaInbound` ADD CONSTRAINT `MahasiswaInbound_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `Semester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NilaiTransfer` ADD CONSTRAINT `NilaiTransfer_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NilaiTransfer` ADD CONSTRAINT `NilaiTransfer_mataKuliahId_fkey` FOREIGN KEY (`mataKuliahId`) REFERENCES `MataKuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

