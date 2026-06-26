// ============================================================
// Mapping enum SIAKAD ↔ kode PDDikti / Neo Feeder.
// Referensi kode: https://pddikti.kemdikbud.go.id (skema dapodik).
// Catatan: mapping ini berdasarkan pemahaman umum sampai Jan 2026.
// Verifikasi terhadap dokumentasi Feeder kampus sebelum production.
// ============================================================

// Status mahasiswa (PDDikti gunakan kode huruf)
export const statusMahasiswaToPddikti: Record<string, string> = {
  aktif: 'A',
  cuti: 'C',
  lulus: 'L',
  drop_out: 'D',
  mengundurkan_diri: 'K',
};
export const statusMahasiswaFromPddikti: Record<string, string> = Object.fromEntries(
  Object.entries(statusMahasiswaToPddikti).map(([k, v]) => [v, k]),
);

// Jenis kelamin
export const jenisKelaminToPddikti: Record<string, string> = { L: '1', P: '2' };

// Jenjang (PDDikti angka)
export const jenjangToPddikti: Record<string, string> = {
  d3: '20', d4: '23', s1: '30', s2: '35', s3: '40',
  profesi: '60', ppg: '65', sp1: '70', sp2: '75',
};

// Jenis pendaftaran (Phase 2)
// PDDikti gunakan kode angka: 1=baru reguler, 2=pindahan, 3=lanjutan, dst.
export const jenisPendaftaranToPddikti: Record<string, string> = {
  baru: '1',
  pindahan: '2',
  lanjutan: '3',
  ppg: '4',
  transfer: '5',
  rpl: '6',
};

// Status AKM (kode huruf PDDikti)
export const statusAkmToPddikti: Record<string, string> = {
  aktif: 'A',
  cuti: 'C',
  non_aktif: 'N',
  kampus_merdeka: 'K',
  mengundurkan_diri: 'U',
  lulus: 'L',
  drop_out: 'D',
};

// Status aktivitas mhs PDDikti
export const statusAktivitasMhsToPddikti: Record<string, string> = {
  diajukan: 'P',  // pending
  berjalan: 'B',
  selesai: 'S',
  dibatalkan: 'X',
};

// Jenis aktivitas mahasiswa → kode PDDikti (sesuai mapping MBKM Kemdikbud)
export const jenisAktivitasToPddikti: Record<string, string> = {
  pertukaran_pelajar: '1',
  magang: '2',
  asistensi_mengajar: '3',
  riset: '4',
  pengabdian_masyarakat: '5',
  kewirausahaan: '6',
  proyek_independen: '7',
  proyek_kemanusiaan: '8',
  bela_negara: '9',
  kkn_tematik: '10',
  kerja_praktek: '11',
  studi_independen: '12',
  ppl: '13',
  lainnya: '99',
};

// Metode pembelajaran
export const metodePembelajaranToPddikti: Record<string, string> = {
  tatap_muka: '1',
  daring: '2',
  blended: '3',
};

// Jenis komponen evaluasi
export const jenisKomponenEvaluasiToPddikti: Record<string, string> = {
  tugas: 'TGS',
  uts: 'UTS',
  uas: 'UAS',
  quiz: 'QZ',
  praktikum: 'PRK',
  kehadiran: 'KHD',
  proyek: 'PRJ',
  presentasi: 'PRS',
  laporan: 'LPR',
  case_method: 'CM',
  team_based_project: 'TBP',
  lainnya: 'LNY',
};

// Sumber nilai transfer
export const sumberNilaiTransferToPddikti: Record<string, string> = {
  pindahan_pt: '1',
  mbkm: '2',
  rpl: '3',
  konversi_internal: '4',
  lainnya: '99',
};

// Jabatan fungsional dosen
export const jabatanFungsionalToPddikti: Record<string, string> = {
  tenaga_pengajar: '99',
  asisten_ahli: '301',
  lektor: '302',
  lektor_kepala: '303',
  guru_besar: '304',
};

// Jenis MK
export const jenisMkToPddikti: Record<string, string> = {
  wajib_universitas: 'A',
  wajib_prodi: 'B',
  pilihan: 'C',
};

// Status KRS → kode AKM (Aktivitas Kuliah Mahasiswa)
export const statusKrsToPddikti: Record<string, string> = {
  draft: 'D',
  diajukan: 'P',
  disetujui: 'A',
  ditolak: 'T',
};

// Huruf nilai → bobot (sudah lokal); PDDikti pakai huruf langsung
export const nilaiHurufValid = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'];

/**
 * Bentuk payload mahasiswa standar yang dipush ke Feeder — Phase 1 lengkap.
 * Field PDDikti tambahan: NIK, NISN, agama, asal sekolah, jalur masuk, dst.
 * Sesuaikan nama field dengan yang diharapkan Neo Feeder kampus.
 */
export function mapMahasiswaToFeeder(m: {
  nim: string; nama: string; jenisKelamin: 'L' | 'P';
  tempatLahir: string | null; tanggalLahir: Date | null;
  alamat: string | null; telepon: string | null;
  angkatan: number; status: string;
  prodi: { kode: string; jenjang: string };
  feederId?: string | null;
  // Phase 1 biodata
  nik?: string | null;
  nisn?: string | null;
  npsn?: string | null;
  namaSekolahAsal?: string | null;
  jenisSekolahAsal?: string | null;
  tahunLulusSekolah?: number | null;
  kewarganegaraan?: string | null;
  kodeWilayahAlamat?: string | null;
  pembiayaan?: string | null;
  kebutuhanKhusus?: string | null;
  semesterAwal?: string | null;
  agamaKode?: number | null;
  jenisTinggalKode?: number | null;
  alatTransportasiKode?: number | null;
  jalurMasukKode?: string | null;
  // Phase 2
  jenisPendaftaran?: string | null;
  tanggalMasuk?: Date | null;
  orangTua?: Array<{ jenis: string; nama: string; nik: string | null; tahunLahir: number | null; pendidikan: string | null; pekerjaan: string | null; penghasilan: unknown | null }>;
}) {
  const ortuByJenis = (j: string) => m.orangTua?.find((o) => o.jenis === j);
  const ayah = ortuByJenis('ayah');
  const ibu = ortuByJenis('ibu');
  const wali = ortuByJenis('wali');
  return {
    id_mahasiswa: m.feederId ?? null,
    nim: m.nim,
    nama_mahasiswa: m.nama,
    jenis_kelamin: jenisKelaminToPddikti[m.jenisKelamin] ?? null,
    tempat_lahir: m.tempatLahir,
    tanggal_lahir: m.tanggalLahir ? toIsoDate(m.tanggalLahir) : null,
    nik: m.nik ?? null,
    nisn: m.nisn ?? null,
    id_agama: m.agamaKode ?? null,
    id_kebutuhan_khusus: m.kebutuhanKhusus ?? null,
    kewarganegaraan: m.kewarganegaraan ?? 'Indonesia',
    alamat: m.alamat,
    telepon: m.telepon,
    id_wilayah: m.kodeWilayahAlamat ?? null,
    id_jenis_tinggal: m.jenisTinggalKode ?? null,
    id_alat_transportasi: m.alatTransportasiKode ?? null,
    id_prodi: m.prodi.kode,
    id_jenjang_pendidikan: jenjangToPddikti[m.prodi.jenjang] ?? null,
    tahun_masuk: m.angkatan,
    semester_awal: m.semesterAwal ?? null,
    id_status_mahasiswa: statusMahasiswaToPddikti[m.status] ?? 'A',
    id_jalur_masuk: m.jalurMasukKode ?? null,
    id_jenis_daftar: m.jenisPendaftaran ? jenisPendaftaranToPddikti[m.jenisPendaftaran] ?? '1' : '1',
    tanggal_daftar: m.tanggalMasuk ? toIsoDate(m.tanggalMasuk) : null,
    id_pembiayaan: m.pembiayaan ?? null,
    // Asal sekolah
    npsn: m.npsn ?? null,
    nama_sekolah: m.namaSekolahAsal ?? null,
    jenis_sekolah: m.jenisSekolahAsal ?? null,
    tahun_lulus_sekolah: m.tahunLulusSekolah ?? null,
    // Orang tua
    nama_ayah: ayah?.nama ?? null,
    nik_ayah: ayah?.nik ?? null,
    tahun_lahir_ayah: ayah?.tahunLahir ?? null,
    pendidikan_ayah: ayah?.pendidikan ?? null,
    pekerjaan_ayah: ayah?.pekerjaan ?? null,
    penghasilan_ayah: ayah?.penghasilan ?? null,
    nama_ibu: ibu?.nama ?? null,
    nik_ibu: ibu?.nik ?? null,
    tahun_lahir_ibu: ibu?.tahunLahir ?? null,
    pendidikan_ibu: ibu?.pendidikan ?? null,
    pekerjaan_ibu: ibu?.pekerjaan ?? null,
    penghasilan_ibu: ibu?.penghasilan ?? null,
    nama_wali: wali?.nama ?? null,
    pekerjaan_wali: wali?.pekerjaan ?? null,
    penghasilan_wali: wali?.penghasilan ?? null,
  };
}

/**
 * Bentuk payload dosen — Phase 1 lengkap.
 */
export function mapDosenToFeeder(d: {
  nidn: string; nama: string;
  gelarDepan: string | null; gelarBelakang: string | null;
  jabatanFungsional: string | null;
  jabatanStruktural: string | null;
  prodi: { kode: string };
  feederId?: string | null;
  // Phase 1
  nik?: string | null;
  nip?: string | null;
  nuk?: string | null;
  statusKepegawaian?: string | null;
  statusKeaktifan?: string | null;
  pendidikanTerakhirJenjang?: string | null;
  pendidikanTerakhirGelar?: string | null;
  pendidikanTerakhirTahunLulus?: number | null;
  pendidikanTerakhirBidang?: string | null;
  pangkatGolongan?: string | null;
  tanggalMulaiKerja?: Date | null;
  serdosStatus?: boolean | null;
  serdosTanggal?: Date | null;
  agamaKode?: number | null;
}) {
  return {
    id_dosen: d.feederId ?? null,
    nidn: d.nidn,
    nama_dosen: d.nama,
    nik: d.nik ?? null,
    nip: d.nip ?? null,
    nuk: d.nuk ?? null,
    gelar_depan: d.gelarDepan,
    gelar_belakang: d.gelarBelakang,
    id_agama: d.agamaKode ?? null,
    id_prodi_homebase: d.prodi.kode,
    id_jabatan_fungsional: d.jabatanFungsional ? jabatanFungsionalToPddikti[d.jabatanFungsional] ?? null : null,
    jabatan_struktural: d.jabatanStruktural,
    status_kepegawaian: d.statusKepegawaian ?? null,
    status_keaktifan: d.statusKeaktifan ?? 'aktif',
    pangkat_golongan: d.pangkatGolongan ?? null,
    tanggal_mulai_kerja: d.tanggalMulaiKerja ? toIsoDate(d.tanggalMulaiKerja) : null,
    pendidikan_terakhir_jenjang: d.pendidikanTerakhirJenjang ?? null,
    pendidikan_terakhir_gelar: d.pendidikanTerakhirGelar ?? null,
    pendidikan_terakhir_tahun_lulus: d.pendidikanTerakhirTahunLulus ?? null,
    pendidikan_terakhir_bidang: d.pendidikanTerakhirBidang ?? null,
    serdos_status: d.serdosStatus ?? false,
    serdos_tanggal: d.serdosTanggal ? toIsoDate(d.serdosTanggal) : null,
  };
}

/**
 * Bentuk payload mata kuliah.
 */
export function mapMataKuliahToFeeder(mk: {
  kode: string; nama: string; namaInggris: string | null;
  sks: number; sksTeori: number; sksPraktik: number;
  sksLapangan?: number; sksSimulasi?: number;
  jenis: string;
  prodi: { kode: string };
  // Phase 2
  linkRps?: string | null;
  bidangIlmu?: string | null;
  kelompokMatkul?: string | null;
  deskripsi?: string | null;
  feederId?: string | null;
}) {
  return {
    id_mata_kuliah: mk.feederId ?? null,
    kode_mata_kuliah: mk.kode,
    nama_mata_kuliah: mk.nama,
    nama_inggris: mk.namaInggris,
    sks_mata_kuliah: mk.sks,
    sks_tatap_muka: mk.sksTeori,
    sks_praktek: mk.sksPraktik,
    sks_praktek_lapangan: mk.sksLapangan ?? 0,
    sks_simulasi: mk.sksSimulasi ?? 0,
    jenis_mata_kuliah: jenisMkToPddikti[mk.jenis] ?? 'B',
    id_prodi: mk.prodi.kode,
    link_rps: mk.linkRps ?? null,
    bidang_ilmu: mk.bidangIlmu ?? null,
    kelompok_mata_kuliah: mk.kelompokMatkul ?? null,
    deskripsi_mk: mk.deskripsi ?? null,
  };
}

/**
 * Bentuk payload kelas (matakuliah-semester instance).
 */
export function mapKelasToFeeder(k: {
  kodeKelas: string;
  kapasitas: number;
  hari: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  metodePembelajaran?: string | null;
  mataKuliah: { feederId: string | null; kode: string };
  dosen: { feederId: string | null; nidn: string };
  semester: { kode: string };
  ruangan: { kode: string } | null;
  _count?: { krs: number };
  feederId?: string | null;
}) {
  return {
    id_kelas: k.feederId ?? null,
    nama_kelas: k.kodeKelas,
    id_mata_kuliah: k.mataKuliah.feederId,
    kode_mata_kuliah: k.mataKuliah.kode,
    id_dosen: k.dosen.feederId,
    nidn_dosen: k.dosen.nidn,
    id_semester: k.semester.kode,
    kapasitas: k.kapasitas,
    jumlah_peserta: k._count?.krs ?? 0,
    hari: k.hari,
    jam_mulai: k.jamMulai,
    jam_selesai: k.jamSelesai,
    kode_ruangan: k.ruangan?.kode ?? null,
    metode_pembelajaran: k.metodePembelajaran ? metodePembelajaranToPddikti[k.metodePembelajaran] ?? '1' : '1',
  };
}

/**
 * Bentuk payload yudisium/kelulusan.
 */
export function mapYudisiumToFeeder(y: {
  mahasiswa: { feederId: string | null; nim: string };
  tanggalLulus: Date | null;
  ipk: number;
  sksLulus: number;
  predikat: string | null;
  noIjazah: string | null;
  noSkl: string | null;
  feederId?: string | null;
}) {
  return {
    id_lulusan: y.feederId ?? null,
    id_mahasiswa: y.mahasiswa.feederId,
    nim: y.mahasiswa.nim,
    tanggal_lulus: y.tanggalLulus ? toIsoDate(y.tanggalLulus) : null,
    ipk_lulus: y.ipk,
    sks_lulus: y.sksLulus,
    predikat: y.predikat,
    nomor_ijazah: y.noIjazah,
    nomor_skl: y.noSkl,
  };
}

/**
 * Payload KRS: aktivitas kuliah mahasiswa per kelas semester.
 */
export function mapKrsToFeeder(k: {
  feederId?: string | null;
  mahasiswa: { feederId: string | null; nim: string };
  kelas: { feederId: string | null; kodeKelas: string };
  semester: { kode: string };
  status: string;
}) {
  return {
    id_aktivitas_kuliah_mahasiswa: k.feederId ?? null,
    id_mahasiswa: k.mahasiswa.feederId,
    nim: k.mahasiswa.nim,
    id_kelas: k.kelas.feederId,
    kode_kelas: k.kelas.kodeKelas,
    id_semester: k.semester.kode,
    status_krs: statusKrsToPddikti[k.status] ?? 'D',
  };
}

/**
 * Payload Nilai akhir per KRS.
 */
export function mapNilaiToFeeder(n: {
  feederId?: string | null;
  krs: { feederId: string | null };
  nilaiAngka: number | null;
  nilaiHuruf: string | null;
  bobot: number | null;
}) {
  return {
    id_nilai: n.feederId ?? null,
    id_aktivitas_kuliah_mahasiswa: n.krs.feederId,
    nilai_angka: n.nilaiAngka,
    nilai_huruf: n.nilaiHuruf && nilaiHurufValid.includes(n.nilaiHuruf) ? n.nilaiHuruf : null,
    nilai_indeks: n.bobot,
  };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Phase 2 mappers — AKM, komponen evaluasi, aktivitas mhs,
// daya tampung, mahasiswa inbound, nilai transfer.
// ============================================================

/** AKM (Aktivitas Kuliah Mahasiswa) per semester. */
export function mapAkmToFeeder(a: {
  feederId?: string | null;
  mahasiswa: { feederId: string | null; nim: string };
  semester: { kode: string };
  status: string;
  ips: number | null;
  ipk: number | null;
  sksSemester: number | null;
  sksTotal: number | null;
  biayaKuliah: unknown | null;
}) {
  return {
    id_aktivitas_kuliah_mahasiswa: a.feederId ?? null,
    id_mahasiswa: a.mahasiswa.feederId,
    nim: a.mahasiswa.nim,
    id_semester: a.semester.kode,
    id_status_mahasiswa: statusAkmToPddikti[a.status] ?? 'A',
    ips: a.ips,
    ipk: a.ipk,
    sks_semester: a.sksSemester,
    total_sks: a.sksTotal,
    biaya_kuliah: a.biayaKuliah,
  };
}

/** Komponen evaluasi kelas — NeoFeeder 2.3+. */
export function mapKomponenEvaluasiToFeeder(k: {
  feederId?: string | null;
  kelas: { feederId: string | null };
  nama: string;
  jenis: string;
  bobotPersen: number;
  deskripsi: string | null;
  metodeCaseMethod: boolean;
  metodeTeamBased: boolean;
  urutan: number;
}) {
  return {
    id_komponen_evaluasi: k.feederId ?? null,
    id_kelas: k.kelas.feederId,
    nama_komponen: k.nama,
    jenis_komponen: jenisKomponenEvaluasiToPddikti[k.jenis] ?? 'LNY',
    bobot_persen: k.bobotPersen,
    deskripsi: k.deskripsi,
    metode_case_method: k.metodeCaseMethod,
    metode_team_based_project: k.metodeTeamBased,
    urutan: k.urutan,
  };
}

/** Nilai per komponen evaluasi per mahasiswa (krs). */
export function mapNilaiKomponenToFeeder(n: {
  feederId?: string | null;
  komponenEvaluasi: { feederId: string | null };
  krs: { feederId: string | null };
  nilai: number | null;
}) {
  return {
    id_nilai_komponen: n.feederId ?? null,
    id_komponen_evaluasi: n.komponenEvaluasi.feederId,
    id_aktivitas_kuliah_mahasiswa: n.krs.feederId,
    nilai: n.nilai,
  };
}

/** Aktivitas mahasiswa (MBKM / Pertukaran / Magang / Riset / dst). */
export function mapAktivitasToFeeder(a: {
  feederId?: string | null;
  jenis: string;
  nama: string;
  deskripsi: string | null;
  semester: { kode: string };
  lokasi: string | null;
  mitra: string | null;
  isMbkm: boolean;
  isFlagship: boolean;
  isEksternal: boolean;
  linkProposal: string | null;
  linkLaporan: string | null;
  linkSertifikat: string | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  status: string;
  peserta?: Array<{ mahasiswa: { feederId: string | null; nim: string }; peran: string | null; konversiSks: number | null }>;
  pembimbing?: Array<{ dosen: { feederId: string | null; nidn: string }; peran: string | null }>;
}) {
  return {
    id_aktivitas: a.feederId ?? null,
    id_jenis_aktivitas: jenisAktivitasToPddikti[a.jenis] ?? '99',
    nama_aktivitas: a.nama,
    deskripsi: a.deskripsi,
    id_semester: a.semester.kode,
    lokasi: a.lokasi,
    nama_mitra: a.mitra,
    is_mbkm: a.isMbkm,
    is_flagship: a.isFlagship,
    is_eksternal: a.isEksternal,
    link_proposal: a.linkProposal,
    link_laporan: a.linkLaporan,
    link_sertifikat: a.linkSertifikat,
    tanggal_mulai: a.tanggalMulai ? toIsoDate(a.tanggalMulai) : null,
    tanggal_selesai: a.tanggalSelesai ? toIsoDate(a.tanggalSelesai) : null,
    status: statusAktivitasMhsToPddikti[a.status] ?? 'P',
    peserta: a.peserta?.map((p) => ({
      id_mahasiswa: p.mahasiswa.feederId,
      nim: p.mahasiswa.nim,
      peran: p.peran,
      konversi_sks: p.konversiSks,
    })) ?? [],
    pembimbing: a.pembimbing?.map((p) => ({
      id_dosen: p.dosen.feederId,
      nidn: p.dosen.nidn,
      peran: p.peran,
    })) ?? [],
  };
}

/** Daya tampung prodi per periode (semester awal). */
export function mapDayaTampungToFeeder(d: {
  feederId?: string | null;
  prodi: { kode: string };
  semester: { kode: string };
  dayaTampung: number;
  jumlahDaftar: number | null;
  jumlahLulusSeleksi: number | null;
  jumlahRegistrasi: number | null;
}) {
  return {
    id_daya_tampung: d.feederId ?? null,
    id_prodi: d.prodi.kode,
    id_semester: d.semester.kode,
    daya_tampung: d.dayaTampung,
    jumlah_pendaftar: d.jumlahDaftar,
    jumlah_lulus_seleksi: d.jumlahLulusSeleksi,
    jumlah_registrasi: d.jumlahRegistrasi,
  };
}

/** Mahasiswa inbound (PT lain → Tazkia). */
export function mapMahasiswaInboundToFeeder(m: {
  feederId?: string | null;
  namaMahasiswa: string;
  nimAsal: string;
  ptAsal: string;
  kodeProdiAsal: string | null;
  prodiTujuan: { kode: string };
  semester: { kode: string };
  jenisAktivitas: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  status: string;
}) {
  return {
    id_mahasiswa_inbound: m.feederId ?? null,
    nama_mahasiswa: m.namaMahasiswa,
    nim_asal: m.nimAsal,
    nama_pt_asal: m.ptAsal,
    id_prodi_asal: m.kodeProdiAsal,
    id_prodi_tujuan: m.prodiTujuan.kode,
    id_semester: m.semester.kode,
    id_jenis_aktivitas: jenisAktivitasToPddikti[m.jenisAktivitas] ?? '1',
    tanggal_mulai: m.tanggalMulai ? toIsoDate(m.tanggalMulai) : null,
    tanggal_selesai: m.tanggalSelesai ? toIsoDate(m.tanggalSelesai) : null,
    status: statusAktivitasMhsToPddikti[m.status] ?? 'P',
  };
}

/** Nilai transfer / konversi (pindahan / MBKM / RPL). */
export function mapNilaiTransferToFeeder(n: {
  feederId?: string | null;
  mahasiswa: { feederId: string | null; nim: string };
  mataKuliah: { feederId: string | null; kode: string };
  kodeMkAsal: string | null;
  namaMkAsal: string | null;
  sksAsal: number | null;
  nilaiHurufAsal: string | null;
  nilaiHurufAkui: string;
  bobotAkui: number | null;
  sksAkui: number;
  sumber: string;
  catatan: string | null;
}) {
  return {
    id_nilai_transfer: n.feederId ?? null,
    id_mahasiswa: n.mahasiswa.feederId,
    nim: n.mahasiswa.nim,
    id_mata_kuliah: n.mataKuliah.feederId,
    kode_mata_kuliah: n.mataKuliah.kode,
    kode_mk_asal: n.kodeMkAsal,
    nama_mk_asal: n.namaMkAsal,
    sks_asal: n.sksAsal,
    nilai_huruf_asal: n.nilaiHurufAsal,
    nilai_huruf_diakui: n.nilaiHurufAkui,
    bobot_diakui: n.bobotAkui,
    sks_diakui: n.sksAkui,
    id_sumber: sumberNilaiTransferToPddikti[n.sumber] ?? '99',
    catatan: n.catatan,
  };
}
