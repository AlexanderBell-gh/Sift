/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { UserRole } from '../types';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isTrial?: boolean;
  trialExpiresAt?: number | null;
}

interface TrialInfo {
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  isLoading: boolean;
  signIn: (credentials: { username: string; password: string }) => Promise<void>;
  signUp: (credentials: { email: string; username: string; password: string }) => Promise<void>;
  createTrial: (username?: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function computeTrialInfo(user: AuthUser | null): TrialInfo {
  if (!user || !user.isTrial || !user.trialExpiresAt) {
    return { isTrial: false, isTrialExpired: false, trialDaysRemaining: null };
  }
  const now = Date.now();
  const expired = now > user.trialExpiresAt;
  const daysRemaining = expired ? 0 : Math.ceil((user.trialExpiresAt - now) / (1000 * 60 * 60 * 24));
  return { isTrial: true, isTrialExpired: expired, trialDaysRemaining: daysRemaining };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = api.getStoredUser();
    return stored || null;
  });
  const [trialInfo, setTrialInfo] = useState<TrialInfo>(() => computeTrialInfo(user));
  const [isLoading, setIsLoading] = useState(!user);

  useEffect(() => {
    const storedUser = api.getStoredUser();
    if (storedUser && !user) {
      setUser(storedUser);
      setTrialInfo(computeTrialInfo(storedUser));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    setTrialInfo(computeTrialInfo(user));
  }, [user]);

  const signIn = async (credentials: { username: string; password: string }) => {
    const response = await api.signIn(credentials);
    setUser(response.user);
  };

  const signUp = async (credentials: { email: string; username: string; password: string }) => {
    const response = await api.signUp(credentials);
    setUser(response.user);
  };

  const createTrial = async (username?: string) => {
    const response = await api.createTrial(username);
    setUser(response.user);
  };

  const signOut = () => {
    api.signOut();
    setUser(null);
    localStorage.setItem('pricetrackr_theme', 'light');
    document.documentElement.classList.remove('dark');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isTrial: trialInfo.isTrial,
        isTrialExpired: trialInfo.isTrialExpired,
        trialDaysRemaining: trialInfo.trialDaysRemaining,
        isLoading,
        signIn,
        signUp,
        createTrial,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
