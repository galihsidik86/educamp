import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export type JenisSertifikat = 'kkn' | 'mbkm' | 'edom' | 'workshop' | 'panitia' | 'asisten' | 'lain';
export type StatusSertifikat = 'terbit' | 'dicabut';

export type SertifikatItem = {
  id: string;
  mahasiswaId: string;
  jenis: JenisSertifikat;
  judul: string;
  deskripsi: string | null;
  nomorSertifikat: string;
  tanggalTerbit: string;
  periode: string | null;
  ttdNama: string | null;
  ttdJabatan: string | null;
  verifikasiToken: string;
  status: StatusSertifikat;
  alasanCabut: string | null;
  dicabutPada: string | null;
  sumberEntity: string | null;
  sumberId: string | null;
};

export type SertifikatDetail = SertifikatItem & {
  mahasiswa: {
    nim: string; nama: string;
    tempatLahir: string | null; tanggalLahir: string | null;
    prodi: { kode: string; nama: string; jenjang: string; fakultas: { nama: string } };
  };
};

export type SertifikatAdmin = SertifikatItem & {
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
};

// ---------- Mahasiswa ----------
export const useMahasiswaSertifikat = () =>
  useApi<{ items: SertifikatItem[] }>(['mahasiswa-sertifikat-digital'], '/mahasiswa/sertifikat');

export const useMahasiswaSertifikatDetail = (id: string | undefined) =>
  useApi<SertifikatDetail>(['mahasiswa-sertifikat-detail', id ?? ''], `/mahasiswa/sertifikat/${id}`, { enabled: !!id });

// ---------- Akademik ----------
export const useAdminSertifikat = (filters: { jenis?: JenisSertifikat; status?: StatusSertifikat; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.jenis) qs.set('jenis', filters.jenis);
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: SertifikatAdmin[] }>(['admin-sertifikat-digital', qs.toString()], `/akademik/sertifikat?${qs}`);
};

export type SertifikatInput = {
  mahasiswaId: string;
  jenis: JenisSertifikat;
  judul: string;
  deskripsi?: string | null;
  periode?: string | null;
  ttdNama?: string | null;
  ttdJabatan?: string | null;
};

export function useAdminSertifikatActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-sertifikat-digital'] });
  return {
    create: useMutation({
      mutationFn: (body: SertifikatInput) => apiPost('/akademik/sertifikat', body),
      onSuccess: inv,
    }),
    cabut: useMutation({
      mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
        apiPost(`/akademik/sertifikat/${id}/cabut`, { alasan }),
      onSuccess: inv,
    }),
    aktifkan: useMutation({
      mutationFn: (id: string) => apiPost(`/akademik/sertifikat/${id}/aktifkan`, {}),
      onSuccess: inv,
    }),
    regenToken: useMutation({
      mutationFn: (id: string) =>
        apiPost<{ verifikasiToken: string }>(`/akademik/sertifikat/${id}/regen-token`, {}),
      onSuccess: inv,
    }),
  };
}

// ---------- Public verifikasi ----------
export type VerifikasiSertifikat = {
  valid: true;
  institusi: { nama: string; fakultas: string };
  sertifikat: {
    nomorSertifikat: string; jenis: JenisSertifikat; judul: string;
    deskripsi: string | null; periode: string | null; tanggalTerbit: string;
  };
  penerima: { nim: string; nama: string; prodi: string };
  verifiedAt: string;
};

import { useQuery } from '@tanstack/react-query';
import { ApiError } from './api';

export const useVerifikasiSertifikat = (token: string | undefined) =>
  useQuery({
    queryKey: ['verifikasi-sertifikat', token ?? ''],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/verifikasi/sertifikat/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = body?.error ?? {};
        throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Tidak ditemukan');
      }
      return res.json() as Promise<VerifikasiSertifikat>;
    },
    enabled: !!token,
    retry: false,
  });
