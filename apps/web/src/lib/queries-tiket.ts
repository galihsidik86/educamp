import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type KategoriTiket = 'krs' | 'keuangan' | 'akun' | 'nilai' | 'layanan' | 'lain';
export type StatusTiket = 'terbuka' | 'proses' | 'menunggu_user' | 'selesai' | 'ditutup';
export type PrioritasTiket = 'rendah' | 'normal' | 'tinggi';

export type TiketListItem = {
  id: string;
  kategori: KategoriTiket;
  judul: string;
  status: StatusTiket;
  prioritas: PrioritasTiket;
  createdAt: string;
  updatedAt: string;
  _count?: { replies: number };
  mahasiswa?: { nim: string; nama: string; prodi: { kode: string; nama: string } };
};

export type TiketReply = {
  id: string;
  authorRole: string;
  isi: string;
  createdAt: string;
  author?: {
    email: string;
    mahasiswa?: { nama: string } | null;
    akademik?: { nama: string } | null;
  };
};

export type TiketDetail = TiketListItem & {
  deskripsi: string;
  mahasiswa?: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
  replies: TiketReply[];
  tanggalTutup: string | null;
};

// ---------- Mahasiswa ----------
export const useMahasiswaTiketList = (status?: StatusTiket) => {
  const qs = status ? `?status=${status}` : '';
  return useApi<{ items: TiketListItem[] }>(['mahasiswa-tiket', status ?? ''], `/mahasiswa/tiket${qs}`);
};
export const useMahasiswaTiketDetail = (id: string | undefined) =>
  useApi<TiketDetail>(['mahasiswa-tiket-detail', id ?? ''], `/mahasiswa/tiket/${id}`, { enabled: !!id });

export function useMahasiswaTiketActions(id?: string) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['mahasiswa-tiket'] });
    if (id) qc.invalidateQueries({ queryKey: ['mahasiswa-tiket-detail', id] });
  };
  return {
    create: useMutation({
      mutationFn: (body: { kategori: KategoriTiket; judul: string; deskripsi: string }) => apiPost('/mahasiswa/tiket', body),
      onSuccess: inv,
    }),
    reply: useMutation({
      mutationFn: (isi: string) => apiPost(`/mahasiswa/tiket/${id}/reply`, { isi }),
      onSuccess: inv,
    }),
    close: useMutation({
      mutationFn: () => apiPost(`/mahasiswa/tiket/${id}/close`, {}),
      onSuccess: inv,
    }),
  };
}

// ---------- Akademik ----------
export const useAkademikTiketList = (filters: { status?: StatusTiket; kategori?: KategoriTiket; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.kategori) qs.set('kategori', filters.kategori);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: TiketListItem[] }>(['akademik-tiket', qs.toString()], `/akademik/tiket?${qs}`);
};
export const useAkademikTiketDetail = (id: string | undefined) =>
  useApi<TiketDetail>(['akademik-tiket-detail', id ?? ''], `/akademik/tiket/${id}`, { enabled: !!id });

export function useAkademikTiketActions(id?: string) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['akademik-tiket'] });
    if (id) qc.invalidateQueries({ queryKey: ['akademik-tiket-detail', id] });
  };
  return {
    update: useMutation({
      mutationFn: ({ tiketId, patch }: { tiketId: string; patch: { status?: StatusTiket; prioritas?: PrioritasTiket } }) =>
        api(`/akademik/tiket/${tiketId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    reply: useMutation({
      mutationFn: ({ tiketId, isi }: { tiketId: string; isi: string }) => apiPost(`/akademik/tiket/${tiketId}/reply`, { isi }),
      onSuccess: inv,
    }),
  };
}
