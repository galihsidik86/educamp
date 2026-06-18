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
  d3: '20', d4: '23', s1: '30', s2: '35', s3: '40', profesi: '60',
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
 * Bentuk payload mahasiswa standar yang dipush ke Feeder.
 * Sesuaikan field name dengan yang diharapkan Neo Feeder kampus.
 */
export function mapMahasiswaToFeeder(m: {
  nim: string; nama: string; jenisKelamin: 'L' | 'P';
  tempatLahir: string | null; tanggalLahir: Date | null;
  angkatan: number; status: string;
  prodi: { kode: string; jenjang: string };
  feederId?: string | null;
}) {
  return {
    id_mahasiswa: m.feederId ?? null,
    nim: m.nim,
    nama_mahasiswa: m.nama,
    jenis_kelamin: jenisKelaminToPddikti[m.jenisKelamin] ?? null,
    tempat_lahir: m.tempatLahir,
    tanggal_lahir: m.tanggalLahir ? toIsoDate(m.tanggalLahir) : null,
    id_prodi: m.prodi.kode,
    id_jenjang_pendidikan: jenjangToPddikti[m.prodi.jenjang] ?? null,
    tahun_masuk: m.angkatan,
    id_status_mahasiswa: statusMahasiswaToPddikti[m.status] ?? 'A',
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
