// Auth hook for Supabase authentication
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  plan: string;
  songs_generated: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isRecoverySession: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile | null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Detect PASSWORD_RECOVERY event to prevent redirect
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoverySession(true);
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
          // Clear recovery session when user signs out
          setIsRecoverySession(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name: name || null }
        }
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const handleSignOut = async () => {
    console.log('[Auth] Initiating sign out...');
    
    try {
      // Use 'local' scope to ensure local cleanup even if server session is gone
      await supabase.auth.signOut({ scope: 'local' });
      console.log('[Auth] Supabase signOut completed');
    } catch (error) {
      // Log but don't throw - we'll clean up locally anyway
      console.error('[Auth] SignOut API error:', error);
    }
    
    // CRITICAL: Always clear state regardless of API result
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Force clear all Supabase-related localStorage items
    try {
      const storageKeys = Object.keys(localStorage);
      const supabaseKeys = storageKeys.filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') ||
        key.includes('auth-token')
      );
      
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('[Auth] Removed localStorage key:', key);
      });
      
      console.log('[Auth] Local cleanup complete. Removed', supabaseKeys.length, 'keys');
    } catch (e) {
      console.error('[Auth] localStorage cleanup error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isRecoverySession, signUp, signIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
