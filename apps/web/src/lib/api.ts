// Minimal fetch wrapper dengan auto-attach access token + refresh-on-401.
// Refresh token TIDAK lagi disimpan di localStorage — server menyimpannya
// sebagai cookie httpOnly (tak terjangkau JavaScript → aman dari XSS). Access
// token hanya in-memory. `sessionActive` menandai apakah kita (mungkin) punya
// sesi via cookie; cookie httpOnly tak bisa dibaca JS, jadi kita lacak sendiri.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

let accessToken: string | null = null;
let sessionActive = false;
let refreshPromise: Promise<void> | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => { accessToken = t; },
  markSession: (v: boolean) => { sessionActive = v; },
  hasSession: () => sessionActive,
  clear: () => { accessToken = null; sessionActive = false; },
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
  // credentials: 'include' → cookie refresh httpOnly ikut terkirim (perlu utk
  // lintas-origin dev; no-op untuk same-origin prod).
  return fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
}

async function doRefresh(): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}', // refresh token dibawa cookie httpOnly, bukan body
  });
  if (!res.ok) {
    tokenStore.clear();
    throw new ApiError(401, 'REFRESH_FAILED', 'Sesi telah berakhir');
  }
  const data = await res.json();
  accessToken = data.accessToken;
  sessionActive = true;
}

/** Coba pulihkan sesi dari cookie httpOnly saat aplikasi dimuat. */
export async function tryRestoreSession(): Promise<boolean> {
  try { await doRefresh(); return true; } catch { return false; }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, init);

  // Auto-refresh on 401 — kecualikan endpoint refresh sendiri untuk hindari loop,
  // dan endpoint login (refresh token tidak relevan saat login).
  // Endpoint lain (termasuk /auth/me yang dipakai bootstrap session di tab baru) harus boleh di-refresh.
  if (
    res.status === 401 &&
    tokenStore.hasSession() &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
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
