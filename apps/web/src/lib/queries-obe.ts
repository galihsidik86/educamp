import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type AspekCpl = 'sikap' | 'pengetahuan' | 'ketrampilan_umum' | 'ketrampilan_khusus';
export type StatusCpmk = 'belum' | 'tercapai' | 'belum_tercapai';

export type Cpl = {
  id: string;
  prodiId: string;
  kode: string;
  deskripsi: string;
  aspek: AspekCpl;
  isAktif: boolean;
  urutan: number;
  prodi?: { kode: string; nama: string };
  _count?: { cpmk: number };
};

export type CplInput = {
  prodiId: string;
  kode: string;
  deskripsi: string;
  aspek: AspekCpl;
  urutan?: number;
  isAktif?: boolean;
};

export type CpmkMappingCpl = { kode: string; aspek: AspekCpl; bobot: number; cplId?: string };
export type Cpmk = {
  id: string;
  mataKuliahId: string;
  kode: string;
  deskripsi: string;
  bobotPenilaian: number;
  ambangTercapai: number;
  isAktif: boolean;
  urutan: number;
  mataKuliah?: { kode: string; nama: string; sks: number };
  cpl?: Array<{ cpl: { id: string; kode: string; aspek: AspekCpl; deskripsi: string }; bobot: number }>;
  _count?: { nilai: number };
};

export type CpmkInput = {
  mataKuliahId: string;
  kode: string;
  deskripsi: string;
  bobotPenilaian?: number;
  ambangTercapai?: number;
  urutan?: number;
  isAktif?: boolean;
};

export type LaporanObe = {
  prodiId: string;
  angkatan: number | null;
  totalMahasiswa: number;
  cpl: Array<{
    cpl: { id: string; kode: string; deskripsi: string; aspek: AspekCpl };
    jumlahCpmk: number;
    mhsDinilai: number;
    rataRataSkor: number | null;
    persenTercapai: number | null;
  }>;
};

// ---------- CPL ----------
export const useCpl = (filters: { prodiId?: string; aspek?: AspekCpl } = {}) => {
  const qs = new URLSearchParams();
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.aspek) qs.set('aspek', filters.aspek);
  return useApi<{ items: Cpl[] }>(['cpl', qs.toString()], `/akademik/cpl?${qs}`);
};

export function useCplActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['cpl'] });
  return {
    create: useMutation({
      mutationFn: (body: CplInput) => apiPost('/akademik/cpl', body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<CplInput> }) =>
        api(`/akademik/cpl/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/cpl/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ---------- CPMK ----------
export const useCpmk = (mataKuliahId?: string) => {
  const qs = mataKuliahId ? `?mataKuliahId=${mataKuliahId}` : '';
  return useApi<{ items: Cpmk[] }>(['cpmk', mataKuliahId ?? ''], `/akademik/cpmk${qs}`);
};

export function useCpmkActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['cpmk'] });
  return {
    create: useMutation({
      mutationFn: (body: CpmkInput) => apiPost('/akademik/cpmk', body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<CpmkInput> }) =>
        api(`/akademik/cpmk/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/cpmk/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    addMapping: useMutation({
      mutationFn: ({ cpmkId, cplId, bobot }: { cpmkId: string; cplId: string; bobot: number }) =>
        apiPost(`/akademik/cpmk/${cpmkId}/cpl`, { cplId, bobot }),
      onSuccess: inv,
    }),
    updateMapping: useMutation({
      mutationFn: ({ cpmkId, cplId, bobot }: { cpmkId: string; cplId: string; bobot: number }) =>
        api(`/akademik/cpmk/${cpmkId}/cpl/${cplId}`, { method: 'PATCH', body: JSON.stringify({ bobot }) }),
      onSuccess: inv,
    }),
    removeMapping: useMutation({
      mutationFn: ({ cpmkId, cplId }: { cpmkId: string; cplId: string }) =>
        api(`/akademik/cpmk/${cpmkId}/cpl/${cplId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ---------- Laporan ----------
export const useLaporanObe = (prodiId: string | undefined, angkatan?: number) => {
  const qs = new URLSearchParams();
  if (prodiId) qs.set('prodiId', prodiId);
  if (angkatan) qs.set('angkatan', String(angkatan));
  return useApi<LaporanObe>(['laporan-obe', qs.toString()], `/akademik/obe/laporan?${qs}`, { enabled: !!prodiId });
};

// ---------- Dosen CPMK ----------
export type DosenCpmkData = {
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  cpmk: Array<{
    id: string; kode: string; deskripsi: string;
    bobotPenilaian: number; ambangTercapai: number;
    cpl: Array<{ kode: string; aspek: AspekCpl; bobot: number }>;
  }>;
  peserta: Array<{
    krsId: string; mahasiswaId: string; nim: string; nama: string;
    nilai: Array<{ cpmkId: string; cpmkKode: string; nilai: number; status: StatusCpmk }>;
  }>;
};

export const useDosenCpmk = (kelasId: string | undefined) =>
  useApi<DosenCpmkData>(['dosen-cpmk', kelasId ?? ''], `/dosen/kelas/${kelasId}/cpmk`, { enabled: !!kelasId });

export function useDosenCpmkActions(kelasId?: string) {
  const qc = useQueryClient();
  return {
    upsert: useMutation({
      mutationFn: (items: Array<{ krsId: string; cpmkId: string; nilai: number }>) =>
        apiPost(`/dosen/kelas/${kelasId}/cpmk/nilai`, { items }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-cpmk', kelasId ?? ''] }),
    }),
  };
}
