import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { StudentMeta } from '@/types';

const TOKEN_KEY = 'snpsu_token';
const META_KEY  = 'snpsu_meta';
export const DEMO_TOKEN = 'demo-token-snpsu-local';
export const DEMO_SRN   = '25SUUBEAML045';
export const DEMO_PASS  = 'apa@123';

interface AuthContextType {
  isAuthenticated: boolean;
  studentMeta: StudentMeta | null;
  token: string | null;
  login: (token: string, meta: StudentMeta) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]           = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [studentMeta, setStudentMeta] = useState<StudentMeta | null>(() => {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? (JSON.parse(raw) as StudentMeta) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (studentMeta) localStorage.setItem(META_KEY, JSON.stringify(studentMeta));
    else localStorage.removeItem(META_KEY);
  }, [studentMeta]);

  const login = (t: string, meta: StudentMeta) => {
    setToken(t);
    setStudentMeta(meta);
  };

  const logout = () => {
    setToken(null);
    setStudentMeta(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      studentMeta,
      token,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

