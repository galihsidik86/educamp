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
