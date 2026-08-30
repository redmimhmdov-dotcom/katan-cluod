import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser, Permissions } from '@/types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (perm: keyof Permissions) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'qattan_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password)
      .maybeSingle();

    if (error) return { ok: false, error: 'حدث خطأ في الاتصال' };
    if (!data) return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };

    const appUser = data as AppUser;
    if (!appUser.is_active) return { ok: false, error: 'هذا الحساب معطل. راجع المدير' };

    setUser(appUser);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasPermission = useCallback(
    (perm: keyof Permissions) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return Boolean(user.permissions?.[perm]);
    },
    [user]
  );

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
