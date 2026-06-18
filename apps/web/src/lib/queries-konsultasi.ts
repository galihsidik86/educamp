import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type StatusKonsultasi = 'diajukan' | 'diterima' | 'ditolak' | 'selesai' | 'batal';

export type KonsultasiBase = {
  id: string;
  topik: string;
  agenda: string | null;
  waktuMulai: string;
  durasiMenit: number;
  status: StatusKonsultasi;
  catatanDpa: string | null;
  tanggalSelesai: string | null;
  createdAt: string;
};

export type KonsultasiMahasiswa = KonsultasiBase & {
  dpa: { id: string; nidn: string; nama: string; gelarDepan: string | null; gelarBelakang: string | null };
};
export type KonsultasiDosen = KonsultasiBase & {
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
};

export const useKonsultasiMahasiswa = (status?: StatusKonsultasi) => {
  const qs = status ? `?status=${status}` : '';
  return useApi<{ items: KonsultasiMahasiswa[] }>(['konsultasi-mahasiswa', status ?? ''], `/mahasiswa/konsultasi${qs}`);
};

export type KonsultasiInput = {
  topik: string;
  agenda?: string | null;
  waktuMulai: string;
  durasiMenit?: number;
};

export function useKonsultasiMahasiswaActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['konsultasi-mahasiswa'] });
  return {
    create: useMutation({
      mutationFn: (body: KonsultasiInput) => apiPost('/mahasiswa/konsultasi', body),
      onSuccess: inv,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => api(`/mahasiswa/konsultasi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

export const useKonsultasiDosen = (status?: StatusKonsultasi) => {
  const qs = status ? `?status=${status}` : '';
  return useApi<{ items: KonsultasiDosen[] }>(['konsultasi-dosen', status ?? ''], `/dosen/konsultasi${qs}`);
};

export function useKonsultasiDosenActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['konsultasi-dosen'] });
  return {
    respond: useMutation({
      mutationFn: ({ id, body }: { id: string; body: { status: 'diterima' | 'ditolak'; catatanDpa?: string | null; waktuMulai?: string } }) =>
        api(`/dosen/konsultasi/${id}/respond`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    selesai: useMutation({
      mutationFn: ({ id, catatanDpa }: { id: string; catatanDpa: string }) =>
        api(`/dosen/konsultasi/${id}/selesai`, { method: 'PATCH', body: JSON.stringify({ catatanDpa }) }),
      onSuccess: inv,
    }),
  };
}
