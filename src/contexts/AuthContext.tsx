import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  startTrial: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = 'https://siftapi.blackmesa.workers.dev';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setUser({
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role,
            isTrial: data.isTrial || false,
            trialExpiresAt: data.trialExpiresAt || null,
            searchCount: data.searchCount || 0,
            remainingSearches: data.remainingSearches ?? null,
          });
        } else {
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      })
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      role: data.user.role,
      isTrial: data.user.isTrial || false,
      trialExpiresAt: data.user.trialExpiresAt || null,
      searchCount: data.user.searchCount || 0,
      remainingSearches: data.user.remainingSearches ?? null,
    });
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      role: data.user.role,
      isTrial: data.user.isTrial || false,
      trialExpiresAt: data.user.trialExpiresAt || null,
      searchCount: data.user.searchCount || 0,
      remainingSearches: data.user.remainingSearches ?? null,
    });
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Google sign-in failed' }));
      throw new Error(err.error || 'Google sign-in failed');
    }
    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      role: data.user.role,
      isTrial: data.user.isTrial || false,
      trialExpiresAt: data.user.trialExpiresAt || null,
      searchCount: data.user.searchCount || 0,
      remainingSearches: data.user.remainingSearches ?? null,
    });
  }, []);

  const startTrial = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/auth/trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Trial failed' }));
      throw new Error(err.error || 'Trial failed');
    }
    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      role: data.user.role,
      isTrial: data.user.isTrial || false,
      trialExpiresAt: data.user.trialExpiresAt || null,
      searchCount: data.user.searchCount || 0,
      remainingSearches: data.user.remainingSearches ?? null,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, startTrial, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
