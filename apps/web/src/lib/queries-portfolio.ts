// Mahasiswa Portfolio: Prestasi + Sertifikasi (external) queries
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type StatusVerif = 'draft' | 'diajukan' | 'diverifikasi' | 'ditolak';

export type Prestasi = {
  id: string;
  mahasiswaId: string;
  jenis: 'lomba_akademik' | 'lomba_non_akademik' | 'kepanitiaan' | 'organisasi' | 'publikasi' | 'lain';
  nama: string;
  penyelenggara: string | null;
  tanggal: string;
  level: 'internasional' | 'nasional' | 'regional' | 'lokal' | 'internal' | null;
  peran: string | null;
  deskripsi: string | null;
  fileUrl: string | null;
  status: StatusVerif;
  catatanVerifikator: string | null;
};

export type Sertifikasi = {
  id: string;
  mahasiswaId: string;
  jenis: 'bahasa' | 'kompetensi' | 'pelatihan' | 'lain';
  nama: string;
  penerbit: string;
  nomorSertifikat: string | null;
  tanggalTerbit: string;
  tanggalKadaluwarsa: string | null;
  level: 'internasional' | 'nasional' | 'regional' | 'lokal' | 'internal' | null;
  skor: string | null;
  fileUrl: string | null;
  status: StatusVerif;
  catatanVerifikator: string | null;
};

export type PrestasiAdmin = Prestasi & { mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } } };
export type SertifikasiAdmin = Sertifikasi & { mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } } };

// ---------- Mahasiswa ----------
export const useMahasiswaPrestasi = () =>
  useApi<{ items: Prestasi[] }>(['mhs-prestasi'], '/mahasiswa/prestasi');
export const useMahasiswaSertifikasi = () =>
  useApi<{ items: Sertifikasi[] }>(['mhs-sertifikasi'], '/mahasiswa/sertifikasi');

export function useMahasiswaPrestasiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mhs-prestasi'] });
  return {
    create: useMutation({ mutationFn: (body: Partial<Prestasi>) => apiPost('/mahasiswa/prestasi', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Prestasi> }) =>
        api(`/mahasiswa/prestasi/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/mahasiswa/prestasi/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export function useMahasiswaSertifikasiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mhs-sertifikasi'] });
  return {
    create: useMutation({ mutationFn: (body: Partial<Sertifikasi>) => apiPost('/mahasiswa/sertifikasi', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Sertifikasi> }) =>
        api(`/mahasiswa/sertifikasi/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/mahasiswa/sertifikasi/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

// ---------- Akademik ----------
export const useAdminPrestasi = (filters: { status?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: PrestasiAdmin[] }>(['admin-prestasi', qs.toString()], `/akademik/prestasi?${qs}`);
};

export const useAdminSertifikasi = (filters: { status?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: SertifikasiAdmin[] }>(['admin-sertifikasi', qs.toString()], `/akademik/sertifikasi?${qs}`);
};

export function useAdminPrestasiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-prestasi'] });
  return {
    verifikasi: useMutation({
      mutationFn: ({ id, action, catatan }: { id: string; action: 'verifikasi' | 'tolak'; catatan?: string }) =>
        apiPost(`/akademik/prestasi/${id}/verifikasi`, { action, catatan }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/prestasi/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export function useAdminSertifikasiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-sertifikasi'] });
  return {
    verifikasi: useMutation({
      mutationFn: ({ id, action, catatan }: { id: string; action: 'verifikasi' | 'tolak'; catatan?: string }) =>
        apiPost(`/akademik/sertifikasi/${id}/verifikasi`, { action, catatan }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/sertifikasi/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

// ---------- Oversight (akademik) ----------
export const useOversightKonsultasi = (filters: { status?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  return useApi<{ items: any[] }>(['oversight-konsultasi', qs.toString()], `/akademik/konsultasi?${qs}`);
};
export const useOversightPenelitian = (filters: { status?: string; tahun?: number } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.tahun) qs.set('tahun', String(filters.tahun));
  return useApi<{ items: any[] }>(['oversight-penelitian', qs.toString()], `/akademik/penelitian?${qs}`);
};
export const useOversightPengabdian = (filters: { status?: string; tahun?: number } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.tahun) qs.set('tahun', String(filters.tahun));
  return useApi<{ items: any[] }>(['oversight-pengabdian', qs.toString()], `/akademik/pengabdian?${qs}`);
};
