import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type JenisMutasi = 'cuti' | 'aktif_kembali' | 'pindah_prodi' | 'mengundurkan_diri';
export type StatusMutasi = 'diajukan' | 'disetujui' | 'ditolak' | 'batal';
export type StatusMahasiswa = 'aktif' | 'cuti' | 'lulus' | 'drop_out' | 'mengundurkan_diri';

export type MutasiBase = {
  id: string;
  jenis: JenisMutasi;
  statusSebelum: StatusMahasiswa;
  statusSesudah: StatusMahasiswa;
  alasan: string;
  fileUrl: string | null;
  status: StatusMutasi;
  catatanAkademik: string | null;
  diprosesPada: string | null;
  createdAt: string;
  prodiAsal: { kode: string; nama: string } | null;
  prodiTujuan: { kode: string; nama: string } | null;
  semester: { kode: string; jenis: string; tahunAjaran: { kode: string } } | null;
};

export type MutasiMahasiswa = MutasiBase;
export type MutasiAdmin = MutasiBase & {
  mahasiswa: {
    id: string; nim: string; nama: string; angkatan: number;
    prodi: { kode: string; nama: string };
  };
};

// ---------- Mahasiswa ----------

export type ProdiDropdown = { id: string; kode: string; nama: string; jenjang: string; fakultas: { kode: string; nama: string } };

export const useProdiListMahasiswa = () =>
  useApi<{ items: ProdiDropdown[] }>(['mutasi-prodi-list'], '/mahasiswa/mutasi/prodi');

export const useMutasiMahasiswa = () =>
  useApi<{ items: MutasiMahasiswa[] }>(['mutasi-mahasiswa'], '/mahasiswa/mutasi');

export type MutasiInput = {
  jenis: JenisMutasi;
  alasan: string;
  prodiTujuanId?: string | null;
  semesterId?: string | null;
  fileUrl?: string | null;
};

export function useMutasiMahasiswaActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mutasi-mahasiswa'] });
  return {
    create: useMutation({
      mutationFn: (input: MutasiInput) => apiPost('/mahasiswa/mutasi', input),
      onSuccess: inv,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => api(`/mahasiswa/mutasi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ---------- Akademik ----------

export const useMutasiAkademik = (filters: { status?: StatusMutasi; jenis?: JenisMutasi; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.jenis) qs.set('jenis', filters.jenis);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: MutasiAdmin[] }>(['mutasi-akademik', qs.toString()], `/akademik/mutasi?${qs}`);
};

export function useMutasiAkademikActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mutasi-akademik'] });
  return {
    respond: useMutation({
      mutationFn: ({ id, status, catatan }: { id: string; status: 'disetujui' | 'ditolak'; catatan?: string | null }) =>
        api(`/akademik/mutasi/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status, catatanAkademik: catatan ?? null }) }),
      onSuccess: inv,
    }),
  };
}
