import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiGet, apiPost, api } from './api';

// ============================================================
// Generic helpers
// ============================================================

export function useApi<T>(key: readonly unknown[], path: string, opts?: Partial<UseQueryOptions<T>>) {
  return useQuery<T>({ queryKey: key, queryFn: () => apiGet<T>(path), ...opts });
}

// ============================================================
// Mahasiswa endpoints
// ============================================================

export type DashboardData = {
  semester: { kode: string; nama: string; krsSelesai: string | null };
  ipSemester: number;
  ipk: number;
  sksAmbil: number;
  sksLulus: number;
  tagihanTotal: number;
  tagihanCount: number;
  jadwalHariIni: Array<{ kode: string; nama: string; jamMulai: string | null; jamSelesai: string | null; kodeKelas: string }>;
  pengumuman: Array<{ id: string; judul: string; isi: string; tanggal: string; isPenting: boolean }>;
  today: string;
};
export const useDashboard = () => useApi<DashboardData>(['dashboard'], '/mahasiswa/dashboard');

export type KrsKelas = {
  id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  dosen: string; ruangan: string | null;
  hari: string | null; jamMulai: string | null; jamSelesai: string | null;
  kapasitas: number; terisi: number;
};
export type Penawaran = {
  semester: { kode: string; jenis: string; krsSelesai: string | null };
  kelas: KrsKelas[];
};
export const usePenawaran = () => useApi<Penawaran>(['krs', 'penawaran'], '/mahasiswa/krs/penawaran');

export type KrsItem = {
  id: string; status: 'draft' | 'diajukan' | 'disetujui' | 'ditolak';
  catatan: string | null;
  kelas: Omit<KrsKelas, 'kapasitas' | 'terisi'>;
};
export type KrsCurrent = {
  semester: {
    kode: string;
    krsMulai: string | null; krsSelesai: string | null;
    prsMulai: string | null; prsSelesai: string | null;
  };
  inKrsPeriode: boolean;
  inPrsPeriode: boolean;
  status: 'kosong' | 'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'campuran';
  totalSks: number; maxSks: number; prevIp: number | null;
  items: KrsItem[];
};
export const useKrs = () => useApi<KrsCurrent>(['krs', 'current'], '/mahasiswa/krs');

export type KrsRiwayatItem = {
  id: string; status: string; catatan: string | null;
  kelas: { kodeMK: string; namaMK: string; sks: number; kodeKelas: string; dosen: string };
};
export type KrsRiwayatSemester = {
  semester: { kode: string; jenis: string; nama: string };
  items: KrsRiwayatItem[];
  totalSks: number;
};
export type KrsRiwayat = { semesters: KrsRiwayatSemester[] };
export const useKrsRiwayat = () => useApi<KrsRiwayat>(['krs', 'riwayat'], '/mahasiswa/krs/riwayat');

export function useKrsActions() {
  const qc = useQueryClient();
  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['krs'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
  return {
    addItem: useMutation({
      mutationFn: (kelasId: string) => apiPost('/mahasiswa/krs/items', { kelasId }),
      onSuccess: invalidate,
    }),
    removeItem: useMutation({
      mutationFn: (id: string) => api(`/mahasiswa/krs/items/${id}`, { method: 'DELETE' }),
      onSuccess: invalidate,
    }),
    submit: useMutation({
      mutationFn: () => apiPost('/mahasiswa/krs/submit', {}),
      onSuccess: invalidate,
    }),
    withdraw: useMutation({
      mutationFn: () => apiPost('/mahasiswa/krs/withdraw', {}),
      onSuccess: invalidate,
    }),
    dropItem: useMutation({
      mutationFn: (id: string) => apiPost(`/mahasiswa/krs/items/${id}/drop`, {}),
      onSuccess: invalidate,
    }),
  };
}

export type JadwalItem = {
  id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  dosen: string; ruangan: string | null;
  hari: string; jamMulai: string; jamSelesai: string;
};
export type Jadwal = { semester: { kode: string; jenis: string }; jadwal: JadwalItem[] };
export const useJadwal = () => useApi<Jadwal>(['jadwal'], '/mahasiswa/jadwal');

export type TranskripItem = {
  semesterKode: string; semesterNama: string;
  kodeMK: string; namaMK: string; sks: number;
  nilaiHuruf: string | null; nilaiAngka: number | null; bobot: number | null;
};
export type Transkrip = {
  mahasiswa: { nim: string; nama: string; angkatan: number };
  ipk: number; totalSksLulus: number;
  items: TranskripItem[];
};
export const useTranskrip = () => useApi<Transkrip>(['transkrip'], '/mahasiswa/nilai/transkrip');

export type KhsItem = {
  kodeMK: string; namaMK: string; sks: number; dosen: string;
  tugas: number | null; uts: number | null; uas: number | null; praktikum: number | null; kehadiran: number | null;
  nilaiAngka: number | null; nilaiHuruf: string | null; bobot: number | null; status: string;
};
export type Khs = {
  semesters: Array<{ semesterKode: string; semesterNama: string; items: KhsItem[]; ip: number; totalSks: number }>;
};
export const useKhs = () => useApi<Khs>(['khs'], '/mahasiswa/nilai/khs');

export type Tagihan = {
  id: string; jenis: string; deskripsi: string;
  jumlah: number; dibayar: number; sisa: number;
  jatuhTempo: string; status: string; semester: string;
  pembayaran: Array<{ id: string; tanggalBayar: string; jumlah: number; metode: string; buktiUrl: string | null; catatan: string | null }>;
};
export type Keuangan = {
  ringkasan: { totalTagihan: number; totalDibayar: number; totalSisa: number; jumlahTagihan: number };
  items: Tagihan[];
};
export const useKeuangan = () => useApi<Keuangan>(['keuangan'], '/mahasiswa/keuangan');

export type Penelitian = {
  id: string; judul: string; tahun: number; status: string; peran: string;
  ketua: string; sumberDana: string | null; jumlahDana: number | null;
};
export const usePenelitian = () => useApi<{ items: Penelitian[] }>(['penelitian'], '/mahasiswa/penelitian');

export type Pengabdian = {
  id: string; judul: string; tahun: number; lokasi: string | null; status: string; peran: string;
  ketua: string; sumberDana: string | null; jumlahDana: number | null;
};
export const usePengabdian = () => useApi<{ items: Pengabdian[] }>(['pengabdian'], '/mahasiswa/pengabdian');

export type Kkn = {
  id: string; periode: string; lokasi: string;
  desa: string | null; kecamatan: string | null; kabupaten: string | null;
  status: string; tanggalMulai: string | null; tanggalSelesai: string | null;
  nilai: string | null; dpl: string | null;
};
export const useKkn = () => useApi<{ items: Kkn[] }>(['kkn'], '/mahasiswa/kkn');

export type KknDaftarInput = { periode: string; lokasi: string; desa?: string; kecamatan?: string; kabupaten?: string };
export function useKknActions() {
  const qc = useQueryClient();
  return {
    daftar: useMutation({
      mutationFn: (input: KknDaftarInput) => apiPost('/mahasiswa/kkn', input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['kkn'] }),
    }),
  };
}

export type JenisMbkm =
  | 'pertukaran_mahasiswa' | 'magang_industri' | 'asistensi_mengajar' | 'penelitian'
  | 'proyek_kemanusiaan' | 'kewirausahaan' | 'studi_independen' | 'kkn_tematik';
export type StatusMbkm = 'pengajuan' | 'disetujui' | 'berjalan' | 'selesai' | 'ditolak';

export type MbkmItem = {
  id: string;
  jenis: JenisMbkm;
  namaProgram: string; mitra: string; lokasi: string | null;
  periode: string;
  tanggalMulai: string | null; tanggalSelesai: string | null;
  status: StatusMbkm;
  catatan: string | null;
  linkProposal: string | null; linkLaporan: string | null; linkSertifikat: string | null;
  dpl: string | null;
  konversi: Array<{ id: string; kodeMK: string; namaMK: string; sks: number; nilaiHuruf: string | null; bobot: number | null }>;
  totalSksKonversi: number;
};
export const useMbkm = () => useApi<{ items: MbkmItem[] }>(['mbkm'], '/mahasiswa/mbkm');

export type MbkmDaftarInput = {
  jenis: JenisMbkm; namaProgram: string; mitra: string; lokasi?: string;
  periode: string; tanggalMulai?: string; tanggalSelesai?: string; linkProposal?: string;
};
export function useMbkmActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mbkm'] });
  return {
    daftar: useMutation({ mutationFn: (input: MbkmDaftarInput) => apiPost('/mahasiswa/mbkm', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{ linkProposal: string; linkLaporan: string; linkSertifikat: string }> }) =>
        api(`/mahasiswa/mbkm/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    cancel: useMutation({ mutationFn: (id: string) => api(`/mahasiswa/mbkm/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export type StatusPendaftaranBeasiswa = 'diajukan' | 'dalam_seleksi' | 'diterima' | 'ditolak' | 'batal';

export type BeasiswaTersediaItem = {
  id: string; kode: string; nama: string; penyelenggara: string; deskripsi: string | null;
  nominal: number; kuota: number | null; kuotaTerisi: number;
  syaratIpk: number | null; syaratAngkatanMin: number | null; syaratAngkatanMax: number | null;
  tanggalBuka: string | null; tanggalTutup: string | null;
  memenuhiSyarat: boolean;
  statusPendaftaran: StatusPendaftaranBeasiswa | null;
};
export const useBeasiswaTersedia = () =>
  useApi<{ ipk: number; items: BeasiswaTersediaItem[] }>(['beasiswa-tersedia'], '/mahasiswa/beasiswa/tersedia');

export type PendaftaranBeasiswaItem = {
  id: string;
  status: StatusPendaftaranBeasiswa;
  catatan: string | null;
  motivasi: string;
  linkDokumen: string | null;
  ipkSaatDaftar: number;
  semesterSaatDaftar: string;
  createdAt: string;
  beasiswa: { id: string; kode: string; nama: string; penyelenggara: string; nominal: number };
};
export const useBeasiswaRiwayat = () =>
  useApi<{ items: PendaftaranBeasiswaItem[] }>(['beasiswa-riwayat'], '/mahasiswa/beasiswa');

export type BeasiswaDaftarInput = { beasiswaId: string; motivasi: string; linkDokumen?: string };
export function useBeasiswaActions() {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['beasiswa-tersedia'] }),
    qc.invalidateQueries({ queryKey: ['beasiswa-riwayat'] }),
  ]);
  return {
    daftar: useMutation({ mutationFn: (input: BeasiswaDaftarInput) => apiPost('/mahasiswa/beasiswa/daftar', input), onSuccess: inv }),
    batal: useMutation({ mutationFn: (id: string) => api(`/mahasiswa/beasiswa/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export type MateriKelasItem = {
  kelasId: string;
  kodeMK: string; namaMK: string; sks: number; kodeKelas: string; dosen: string;
  totalBahanAjar: number;
};
export const useMahasiswaMateri = () =>
  useApi<{ items: MateriKelasItem[] }>(['mahasiswa-materi'], '/mahasiswa/materi');

export type MahasiswaBahanAjarItem = {
  id: string;
  jenis: 'link' | 'file' | 'text' | 'video';
  judul: string;
  deskripsi: string | null;
  url: string | null;
  konten: string | null;
  pertemuanKe: number | null;
  tanggal: string | null;
  createdAt: string;
};
export type MahasiswaMateriDetail = {
  kelas: { id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string; dosen: string };
  items: MahasiswaBahanAjarItem[];
};
export const useMahasiswaMateriDetail = (kelasId: string | undefined) =>
  useApi<MahasiswaMateriDetail>(['mahasiswa-materi', kelasId], `/mahasiswa/materi/${kelasId}`, { enabled: !!kelasId });

export type StatusYudisium = 'pendaftaran' | 'verifikasi' | 'layak' | 'tidak_layak' | 'wisuda' | 'batal';
export type PredikatYudisium = 'cumlaude' | 'sangat_memuaskan' | 'memuaskan' | 'tidak_lulus';

export type YudisiumKelayakan = {
  ipk: number;
  sksLulus: number;
  adaE: boolean;
  lulusSkripsi: boolean;
  predikat: PredikatYudisium;
  layak: boolean;
  periodeTersedia: Array<{
    id: string; kode: string; nama: string; tanggal: string;
    batasIpk: number | null; batasSks: number | null;
    memenuhiSyarat: boolean; sudahDaftar: boolean;
  }>;
};
export const useYudisiumKelayakan = () =>
  useApi<YudisiumKelayakan>(['yudisium-kelayakan'], '/mahasiswa/yudisium/kelayakan');

export type YudisiumItem = {
  id: string;
  status: StatusYudisium;
  ipk: number; sksLulus: number;
  predikat: PredikatYudisium | null;
  catatan: string | null;
  noIjazah: string | null;
  noSkl: string | null;
  tanggalLulus: string | null;
  periode: { id: string; kode: string; nama: string; tanggal: string };
};
export const useYudisium = () => useApi<{ items: YudisiumItem[] }>(['yudisium'], '/mahasiswa/yudisium');

export function useYudisiumActions() {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['yudisium'] }),
    qc.invalidateQueries({ queryKey: ['yudisium-kelayakan'] }),
  ]);
  return {
    daftar: useMutation({ mutationFn: (periodeWisudaId: string) => apiPost('/mahasiswa/yudisium/daftar', { periodeWisudaId }), onSuccess: inv }),
    batal: useMutation({ mutationFn: (id: string) => api(`/mahasiswa/yudisium/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export type StatusSkripsi = 'diajukan' | 'disetujui' | 'proposal' | 'penelitian' | 'sidang' | 'lulus' | 'ditolak' | 'batal';

export type SkripsiItem = {
  id: string;
  judul: string;
  abstrak: string | null;
  topik: string | null;
  status: StatusSkripsi;
  catatan: string | null;
  tanggalAjuan: string;
  tanggalDisetujui: string | null;
  tanggalSidang: string | null;
  nilaiHuruf: string | null;
  linkDokumen: string | null;
  pembimbing1: string | null;
  pembimbing2: string | null;
};
export const useSkripsi = () => useApi<{ items: SkripsiItem[] }>(['skripsi'], '/mahasiswa/skripsi');

export type SkripsiAjukanInput = { judul: string; abstrak?: string; topik?: string };
export function useSkripsiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['skripsi'] });
  return {
    ajukan: useMutation({ mutationFn: (input: SkripsiAjukanInput) => apiPost('/mahasiswa/skripsi', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{ linkDokumen: string; abstrak: string }> }) =>
        api(`/mahasiswa/skripsi/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    batal: useMutation({ mutationFn: (id: string) => api(`/mahasiswa/skripsi/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export type EdomKelasItem = {
  kelasId: string;
  kodeMK: string; namaMK: string; sks: number; kodeKelas: string; dosen: string;
  sudahDiisi: boolean;
};
export type EdomList = {
  kuesioner: { id: string; judul: string; jumlahAspek: number } | null;
  items: EdomKelasItem[];
};
export const useEdomList = () => useApi<EdomList>(['edom'], '/mahasiswa/edom');

export type EdomAspek = { id: string; urutan: number; pertanyaan: string; nilai: number | null };
export type EdomDetail = {
  kuesioner: { id: string; judul: string };
  kelas: { kodeMK: string; namaMK: string; kodeKelas: string; dosen: string };
  sudahDiisi: boolean;
  aspek: EdomAspek[];
};
export const useEdomDetail = (kelasId: string | undefined) =>
  useApi<EdomDetail>(['edom', kelasId], `/mahasiswa/edom/${kelasId}`, { enabled: !!kelasId });

export function useEdomSubmit(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jawaban: Array<{ aspekId: string; nilai: number }>) =>
      apiPost(`/mahasiswa/edom/${kelasId}`, { jawaban }),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['edom'] }),
      qc.invalidateQueries({ queryKey: ['edom', kelasId] }),
    ]),
  });
}

export type PengumumanItem = {
  id: string;
  judul: string;
  isi: string;
  target: string;
  pengirim: string | null;
  isPenting: boolean;
  tanggal: string;
};
export const useMahasiswaPengumuman = () =>
  useApi<{ items: PengumumanItem[] }>(['mahasiswa-pengumuman'], '/mahasiswa/pengumuman');

export type AbsensiStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';
export type AbsensiKelas = {
  kelasId: string;
  kodeMK: string; namaMK: string; sks: number; kodeKelas: string; dosen: string;
  totalPertemuan: number;
  totalDinilai: number;
  ringkasan: { hadir: number; izin: number; sakit: number; alpa: number };
  persentaseHadir: number | null;
  detail: Array<{
    pertemuanKe: number; tanggal: string; topik: string | null;
    status: AbsensiStatus | null; catatan: string | null;
  }>;
};
export const useMahasiswaAbsensi = () =>
  useApi<{ items: AbsensiKelas[] }>(['mahasiswa-absensi'], '/mahasiswa/absensi');

export type Profil = {
  id: string; nim: string; nama: string; jenisKelamin: 'L' | 'P';
  tempatLahir: string | null; tanggalLahir: string | null; alamat: string | null;
  telepon: string | null; angkatan: number;
  status: string;
  user: { email: string };
  prodi: { kode: string; nama: string; fakultas: { nama: string } };
  dpa: { nama: string; nidn: string; gelarDepan: string | null; gelarBelakang: string | null } | null;
};
export const useProfil = () => useApi<Profil>(['profil'], '/mahasiswa/profil');
