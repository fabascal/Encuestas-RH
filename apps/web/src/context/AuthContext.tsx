import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, LoginResponse, Permission } from '@portal/shared';
import { api, ApiError, refreshSession, setAccessToken } from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the initial session hydration (silent refresh) is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    refreshSession()
      .then((session) => {
        if (cancelled || !session) return;
        setUser(session.user);
      })
      .finally(() => {
        if (cancelled) return;
        isLoadingRef.current = false;
        setIsLoading(false);
      });

    const refreshProfile = () => {
      if (isLoadingRef.current) return;
      api
        .get<AuthUser>('/auth/me')
        .then((profile) => setUser(profile))
        .catch(() => undefined);
    };
    window.addEventListener('focus', refreshProfile);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshProfile);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: Permission) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, can }),
    [user, isLoading, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
