import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types/auth';
import { authApi } from '../services/api/authApi';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    const response = await authApi.getCurrentUser();
    if (response.data) setUser(response.data);
    else {
      authApi.logout();
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    restoreSession();
    const refresh = () => restoreSession();
    window.addEventListener('auth-change', refresh);
    return () => window.removeEventListener('auth-change', refresh);
  }, []);

  const authenticate = async (mode: 'login' | 'register', username: string, password: string) => {
    setError(null);
    const response = mode === 'login'
      ? await authApi.login(username, password)
      : await authApi.register(username, password);
    if (!response.data) {
      setError(response.error || 'Authentication failed');
      return false;
    }
    setUser(response.data.user);
    window.dispatchEvent(new Event('auth-change'));
    return true;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login: (username, password) => authenticate('login', username, password),
      register: (username, password) => authenticate('register', username, password),
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
