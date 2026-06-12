import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AdminProfile {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: AdminProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback((userId: string) => {
    supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setProfile(data as AdminProfile);
        }
      })
      .catch(() => {
        // Profile fetch is non-critical
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      // If getSession fails (e.g., invalid refresh token), treat as signed out
      if (error) {
        console.warn('Session retrieval failed, signing out:', error.message);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }
      const session = data?.session;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      }
      setIsLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.warn('Session retrieval threw an error:', err);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // Handle explicit sign-out and token refresh failures
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    const subscription = data?.subscription;

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        fetchProfile(data.user.id);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    isAuthenticated: !!user && !!profile,
    isLoading,
    login,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}