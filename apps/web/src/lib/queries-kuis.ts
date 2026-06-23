import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

// ---------- Dosen ----------

export type DosenKuisItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  durasiMenit: number;
  mulai: string;
  selesai: string;
  acak: boolean;
  isPublished: boolean;
  masukNilaiTugas: boolean;
  _count: { soal: number; attempt: number };
};

export const useDosenKuisList = (kelasId: string | undefined) =>
  useApi<{ items: DosenKuisItem[] }>(['dosen-kuis-list', kelasId ?? ''], `/dosen/kelas/${kelasId}/kuis`, { enabled: !!kelasId });

export type DosenKuisDetail = {
  id: string;
  judul: string;
  deskripsi: string | null;
  durasiMenit: number;
  mulai: string;
  selesai: string;
  acak: boolean;
  isPublished: boolean;
  masukNilaiTugas: boolean;
  kelasId: string;
  kelas: { id: string; kodeKelas: string; mataKuliah: { kode: string; nama: string } };
  soal: Array<{
    id: string;
    urutan: number;
    pertanyaan: string;
    opsi: string[];
    jawaban: number;
    bobot: number;
  }>;
  _count: { attempt: number };
};

export const useDosenKuisDetail = (id: string | undefined) =>
  useApi<DosenKuisDetail>(['dosen-kuis', id ?? ''], `/dosen/kuis/${id}`, { enabled: !!id });

export type KuisInput = {
  judul: string;
  deskripsi?: string | null;
  durasiMenit: number;
  mulai: string;
  selesai: string;
  acak?: boolean;
  isPublished?: boolean;
  masukNilaiTugas?: boolean;
};

export type SoalInput = {
  pertanyaan: string;
  opsi: string[];
  jawaban: number;
  bobot?: number;
  urutan?: number;
};

export function useDosenKuisActions(kelasId: string | undefined, kuisId?: string) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['dosen-kuis-list', kelasId ?? ''] });
    if (kuisId) qc.invalidateQueries({ queryKey: ['dosen-kuis', kuisId] });
  };
  return {
    create: useMutation({
      mutationFn: (input: KuisInput) => apiPost(`/dosen/kelas/${kelasId}/kuis`, input),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<KuisInput> }) =>
        api(`/dosen/kuis/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/dosen/kuis/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    addSoal: useMutation({
      mutationFn: (input: SoalInput) => apiPost(`/dosen/kuis/${kuisId}/soal`, input),
      onSuccess: inv,
    }),
    updateSoal: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<SoalInput> }) =>
        api(`/dosen/soal/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    removeSoal: useMutation({
      mutationFn: (id: string) => api(`/dosen/soal/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

export type DosenKuisHasil = {
  kuis: { id: string; judul: string; mulai: string; selesai: string; durasiMenit: number };
  items: Array<{
    mahasiswaId: string; nim: string; nama: string;
    attempt: {
      id: string; status: 'berjalan' | 'submit' | 'expired';
      mulaiPada: string; selesaiPada: string | null;
      skor: number | null; maxSkor: number | null; persen: number | null;
    } | null;
  }>;
};

export const useDosenKuisHasil = (id: string | undefined) =>
  useApi<DosenKuisHasil>(['dosen-kuis-hasil', id ?? ''], `/dosen/kuis/${id}/hasil`, { enabled: !!id });

// ---------- Mahasiswa ----------

export type MahasiswaKuisItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  durasiMenit: number;
  mulai: string;
  selesai: string;
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  attempt: {
    id: string; status: 'berjalan' | 'submit' | 'expired';
    mulaiPada: string; selesaiPada: string | null;
    skor: number | null; maxSkor: number | null; persen: number | null;
  } | null;
};

export const useMahasiswaKuisList = () =>
  useApi<{ items: MahasiswaKuisItem[] }>(['mahasiswa-kuis-list'], '/mahasiswa/kuis');

export type KuisAttempt = {
  attempt: { id: string; mulaiPada: string; deadline: string; jawaban: Record<string, number> };
  kuis: { id: string; judul: string; durasiMenit: number };
  soal: Array<{ id: string; pertanyaan: string; opsi: string[]; bobot: number }>;
};

export function useMahasiswaKuisActions(kuisId: string | undefined) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mahasiswa-kuis-list'] });
  return {
    start: useMutation({
      mutationFn: () => apiPost(`/mahasiswa/kuis/${kuisId}/start`, {}) as Promise<KuisAttempt>,
      onSuccess: inv,
    }),
    save: useMutation({
      mutationFn: (jawaban: Record<string, number>) =>
        api(`/mahasiswa/kuis/${kuisId}/jawaban`, { method: 'PATCH', body: JSON.stringify({ jawaban }) }),
    }),
    submit: useMutation({
      mutationFn: (jawaban: Record<string, number>) =>
        apiPost(`/mahasiswa/kuis/${kuisId}/submit`, { jawaban }),
      onSuccess: inv,
    }),
  };
}

export type MahasiswaKuisHasil = {
  skor: number | null; maxSkor: number | null; persen: number | null;
  selesaiPada: string | null;
  soal: Array<{
    id: string; pertanyaan: string; opsi: string[]; bobot: number;
    jawabanBenar: number; jawabanAnda: number | null;
  }>;
};

export const useMahasiswaKuisHasil = (id: string | undefined) =>
  useApi<MahasiswaKuisHasil>(['mahasiswa-kuis-hasil', id ?? ''], `/mahasiswa/kuis/${id}/hasil`, { enabled: !!id });
