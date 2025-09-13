import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';
import { Database } from '../lib/supabase';
import { isNetworkError, isRLSError, shouldTriggerOfflineMode, shouldSignOut, logSupabaseError } from '../lib/supabaseErrorHandler';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  lastKnownProfile: UserProfile | null;
  lastKnownRole: UserProfile['role'] | null;
  session: Session | null;
  loading: boolean;
  offlineReadOnly: boolean;
  setOfflineReadOnly: (value: boolean) => void;
  initTimedOut: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nom: string, phoneNumber: string, role: 'agent' | 'client') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  tryReconnectWithBackoff: () => Promise<boolean>;
  assertOnlineOrThrow: () => void;
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
  const [lastKnownProfile, setLastKnownProfile] = useState<UserProfile | null>(null);
  const [lastKnownRole, setLastKnownRole] = useState<UserProfile['role'] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineReadOnly, setOfflineReadOnly] = useState(false);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const supabase = useSupabase();

  const fetchUserProfile = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      // If no row found, return null without logging as error
      if (error) {
        // PostgREST code when 0 rows with single: PGRST116; with maybeSingle, we shouldn't get it, but keep guard
        if ((error as any)?.code === 'PGRST116') {
          return null;
        }
        
        logSupabaseError('fetchUserProfile', error);
        
        // Network or RLS errors should trigger offline mode
        if (shouldTriggerOfflineMode(error)) {
          console.warn('Network/RLS error fetching profile, triggering offline mode');
          throw error; // Re-throw to trigger offline mode
        }
        
        return null;
      }

      return data ?? null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Re-throw network/RLS errors to trigger offline mode
      if (shouldTriggerOfflineMode(error)) {
        throw error;
      }
      return null;
    }
  };

  const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
    // Ne pas créer de profil par défaut automatiquement
    // Le profil doit être créé via signUp ou manuellement
    console.log('ensureUserProfile: No profile found for user, but not auto-creating to avoid role conflicts');
    return null;
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
      // Persist last known profile/role on successful refresh
      try {
        await AsyncStorage.setItem('@lastKnownProfile', JSON.stringify(profile));
        await AsyncStorage.setItem('@lastKnownRole', JSON.stringify(profile?.role ?? null));
        setLastKnownProfile(profile ?? null);
        setLastKnownRole(profile?.role ?? null);
      } catch (persistError) {
        console.warn('AuthContext: Failed to persist lastKnownProfile/Role on refresh', persistError);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    console.log('🔐 AuthContext: Starting auth initialization...');
    
    // Safety timeout to prevent infinite loading - increased to 30s for slow networks
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ AuthContext: Safety timeout reached, forcing loading to false');
      setInitTimedOut(true);
      setLoading(false);
    }, 30000); // 30 seconds max for slow networks

    // Hydrate last known profile/role early for offline routing/read-only
    (async () => {
      try {
        const [cachedProfile, cachedRole] = await Promise.all([
          AsyncStorage.getItem('@lastKnownProfile'),
          AsyncStorage.getItem('@lastKnownRole'),
        ]);
        if (cachedProfile) {
          try {
            const parsedProfile: UserProfile = JSON.parse(cachedProfile);
            setLastKnownProfile(parsedProfile);
          } catch {}
        }
        if (cachedRole) {
          try {
            const parsedRole: UserProfile['role'] | null = JSON.parse(cachedRole);
            setLastKnownRole(parsedRole);
          } catch {}
        }
      } catch (e) {
        console.warn('AuthContext: Failed to hydrate lastKnown cache', e);
      }
    })();

    // Get initial session
    console.log('🔐 AuthContext: Getting initial session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('🔐 AuthContext: Error getting session:', error);
        clearTimeout(safetyTimeout);
        setLoading(false);
        return;
      }
      
      console.log('🔐 AuthContext: Initial session:', session ? 'Found' : 'None');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('🔐 AuthContext: Fetching profile for user:', session.user.id);
        fetchUserProfile(session.user.id).then(async (profile) => {
          console.log('🔐 AuthContext: Profile fetch result:', profile ? 'Found' : 'Not found');
          if (!profile) {
            // No profile found - user was deleted from DB, sign them out
            console.log('🔐 AuthContext: No profile found, user was deleted from DB. Signing out...');
            await signOut();
            clearTimeout(safetyTimeout);
            setLoading(false);
            return;
          } else {
            setUserProfile(profile);
            try {
              await AsyncStorage.setItem('@lastKnownProfile', JSON.stringify(profile));
              await AsyncStorage.setItem('@lastKnownRole', JSON.stringify(profile.role));
              setLastKnownProfile(profile);
              setLastKnownRole(profile.role);
            } catch (persistError) {
              console.warn('AuthContext: Failed to persist lastKnownProfile/Role on init', persistError);
            }
          }
        }).catch(error => {
          console.error('🔐 AuthContext: Error fetching profile:', error);
          setUserProfile(null);
          
          // If it's a refresh token error, show session expired screen
          if (shouldSignOut(error)) {
            console.log('🔐 AuthContext: Refresh token error detected, showing session expired');
            setSessionExpired(true);
            setLoading(false);
            return;
          }
          
          // If it's a network/RLS error, trigger offline mode
          if (shouldTriggerOfflineMode(error)) {
            console.log('🔐 AuthContext: Network/RLS error detected, enabling offline mode');
            setOfflineReadOnly(true);
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
              // No profile found - user was deleted from DB, sign them out
              console.log('🔐 AuthContext: No profile found on auth change, user was deleted from DB. Signing out...');
              await signOut();
              return;
            } else {
              setUserProfile(profile);
              try {
                await AsyncStorage.setItem('@lastKnownProfile', JSON.stringify(profile));
                await AsyncStorage.setItem('@lastKnownRole', JSON.stringify(profile.role));
                setLastKnownProfile(profile);
                setLastKnownRole(profile.role);
              } catch (persistError) {
                console.warn('AuthContext: Failed to persist lastKnownProfile/Role on auth change', persistError);
              }
            }
          } catch (error) {
            console.error('🔐 AuthContext: Error fetching profile on auth change:', error);
            setUserProfile(null);
            
            // If it's a refresh token error, show session expired screen
            if (shouldSignOut(error)) {
              console.log('🔐 AuthContext: Refresh token error on auth change, showing session expired');
              setSessionExpired(true);
              setLoading(false);
              return;
            }
            
            // If it's a network/RLS error, trigger offline mode
            if (shouldTriggerOfflineMode(error)) {
              console.log('🔐 AuthContext: Network/RLS error on auth change, enabling offline mode');
              setOfflineReadOnly(true);
            }
          } finally {
            console.log('🔐 AuthContext: Auth change profile fetch completed, setting loading to false');
            setLoading(false);
          }
        } else {
          console.log('🔐 AuthContext: No session on auth change, setting loading to false');
          setUserProfile(null);
          try {
            await AsyncStorage.removeItem('@lastKnownProfile');
            await AsyncStorage.removeItem('@lastKnownRole');
            setLastKnownProfile(null);
            setLastKnownRole(null);
          } catch {}
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Reconnexion périodique en arrière-plan quand hors-ligne
  useEffect(() => {
    let interval: any;
    if (offlineReadOnly && !loading) {
      console.log('🔄 AuthContext: Starting background reconnection...');
      interval = setInterval(async () => {
        try {
          const success = await tryReconnectWithBackoff();
          if (success) {
            console.log('🔄 AuthContext: Background reconnection successful, stopping interval');
            clearInterval(interval);
          }
        } catch (error) {
          console.warn('AuthContext: Background reconnection error:', error);
        }
      }, 10000); // Toutes les 10 secondes pour éviter de surcharger
    }
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('🔄 AuthContext: Background reconnection stopped');
      }
    };
  }, [offlineReadOnly, loading]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nom: string, phoneNumber: string, role: 'agent' | 'client') => {
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
          phone_number: phoneNumber,
          role,
          statut: 'en_attente',
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
    try {
      await AsyncStorage.removeItem('@lastKnownProfile');
      await AsyncStorage.removeItem('@lastKnownRole');
    } catch {}
    setSessionExpired(false);
    setOfflineReadOnly(false);
    setInitTimedOut(false);
  };

  const tryReconnectWithBackoff = async () => {
    const delaysMs = [1000, 3000, 5000];
    for (let i = 0; i < delaysMs.length; i++) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // If it's a refresh token error, don't retry - sign out immediately
          if (shouldSignOut(error)) {
            console.log('🔄 AuthContext: Refresh token error during reconnect, signing out');
            signOut();
            return false;
          }
          throw error;
        }
        const currentSession = data?.session ?? null;
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Refresh profile and check if it succeeds
          const profile = await fetchUserProfile(currentSession.user.id);
          if (profile) {
            setUserProfile(profile);
            // Persist successful reconnection
            try {
              await AsyncStorage.setItem('@lastKnownProfile', JSON.stringify(profile));
              await AsyncStorage.setItem('@lastKnownRole', JSON.stringify(profile.role));
              setLastKnownProfile(profile);
              setLastKnownRole(profile.role);
            } catch (persistError) {
              console.warn('AuthContext: Failed to persist on reconnect', persistError);
            }
            setOfflineReadOnly(false);
            setInitTimedOut(false);
            console.log('🔄 AuthContext: Successfully reconnected and back online');
            return true;
          }
        }
      } catch (error) {
        console.warn('AuthContext: Reconnection attempt failed:', error);
        // If it's a refresh token error, stop trying to reconnect
        if (shouldSignOut(error)) {
          console.log('🔄 AuthContext: Refresh token error during reconnect, stopping attempts');
          signOut();
          return false;
        }
      }
      await new Promise((res) => setTimeout(res, delaysMs[i]));
    }
    return false;
  };

  const assertOnlineOrThrow = () => {
    if (offlineReadOnly) {
      throw new Error('Mode hors ligne - lecture seule. Revenir en ligne pour continuer.');
    }
  };

  const value = React.useMemo(() => ({
    user,
    userProfile,
    lastKnownProfile,
    lastKnownRole,
    session,
    loading,
    offlineReadOnly,
    setOfflineReadOnly,
    initTimedOut,
    sessionExpired,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    tryReconnectWithBackoff,
    assertOnlineOrThrow,
  }), [
    user,
    userProfile,
    lastKnownProfile,
    lastKnownRole,
    session,
    loading,
    offlineReadOnly,
    initTimedOut,
    sessionExpired,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};