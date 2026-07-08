import { useQuery } from '@tanstack/react-query';
import { ApiError } from './api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export type VerifikasiData = {
  valid: true;
  institusi: { nama: string; fakultas: string };
  lulusan: {
    nim: string;
    nama: string;
    tempatLahir: string | null;
    tahunLahir: number | null; // hanya tahun (privasi — endpoint publik)
    jenisKelamin: 'L' | 'P';
    tahunMasuk: number;
  };
  pendidikan: {
    prodi: string;
    kodeProdi: string;
    jenjang: string;
    ipk: number;
    sksLulus: number;
    predikat: 'cumlaude' | 'sangat_memuaskan' | 'memuaskan' | null;
  };
  ijazah: {
    noIjazah: string | null;
    noSkl: string | null;
    tanggalLulus: string | null;
    periodeWisuda: string;
  };
  verifiedAt: string;
};

/** Tanpa auth — endpoint publik /verifikasi/:token */
export const useVerifikasiIjazah = (token: string | undefined) =>
  useQuery({
    queryKey: ['verifikasi-ijazah', token ?? ''],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/verifikasi/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = body?.error ?? {};
        throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Tidak ditemukan');
      }
      return res.json() as Promise<VerifikasiData>;
    },
    enabled: !!token,
    retry: false,
  });
