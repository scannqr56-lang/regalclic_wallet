import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, supabaseAuth } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async () => {
    const sessionUser = await supabaseAuth.getSessionUser();
    setUser(sessionUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });

    return () => subscription.unsubscribe();
  }, [syncSession]);

  const logout = async () => {
    await supabaseAuth.signOut();
    setUser(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refresh: syncSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
