import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

export type FeederEntity = 'mahasiswa' | 'dosen' | 'mata_kuliah' | 'kelas' | 'krs' | 'nilai' | 'aktivitas';
export type FeederOperation = 'create' | 'update' | 'delete';
export type FeederStatus = 'pending' | 'processing' | 'success' | 'failed' | 'skipped';

export type FeederConfig = {
  id: string;
  baseUrl: string | null;
  username: string | null;
  hasPassword: boolean;
  semesterAktif: string | null;
  dryRun: boolean;
  isEnabled: boolean;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
};

export type FeederQueueItem = {
  id: string;
  entity: FeederEntity;
  entityId: string;
  operation: FeederOperation;
  status: FeederStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  processedAt: string | null;
  createdAt: string;
};

export type FeederSyncLog = {
  id: string;
  entity: FeederEntity;
  entityId: string;
  operation: FeederOperation;
  status: FeederStatus;
  feederId: string | null;
  message: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type FeederStats = {
  pending: number; processing: number; success: number; failed: number; skipped: number;
};

export const useFeederConfig = () =>
  useApi<FeederConfig>(['feeder-config'], '/akademik/feeder/config');

export const useFeederStats = () =>
  useApi<FeederStats>(['feeder-stats'], '/akademik/feeder/queue/stats');

export const useFeederQueue = (status?: FeederStatus) => {
  const qs = status ? `?status=${status}` : '';
  return useApi<{ items: FeederQueueItem[] }>(['feeder-queue', status ?? ''], `/akademik/feeder/queue${qs}`);
};

export const useFeederLog = () =>
  useApi<{ items: FeederSyncLog[] }>(['feeder-log'], '/akademik/feeder/log');

export type FeederConfigInput = {
  baseUrl?: string | null;
  username?: string | null;
  password?: string | null;
  semesterAktif?: string | null;
  dryRun?: boolean;
  isEnabled?: boolean;
};

export function useFeederActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['feeder-config'] });
    qc.invalidateQueries({ queryKey: ['feeder-stats'] });
    qc.invalidateQueries({ queryKey: ['feeder-queue'] });
    qc.invalidateQueries({ queryKey: ['feeder-log'] });
  };
  return {
    updateConfig: useMutation({
      mutationFn: (patch: FeederConfigInput) =>
        api('/akademik/feeder/config', { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    testConnection: useMutation({
      mutationFn: () => apiPost<{ ok: boolean; message?: string }>('/akademik/feeder/test-connection', {}),
      onSuccess: inv,
    }),
    processQueue: useMutation({
      mutationFn: (take?: number) =>
        apiPost<{ processed: number; success: number; failed: number; skipped: number }>('/akademik/feeder/queue/process', { take }),
      onSuccess: inv,
    }),
    retryItem: useMutation({
      mutationFn: (id: string) => apiPost(`/akademik/feeder/queue/${id}/retry`, {}),
      onSuccess: inv,
    }),
    removeItem: useMutation({
      mutationFn: (id: string) => api(`/akademik/feeder/queue/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}
