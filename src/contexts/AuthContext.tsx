import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';
import { Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nom: string, role: 'agent' | 'client') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // If no row found, return null without logging as error
      if (error) {
        // PostgREST code when 0 rows with single: PGRST116; with maybeSingle, we shouldn't get it, but keep guard
        if ((error as any)?.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data ?? null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
    // Try to create a minimal default profile if missing
    try {
      const defaultNom = user.email?.split('@')[0] || 'Utilisateur';
      const defaultRole: 'agent' | 'client' | 'admin' = 'client';

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          nom: defaultNom,
          role: defaultRole,
          statut: 'actif',
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error auto-creating user profile:', error);
        return null;
      }

      return data as unknown as UserProfile;
    } catch (error) {
      console.error('Error auto-creating user profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    console.log('🔐 AuthContext: Starting auth initialization...');
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ AuthContext: Safety timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 seconds max

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthContext: Initial session:', session ? 'Found' : 'None');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('🔐 AuthContext: Fetching profile for user:', session.user.id);
        fetchUserProfile(session.user.id).then(async (profile) => {
          if (!profile) {
            // Attempt to create a default profile (handles earlier failed inserts)
            const created = await ensureUserProfile(session.user!);
            setUserProfile(created);
          } else {
            setUserProfile(profile);
          }
        }).finally(() => {
          console.log('🔐 AuthContext: Profile fetch completed, setting loading to false');
          clearTimeout(safetyTimeout);
          setLoading(false);
        });
      } else {
        console.log('🔐 AuthContext: No session, setting loading to false');
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    }).catch(error => {
      console.error('🔐 AuthContext: Error getting session:', error);
      clearTimeout(safetyTimeout);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthContext: Auth state change:', event, session ? 'Session' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            console.log('🔐 AuthContext: Fetching profile on auth change for user:', session.user.id);
            const profile = await fetchUserProfile(session.user.id);
            if (!profile) {
              const created = await ensureUserProfile(session.user);
              setUserProfile(created);
            } else {
              setUserProfile(profile);
            }
          } catch (error) {
            console.error('🔐 AuthContext: Error fetching profile on auth change:', error);
            setUserProfile(null);
          } finally {
            console.log('🔐 AuthContext: Auth change profile fetch completed, setting loading to false');
            setLoading(false);
          }
        } else {
          console.log('🔐 AuthContext: No session on auth change, setting loading to false');
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nom: string, role: 'agent' | 'client') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { error };

    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          nom,
          role,
          statut: 'actif',
        })
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return { error: profileError };
      }

      // Create role-specific record
      if (role === 'agent') {
        const qrCode = `agent_${data.user.id}_${Date.now()}`;
        const { error: agentError } = await supabase
          .from('agents')
          .insert({
            user_id: data.user.id,
            disponibilite: 'disponible',
            qr_code: qrCode,
          });

        if (agentError) {
          console.error('Error creating agent record:', agentError);
        }
      } else if (role === 'client') {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: data.user.id,
            historique_scans: [],
          });

        if (clientError) {
          console.error('Error creating client record:', clientError);
        }
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};