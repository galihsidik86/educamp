import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type StatusVerifikasi = 'draft' | 'diajukan' | 'diverifikasi' | 'ditolak';
export type LevelKegiatan = 'internasional' | 'nasional' | 'regional' | 'lokal' | 'internal';
export type JenisSertifikasi = 'bahasa' | 'kompetensi' | 'pelatihan' | 'lain';
export type JenisPrestasi = 'lomba_akademik' | 'lomba_non_akademik' | 'kepanitiaan' | 'organisasi' | 'publikasi' | 'lain';

export type Sertifikasi = {
  id: string;
  jenis: JenisSertifikasi;
  nama: string;
  penerbit: string;
  nomorSertifikat: string | null;
  tanggalTerbit: string;
  tanggalKadaluwarsa: string | null;
  level: LevelKegiatan | null;
  skor: string | null;
  fileUrl: string | null;
  status: StatusVerifikasi;
  catatanVerifikator: string | null;
  diverifikasiPada: string | null;
};

export type Prestasi = {
  id: string;
  jenis: JenisPrestasi;
  nama: string;
  penyelenggara: string | null;
  tanggal: string;
  level: LevelKegiatan | null;
  peran: string | null;
  deskripsi: string | null;
  fileUrl: string | null;
  status: StatusVerifikasi;
  catatanVerifikator: string | null;
  diverifikasiPada: string | null;
};

export type SkpiData = {
  mahasiswa: {
    id: string; nim: string; nama: string;
    tempatLahir: string | null; tanggalLahir: string | null;
    jenisKelamin: 'L' | 'P'; angkatan: number;
    status: string;
    prodi: { kode: string; nama: string; jenjang: string };
    fakultas: { kode: string; nama: string };
  };
  kualifikasi: {
    jenjang: string;
    kkniLevel: number | null;
    ipk: number;
    totalSks: number;
  };
  cpl: Array<{ kode: string; deskripsi: string; aspek: string }>;
  institusi: {
    nama: string;
    namaPendek: string | null;
    alamat: string | null;
    kota: string | null;
    akreditasiPT: string | null;
    akreditasiSk: string | null;
    rektorNama: string | null;
    rektorNip: string | null;
    rektorJabatan: string | null;
    kepalaBaakNama: string | null;
  } | null;
  sertifikasi: Sertifikasi[];
  prestasi: Prestasi[];
  penelitian: Array<{ judul: string; tahun: number; sumberDana: string | null; peran: string; status: string }>;
  pengabdian: Array<{ judul: string; tahun: number; lokasi: string | null; peran: string; status: string }>;
  kkn: Array<{ periode: string; lokasi: string; nilai: string | null; tanggalSelesai: string | null }>;
  mbkm: Array<{ jenis: string; namaProgram: string; mitra: string; tanggalMulai: string | null; tanggalSelesai: string | null; totalSks: number }>;
};

// ---------- Mahasiswa ----------

export const useMahasiswaSertifikasi = () =>
  useApi<{ items: Sertifikasi[] }>(['mahasiswa-sertifikasi'], '/mahasiswa/sertifikasi');

export const useMahasiswaPrestasi = () =>
  useApi<{ items: Prestasi[] }>(['mahasiswa-prestasi'], '/mahasiswa/prestasi');

export const useSkpiData = () =>
  useApi<SkpiData>(['skpi-data'], '/mahasiswa/skpi');

export type SertifikasiInput = Omit<Sertifikasi, 'id' | 'status' | 'catatanVerifikator' | 'diverifikasiPada'>;
export type PrestasiInput = Omit<Prestasi, 'id' | 'status' | 'catatanVerifikator' | 'diverifikasiPada'>;

export function useMahasiswaSertifikasiActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['mahasiswa-sertifikasi'] });
    qc.invalidateQueries({ queryKey: ['skpi-data'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: Partial<SertifikasiInput>) => apiPost('/mahasiswa/sertifikasi', input),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<SertifikasiInput> }) =>
        api(`/mahasiswa/sertifikasi/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/mahasiswa/sertifikasi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    submit: useMutation({
      mutationFn: (id: string) => apiPost(`/mahasiswa/sertifikasi/${id}/submit`, {}),
      onSuccess: inv,
    }),
  };
}

export function useMahasiswaPrestasiActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['mahasiswa-prestasi'] });
    qc.invalidateQueries({ queryKey: ['skpi-data'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: Partial<PrestasiInput>) => apiPost('/mahasiswa/prestasi', input),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<PrestasiInput> }) =>
        api(`/mahasiswa/prestasi/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/mahasiswa/prestasi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    submit: useMutation({
      mutationFn: (id: string) => apiPost(`/mahasiswa/prestasi/${id}/submit`, {}),
      onSuccess: inv,
    }),
  };
}

// ---------- Akademik ----------

export type SertifikasiAdmin = Sertifikasi & {
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
};
export type PrestasiAdmin = Prestasi & {
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
};

export const useAkademikSertifikasi = (filters: { status?: StatusVerifikasi; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: SertifikasiAdmin[] }>(['akademik-sertifikasi', qs.toString()], `/akademik/skpi/sertifikasi?${qs}`);
};

export const useAkademikPrestasi = (filters: { status?: StatusVerifikasi; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: PrestasiAdmin[] }>(['akademik-prestasi', qs.toString()], `/akademik/skpi/prestasi?${qs}`);
};

export function useAkademikSkpiActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['akademik-sertifikasi'] });
    qc.invalidateQueries({ queryKey: ['akademik-prestasi'] });
  };
  return {
    verifSertifikat: useMutation({
      mutationFn: ({ id, status, catatan }: { id: string; status: 'diverifikasi' | 'ditolak'; catatan?: string | null }) =>
        api(`/akademik/skpi/sertifikasi/${id}`, { method: 'PATCH', body: JSON.stringify({ status, catatanVerifikator: catatan ?? null }) }),
      onSuccess: inv,
    }),
    verifPrestasi: useMutation({
      mutationFn: ({ id, status, catatan }: { id: string; status: 'diverifikasi' | 'ditolak'; catatan?: string | null }) =>
        api(`/akademik/skpi/prestasi/${id}`, { method: 'PATCH', body: JSON.stringify({ status, catatanVerifikator: catatan ?? null }) }),
      onSuccess: inv,
    }),
  };
}
