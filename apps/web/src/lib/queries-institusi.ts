import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiGet, ApiError } from './api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export type Institusi = {
  id?: string;
  nama: string;
  namaPendek: string | null;
  tagline: string | null;
  akreditasiPT: string | null;
  akreditasiSk: string | null;
  alamat: string | null;
  kota: string | null;
  kodePos: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  logoInverseUrl: string | null;
  rektorNama: string | null;
  rektorNip: string | null;
  rektorJabatan: string | null;
  bagianAkademikNama: string | null;
  kepalaBaakNama: string | null;
  kopSurat: string | null;
};

export type InstitusiPublic = Pick<
  Institusi,
  'nama' | 'namaPendek' | 'tagline' | 'akreditasiPT' | 'alamat' | 'kota' | 'telepon' | 'email' | 'website' | 'logoUrl' | 'logoInverseUrl'
>;

/** Versi authenticated — semua field termasuk pejabat & NIP. */
export const useInstitusi = () =>
  useQuery({
    queryKey: ['institusi-admin'],
    queryFn: () => apiGet<Institusi>('/akademik/institusi'),
  });

/** Versi publik (no auth) — dipakai header sidebar, kop laporan, halaman verifikasi. */
export const useInstitusiPublic = () =>
  useQuery({
    queryKey: ['institusi-public'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/public/institusi`);
      if (!res.ok) {
        throw new ApiError(res.status, 'ERROR', 'Gagal memuat identitas institusi');
      }
      return res.json() as Promise<InstitusiPublic>;
    },
    staleTime: 5 * 60 * 1000, // cache 5 menit
  });

export function useInstitusiActions() {
  const qc = useQueryClient();
  return {
    update: useMutation({
      mutationFn: (body: Partial<Institusi>) => api<Institusi>('/akademik/institusi', { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['institusi-admin'] });
        qc.invalidateQueries({ queryKey: ['institusi-public'] });
      },
    }),
  };
}
