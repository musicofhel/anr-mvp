import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getMyLabel } from '../lib/db';
import type { Label } from '../lib/db';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  loading: boolean;
  user: User | null;
  label: Label | null;
  refreshLabel: (knownLabel?: Label) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [label, setLabel] = useState<Label | null>(null);

  const refreshLabel = useCallback(async (knownLabel?: Label) => {
    if (knownLabel) { setLabel(knownLabel); return; }
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    const l = await Promise.race([getMyLabel().catch(() => null), timeout]);
    if (l) setLabel(l);
  }, []);

  useEffect(() => {
    // Safety timeout — never stay on loading screen forever
    const timeout = setTimeout(() => setLoading(false), 5000);

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getMyLabel()
          .then(setLabel)
          .catch(() => {})
          .finally(() => { clearTimeout(timeout); setLoading(false); });
      } else {
        clearTimeout(timeout);
        setLoading(false);
      }
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const l = await getMyLabel().catch(() => null);
          setLabel(l);
        } else {
          setLabel(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ loading, user, label, refreshLabel }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
