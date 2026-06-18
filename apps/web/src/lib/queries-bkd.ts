import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type KategoriBkd = 'pengajaran' | 'penelitian' | 'pengabdian' | 'penunjang';
export type StatusBkd = 'draft' | 'diajukan' | 'disetujui' | 'ditolak';

export type BkdItem = {
  id: string;
  kategori: KategoriBkd;
  jenis: string;
  deskripsi: string;
  bobotSks: number;
  sumberEntity: string | null;
  sumberId: string | null;
  fileUrl: string | null;
};

export type BkdLaporan = {
  id: string;
  semesterId: string;
  status: StatusBkd;
  totalSks: number;
  catatanDosen: string | null;
  catatanAkademik: string | null;
  diverifikasiPada: string | null;
  semester?: { kode: string; jenis: string; tahunAjaran: { kode: string } };
  items?: BkdItem[];
  _count?: { items: number };
  dosen?: { id: string; nidn: string; nama: string; gelarDepan: string | null; gelarBelakang: string | null; prodi: { kode: string; nama: string } };
};

// ---------- Dosen ----------
export const useDosenBkdList = () =>
  useApi<{ items: BkdLaporan[] }>(['dosen-bkd-list'], '/dosen/bkd');

export const useDosenBkdDetail = (id: string | undefined) =>
  useApi<BkdLaporan>(['dosen-bkd', id ?? ''], `/dosen/bkd/${id}`, { enabled: !!id });

export type BkdItemInput = {
  kategori: KategoriBkd;
  jenis: string;
  deskripsi: string;
  bobotSks: number;
  fileUrl?: string | null;
};

export function useDosenBkdActions(laporanId?: string) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['dosen-bkd-list'] });
    if (laporanId) qc.invalidateQueries({ queryKey: ['dosen-bkd', laporanId] });
  };
  return {
    create: useMutation({
      mutationFn: (body: { semesterId?: string }) => apiPost('/dosen/bkd', body),
      onSuccess: inv,
    }),
    refresh: useMutation({
      mutationFn: (id: string) => apiPost(`/dosen/bkd/${id}/refresh`, {}),
      onSuccess: inv,
    }),
    addItem: useMutation({
      mutationFn: ({ id, body }: { id: string; body: BkdItemInput }) => apiPost(`/dosen/bkd/${id}/items`, body),
      onSuccess: inv,
    }),
    updateItem: useMutation({
      mutationFn: ({ itemId, patch }: { itemId: string; patch: Partial<BkdItemInput> }) =>
        api(`/dosen/bkd/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    removeItem: useMutation({
      mutationFn: (itemId: string) => api(`/dosen/bkd/items/${itemId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    submit: useMutation({
      mutationFn: (id: string) => apiPost(`/dosen/bkd/${id}/submit`, {}),
      onSuccess: inv,
    }),
  };
}

// ---------- Akademik ----------
export const useAdminBkdList = (filters: { status?: StatusBkd; semesterId?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: BkdLaporan[] }>(['admin-bkd-list', qs.toString()], `/akademik/bkd?${qs}`);
};

export const useAdminBkdDetail = (id: string | undefined) =>
  useApi<BkdLaporan>(['admin-bkd', id ?? ''], `/akademik/bkd/${id}`, { enabled: !!id });

export const useAdminBkdRingkasan = (id: string | undefined) =>
  useApi<Record<KategoriBkd, number>>(['admin-bkd-ringkasan', id ?? ''], `/akademik/bkd/${id}/ringkasan`, { enabled: !!id });

export function useAdminBkdActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['admin-bkd-list'] });
    qc.invalidateQueries({ queryKey: ['admin-bkd'] });
  };
  return {
    verifikasi: useMutation({
      mutationFn: ({ id, status, catatan }: { id: string; status: 'disetujui' | 'ditolak'; catatan?: string | null }) =>
        api(`/akademik/bkd/${id}/verifikasi`, { method: 'PATCH', body: JSON.stringify({ status, catatanAkademik: catatan ?? null }) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/bkd/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}
