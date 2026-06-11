// Notifikasi — shared di semua peran.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, apiGet } from './api';
import { useApi } from './queries';

export type Notifikasi = {
  id: string;
  title: string;
  body: string | null;
  type: string | null;     // krs | nilai | tagihan | pembayaran | info | ...
  link: string | null;
  entity: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotifikasiList = {
  items: Notifikasi[];
  total: number;
  unread: number;
  take: number;
  skip: number;
};

export const useNotifikasi = (filters: { onlyUnread?: boolean; take?: number; skip?: number } = {}) => {
  const qs = new URLSearchParams();
  if (filters.onlyUnread) qs.set('onlyUnread', '1');
  if (filters.take) qs.set('take', filters.take.toString());
  if (filters.skip) qs.set('skip', filters.skip.toString());
  return useApi<NotifikasiList>(['notifikasi', qs.toString()], `/notifikasi?${qs}`);
};

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['notifikasi', 'unread-count'],
    queryFn: () => apiGet<{ unread: number }>('/notifikasi/unread-count'),
    enabled,
    refetchInterval: 30_000,         // polling tiap 30 detik
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useNotifikasiActions() {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['notifikasi'] }),
  ]);
  return {
    markRead: useMutation({
      mutationFn: (id: string) => apiPost(`/notifikasi/${id}/read`, {}),
      onSuccess: inv,
    }),
    markAllRead: useMutation({
      mutationFn: () => apiPost('/notifikasi/read-all', {}),
      onSuccess: inv,
    }),
  };
}
