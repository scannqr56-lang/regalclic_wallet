import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, supabaseAuth, fetchSessionProfile } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionProfile, setSessionProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async () => {
    const sessionUser = await supabaseAuth.getSessionUser();
    setUser(sessionUser);

    if (sessionUser) {
      try {
        const profile = await fetchSessionProfile();
        setSessionProfile(profile);
      } catch {
        setSessionProfile({
          isPlatformAdmin: false,
          merchant: null,
          isDisabled: false,
          hasMerchantAccount: false,
        });
      }
    } else {
      setSessionProfile(null);
    }

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
    setSessionProfile(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionProfile,
        isPlatformAdmin: Boolean(sessionProfile?.isPlatformAdmin),
        isMerchantDisabled: Boolean(sessionProfile?.isDisabled),
        hasMerchantAccount: Boolean(sessionProfile?.hasMerchantAccount),
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
