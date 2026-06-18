// ============================================================
// Kalender akademik queries.
// - useKalenderShared: read endpoint /kalender (semua role)
// - useKalenderAkademik + useKalenderActions: CRUD akademik
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type EventKalender = {
  id: string;
  judul: string;
  deskripsi: string | null;
  jenis: 'ujian' | 'libur' | 'registrasi' | 'wisuda' | 'akademik' | 'lain';
  tanggalMulai: string;
  tanggalSelesai: string | null;
  target: 'all' | 'mahasiswa' | 'dosen';
  warna: string | null;
  semesterId: string | null;
  semester?: { kode: string; jenis: string; tahunAjaran: { kode: string } } | null;
};

export const useKalenderShared = (filters: { from?: string; to?: string; upcoming?: number } = {}) => {
  const qs = new URLSearchParams();
  if (filters.from) qs.set('from', filters.from);
  if (filters.to) qs.set('to', filters.to);
  if (filters.upcoming) qs.set('upcoming', String(filters.upcoming));
  return useApi<{ items: EventKalender[] }>(['kalender-shared', qs.toString()], `/kalender?${qs}`);
};

export const useKalenderAkademik = (filters: { semesterId?: string; jenis?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.jenis) qs.set('jenis', filters.jenis);
  return useApi<{ items: EventKalender[] }>(['kalender-akademik', qs.toString()], `/akademik/kalender?${qs}`);
};

export type EventKalenderInput = {
  judul: string;
  deskripsi?: string | null;
  jenis: EventKalender['jenis'];
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  target: EventKalender['target'];
  warna?: string | null;
  semesterId?: string | null;
};

export function useKalenderActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['kalender-akademik'] });
    qc.invalidateQueries({ queryKey: ['kalender-shared'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: EventKalenderInput) => apiPost('/akademik/kalender', input),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<EventKalenderInput> }) =>
        api(`/akademik/kalender/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/kalender/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}
