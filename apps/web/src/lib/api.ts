// Minimal fetch wrapper dengan auto-attach access token + refresh-on-401.
// State token disimpan in-memory + localStorage (refresh saja).

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';
const LS_REFRESH = 'siakad.refresh';

let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => { accessToken = t; },
  getRefresh: () => localStorage.getItem(LS_REFRESH),
  setRefresh: (t: string | null) => {
    if (t) localStorage.setItem(LS_REFRESH, t);
    else localStorage.removeItem(LS_REFRESH);
  },
  clear: () => {
    accessToken = null;
    localStorage.removeItem(LS_REFRESH);
  },
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function doRefresh(): Promise<void> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new ApiError(401, 'NO_REFRESH', 'Tidak ada refresh token');
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) {
    tokenStore.clear();
    throw new ApiError(401, 'REFRESH_FAILED', 'Sesi telah berakhir');
  }
  const data = await res.json();
  accessToken = data.accessToken;
  tokenStore.setRefresh(data.refreshToken);
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, init);

  if (res.status === 401 && tokenStore.getRefresh() && !path.startsWith('/auth/')) {
    refreshPromise ??= doRefresh().finally(() => { refreshPromise = null; });
    try {
      await refreshPromise;
      res = await rawFetch(path, init);
    } catch {
      // fallthrough — biarkan error 401 di bawah
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? res.statusText, err.details);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiPost = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiGet = <T = unknown>(path: string) => api<T>(path);
