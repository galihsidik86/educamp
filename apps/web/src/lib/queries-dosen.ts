import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

// ============================================================
// Dashboard, Profil, Jadwal
// ============================================================

export type DosenDashboardData = {
  semester: { kode: string; nama: string };
  kelasCount: number;
  totalSks: number;
  totalMahasiswa: number;
  totalBimbingan: number;
  penelitianAktif: number;
  pengabdianAktif: number;
  jadwalHariIni: Array<{ kode: string; nama: string; kodeKelas: string; jamMulai: string | null; jamSelesai: string | null; ruangan: string | null }>;
  today: string;
};
export const useDosenDashboard = () => useApi<DosenDashboardData>(['dosen-dashboard'], '/dosen/dashboard');

export type DosenProfil = {
  id: string; nidn: string; nama: string;
  gelarDepan: string | null; gelarBelakang: string | null;
  jabatanFungsional: string | null; jabatanStruktural: string | null;
  isDpa: boolean;
  user: { email: string };
  prodi: { kode: string; nama: string; fakultas: { nama: string } };
  _count: { kelas: number; mahasiswaBimbingan: number; penelitian: number; pengabdian: number };
};
export const useDosenProfil = () => useApi<DosenProfil>(['dosen-profil'], '/dosen/profil');

export type DosenJadwalItem = {
  id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  ruangan: string | null;
  hari: string; jamMulai: string; jamSelesai: string;
  pesertaCount: number;
};
export const useDosenJadwal = () =>
  useApi<{ semester: { kode: string; jenis: string }; jadwal: DosenJadwalItem[] }>(['dosen-jadwal'], '/dosen/jadwal');

// ============================================================
// Kelas + Input Nilai
// ============================================================

export type DosenKelas = {
  id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  hari: string | null; jamMulai: string | null; jamSelesai: string | null;
  ruangan: string | null; pesertaCount: number; semester: string;
};
export const useDosenKelas = () =>
  useApi<{ kelas: DosenKelas[] }>(['dosen-kelas'], '/dosen/kelas');

export type DosenKelasDetail = {
  kelas: {
    id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
    hari: string | null; jamMulai: string | null; jamSelesai: string | null;
    ruangan: string | null;
    semester: { kode: string; nama: string };
    periodeNilai: { mulai: string | null; selesai: string | null };
  };
  peserta: Array<{
    krsId: string;
    statusKrs: string;
    mahasiswa: { id: string; nim: string; nama: string; angkatan: number };
    nilai: {
      tugas: number | null; uts: number | null; uas: number | null;
      praktikum: number | null; kehadiran: number | null;
      nilaiAngka: number | null; nilaiHuruf: string | null; bobot: number | null;
      status: 'belum' | 'draft' | 'finalized';
    } | null;
  }>;
};
export const useDosenKelasDetail = (id: string | undefined) =>
  useApi<DosenKelasDetail>(['dosen-kelas', id], `/dosen/kelas/${id}`, { enabled: !!id });

export type NilaiPatch = {
  tugas?: number | null; uts?: number | null; uas?: number | null;
  praktikum?: number | null; kehadiran?: number | null;
  nilaiAngka?: number | null;
  status?: 'belum' | 'draft' | 'finalized';
};
export function useUpdateNilai(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ krsId, patch }: { krsId: string; patch: NilaiPatch }) =>
      api(`/dosen/nilai/${krsId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-kelas', kelasId] }),
  });
}

// ============================================================
// Bimbingan Akademik
// ============================================================

export type Bimbingan = {
  semester: { kode: string; nama: string };
  items: Array<{
    id: string; nim: string; nama: string; angkatan: number;
    prodi: { kode: string; nama: string };
    krsStatus: 'kosong' | 'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'campuran';
    krsTotal: number; krsSks: number;
    perluValidasi: boolean;
  }>;
};
export const useBimbingan = () => useApi<Bimbingan>(['bimbingan'], '/dosen/bimbingan');

export type BimbinganDetail = {
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
  semester: { kode: string };
  items: Array<{
    id: string; status: string; catatan: string | null;
    kelas: {
      kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
      hari: string | null; jamMulai: string | null; jamSelesai: string | null;
      ruangan: string | null; dosen: string;
    };
  }>;
  totalSks: number;
};
export const useBimbinganDetail = (mahasiswaId: string | undefined) =>
  useApi<BimbinganDetail>(['bimbingan', mahasiswaId, 'krs'], `/dosen/bimbingan/${mahasiswaId}/krs`, { enabled: !!mahasiswaId });

export function useValidasiKrs(mahasiswaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, catatan }: { action: 'setujui' | 'tolak'; catatan?: string }) =>
      apiPost(`/dosen/bimbingan/${mahasiswaId}/krs/validasi`, { action, catatan }),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['bimbingan'] }),
      qc.invalidateQueries({ queryKey: ['bimbingan', mahasiswaId] }),
    ]),
  });
}

// ============================================================
// Penelitian & Pengabdian
// ============================================================

export type DosenPenelitian = {
  id: string; judul: string; abstrak: string | null; tahun: number;
  sumberDana: string | null; jumlahDana: number | null; status: string;
  anggota: Array<{ id: string; peran: string; mahasiswa: { id: string; nim: string; nama: string } }>;
};
export const useDosenPenelitian = () =>
  useApi<{ items: DosenPenelitian[] }>(['dosen-penelitian'], '/dosen/penelitian');

export type DosenPengabdian = {
  id: string; judul: string; deskripsi: string | null; tahun: number;
  lokasi: string | null; sumberDana: string | null; jumlahDana: number | null; status: string;
  anggota: Array<{ id: string; peran: string; mahasiswa: { id: string; nim: string; nama: string } }>;
};
export const useDosenPengabdian = () =>
  useApi<{ items: DosenPengabdian[] }>(['dosen-pengabdian'], '/dosen/pengabdian');

export type KegiatanInput = {
  judul: string;
  tahun: number;
  sumberDana?: string;
  jumlahDana?: number;
  status?: 'proposal' | 'disetujui' | 'berjalan' | 'selesai' | 'ditolak';
  // penelitian
  abstrak?: string;
  // pengabdian
  deskripsi?: string;
  lokasi?: string;
};

export function usePenelitianActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['dosen-penelitian'] });
  return {
    create: useMutation({ mutationFn: (input: KegiatanInput) => apiPost('/dosen/penelitian', input), onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: string) => api(`/dosen/penelitian/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addAnggota: useMutation({
      mutationFn: ({ id, nim, peran }: { id: string; nim: string; peran: string }) =>
        apiPost(`/dosen/penelitian/${id}/anggota`, { nim, peran }),
      onSuccess: inv,
    }),
    removeAnggota: useMutation({
      mutationFn: ({ id, anggotaId }: { id: string; anggotaId: string }) =>
        api(`/dosen/penelitian/${id}/anggota/${anggotaId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

export function usePengabdianActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['dosen-pengabdian'] });
  return {
    create: useMutation({ mutationFn: (input: KegiatanInput) => apiPost('/dosen/pengabdian', input), onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: string) => api(`/dosen/pengabdian/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addAnggota: useMutation({
      mutationFn: ({ id, nim, peran }: { id: string; nim: string; peran: string }) =>
        apiPost(`/dosen/pengabdian/${id}/anggota`, { nim, peran }),
      onSuccess: inv,
    }),
    removeAnggota: useMutation({
      mutationFn: ({ id, anggotaId }: { id: string; anggotaId: string }) =>
        api(`/dosen/pengabdian/${id}/anggota/${anggotaId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}
