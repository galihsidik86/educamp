import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type KategoriDokumen = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  urutan: number;
  isAktif: boolean;
  _count?: { dokumen: number };
};

export type Dokumen = {
  id: string;
  kategoriId: string;
  judul: string;
  deskripsi: string | null;
  versi: string | null;
  target: string; // "all" | "mahasiswa" | "dosen" | "prodi:<id>"
  fileUrl: string;
  jenisFile: string | null;
  ukuranByte: number | null;
  tanggalBerlaku: string | null;
  tanggalKedaluwarsa: string | null;
  isAktif: boolean;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  kategori?: { id?: string; kode: string; nama: string };
};

export type DokumenAkses = {
  id: string;
  aksi: 'view' | 'download';
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    email: string; role: string;
    mahasiswa?: { nim: string; nama: string } | null;
    dosen?: { nidn: string; nama: string } | null;
  };
};

// ---------- Shared (semua role) ----------

export const useDokumenKategoriShared = () =>
  useApi<{ items: KategoriDokumen[] }>(['dokumen-kategori-shared'], '/dokumen/kategori');

export const useDokumenShared = (filters: { kategoriId?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.kategoriId) qs.set('kategoriId', filters.kategoriId);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: Dokumen[] }>(['dokumen-shared', qs.toString()], `/dokumen?${qs}`);
};

export function useDokumenAksesActions() {
  return {
    log: useMutation({
      mutationFn: ({ id, aksi }: { id: string; aksi: 'view' | 'download' }) =>
        apiPost(`/dokumen/${id}/akses`, { aksi }),
    }),
  };
}

// ---------- Akademik admin ----------

export const useAdminKategori = () =>
  useApi<{ items: KategoriDokumen[] }>(['admin-dokumen-kategori'], '/akademik/dokumen/kategori');

export type KategoriInput = {
  kode: string;
  nama: string;
  deskripsi?: string | null;
  urutan?: number;
  isAktif?: boolean;
};

export function useAdminKategoriActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-dokumen-kategori'] });
  return {
    create: useMutation({
      mutationFn: (body: KategoriInput) => apiPost('/akademik/dokumen/kategori', body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<KategoriInput> }) =>
        api(`/akademik/dokumen/kategori/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/dokumen/kategori/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

export const useAdminDokumen = (filters: { kategoriId?: string; status?: 'aktif' | 'nonaktif'; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.kategoriId) qs.set('kategoriId', filters.kategoriId);
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: Dokumen[] }>(['admin-dokumen', qs.toString()], `/akademik/dokumen?${qs}`);
};

export type DokumenInput = {
  kategoriId: string;
  judul: string;
  deskripsi?: string | null;
  versi?: string | null;
  target: string;
  fileUrl: string;
  jenisFile?: string | null;
  ukuranByte?: number | null;
  tanggalBerlaku?: string | null;
  tanggalKedaluwarsa?: string | null;
  isAktif?: boolean;
};

export function useAdminDokumenActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['admin-dokumen'] });
    qc.invalidateQueries({ queryKey: ['admin-dokumen-kategori'] });
  };
  return {
    create: useMutation({
      mutationFn: (body: DokumenInput) => apiPost('/akademik/dokumen', body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<DokumenInput> }) =>
        api(`/akademik/dokumen/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/dokumen/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

export const useAdminDokumenAkses = (id: string | undefined) =>
  useApi<{ items: DokumenAkses[] }>(['admin-dokumen-akses', id ?? ''], `/akademik/dokumen/${id}/akses`, { enabled: !!id });
