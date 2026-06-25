import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, tokenStore, ApiError } from './api';

export type Role = 'mahasiswa' | 'dosen' | 'akademik' | 'wali';
export type AkademikSubRole = 'super_admin' | 'akademik' | 'keuangan' | 'prodi' | 'spmi';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  passwordMustChange?: boolean;
  isActive?: boolean;
  // profile details from /auth/me
  mahasiswa?: { nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string; fakultas: { nama: string } } } | null;
  dosen?: { nidn: string; nama: string; gelarDepan?: string | null; gelarBelakang?: string | null; prodi: { kode: string; nama: string } } | null;
  akademik?: {
    nama: string;
    jabatan?: string | null;
    subRole?: AkademikSubRole;
    prodiId?: string | null;
  } | null;
  wali?: { nama: string; telepon: string | null } | null;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser };

type AuthContextValue = {
  state: AuthState;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refreshProfile = useCallback(async () => {
    try {
      const me = await apiGet<AuthUser>('/auth/me');
      setState({ status: 'authenticated', user: me });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        tokenStore.clear();
        setState({ status: 'unauthenticated' });
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    // jika ada refresh token, coba bootstrap session
    const hasRefresh = tokenStore.getRefresh();
    if (!hasRefresh) {
      setState({ status: 'unauthenticated' });
      return;
    }
    refreshProfile().catch(() => setState({ status: 'unauthenticated' }));
  }, [refreshProfile]);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await apiPost<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; role: Role };
    }>('/auth/login', { identifier, password });
    tokenStore.setAccess(res.accessToken);
    tokenStore.setRefresh(res.refreshToken);
    const me = await apiGet<AuthUser>('/auth/me');
    setState({ status: 'authenticated', user: me });
    return me;
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try { await apiPost('/auth/logout', { refreshToken: refresh }); } catch { /* ignore */ }
    tokenStore.clear();
    setState({ status: 'unauthenticated' });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout, refreshProfile }), [state, login, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireAuth(): AuthUser {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('Not authenticated');
  return state.user;
}
