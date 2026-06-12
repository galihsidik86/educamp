// Forum diskusi per kelas — shared antara mahasiswa & dosen.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type ForumKelasItem = {
  kelasId: string;
  kodeMK: string;
  namaMK: string;
  kodeKelas: string;
  semester: string;
  dosen?: string;
  totalThread: number;
};
export const useForumKelas = () =>
  useApi<{ items: ForumKelasItem[] }>(['forum-kelas'], '/forum/kelas');

export type ForumAuthor = {
  role: 'mahasiswa' | 'dosen';
  identitas: string;
  nama: string;
};

export type ForumThreadItem = {
  id: string;
  judul: string;
  isPinned: boolean;
  isLocked: boolean;
  totalReply: number;
  createdAt: string;
  author: ForumAuthor | null;
};

export type ForumKelasDetail = {
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  role: 'mahasiswa' | 'dosen';
  items: ForumThreadItem[];
};
export const useForumKelasThreads = (kelasId: string | undefined) =>
  useApi<ForumKelasDetail>(['forum-kelas', kelasId], `/forum/kelas/${kelasId}`, { enabled: !!kelasId });

export type ForumThreadDetail = {
  role: 'mahasiswa' | 'dosen';
  canModerate: boolean;
  thread: {
    id: string; judul: string; isi: string;
    isPinned: boolean; isLocked: boolean;
    createdAt: string;
    author: ForumAuthor | null;
    authorMahasiswaId: string | null;
    authorDosenId: string | null;
  };
  replies: Array<{
    id: string; isi: string; createdAt: string;
    author: ForumAuthor | null;
    authorMahasiswaId: string | null;
    authorDosenId: string | null;
  }>;
};
export const useForumThread = (id: string | undefined) =>
  useApi<ForumThreadDetail>(['forum-thread', id], `/forum/thread/${id}`, { enabled: !!id });

export function useForumActions(kelasId?: string, threadId?: string) {
  const qc = useQueryClient();
  const invAll = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['forum-kelas'] }),
    kelasId ? qc.invalidateQueries({ queryKey: ['forum-kelas', kelasId] }) : Promise.resolve(),
    threadId ? qc.invalidateQueries({ queryKey: ['forum-thread', threadId] }) : Promise.resolve(),
  ]);
  return {
    createThread: useMutation({
      mutationFn: (body: { judul: string; isi: string }) => apiPost(`/forum/kelas/${kelasId}`, body),
      onSuccess: invAll,
    }),
    reply: useMutation({
      mutationFn: ({ id, isi }: { id: string; isi: string }) => apiPost(`/forum/thread/${id}/reply`, { isi }),
      onSuccess: invAll,
    }),
    moderate: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: { isPinned?: boolean; isLocked?: boolean } }) =>
        api(`/forum/thread/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: invAll,
    }),
    deleteThread: useMutation({
      mutationFn: (id: string) => api(`/forum/thread/${id}`, { method: 'DELETE' }),
      onSuccess: invAll,
    }),
    deleteReply: useMutation({
      mutationFn: (id: string) => api(`/forum/reply/${id}`, { method: 'DELETE' }),
      onSuccess: invAll,
    }),
  };
}
