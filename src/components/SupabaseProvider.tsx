'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import supabase from '@/lib/supabaseClient';
import type { User, UserRole } from '@/lib/types';

interface SupabaseContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

const resolveRole = (role: string | null | undefined): UserRole =>
  role === 'admin' ? 'admin' : 'user';

type SessionUser = {
  id: string;
  email?: string | null;
};

const buildUserFallback = (sessionUser: SessionUser): User => ({
  id: sessionUser.id,
  name: sessionUser.email || 'User',
  email: sessionUser.email || '',
  role: 'user',
  avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(sessionUser.email || sessionUser.id)}`,
  createdAt: new Date().toISOString(),
});

const buildUserFromProfile = (
  sessionUser: SessionUser,
  profile: ProfileRow | null,
): User => {
  if (!profile) {
    return buildUserFallback(sessionUser);
  }

  const fallbackName = profile.full_name || profile.email || sessionUser.email || 'User';
  const fallbackEmail = profile.email || sessionUser.email || '';
  const avatarSeed = profile.avatar_url || fallbackEmail || sessionUser.id;

  return {
    id: profile.id,
    name: fallbackName,
    email: fallbackEmail,
    role: resolveRole(profile.role),
    avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(avatarSeed)}`,
    createdAt: profile.created_at ?? new Date().toISOString(),
  };
};

const PROFILE_SELECT = 'id, email, role, full_name, avatar_url, created_at';

const fetchProfileRow = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          'Supabase profile lookup failed (falling back to session details).',
          error,
        );
      }
      return { data: null };
    }

    return { data: data ?? null };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase profile lookup threw unexpectedly; using fallback user.', error);
    }
    return { data: null };
  }
};

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Special case for atharv@gmail.com - treat as admin
          if (session.user.email === 'atharv@gmail.com') {
            setUser({
              id: session.user.id,
              name: 'Atharv',
              email: session.user.email,
              role: 'admin',
              avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(session.user.id)}`,
              createdAt: new Date().toISOString(),
            });
            setIsLoading(false);
            return;
          }

          const profile = await fetchProfileRow(session.user.id);
          setUser(buildUserFromProfile(session.user, profile.data ?? null));
        }
      } catch (error) {
        console.error('Unexpected error in checkSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Special case for atharv@gmail.com - treat as admin
        if (session.user.email === 'atharv@gmail.com') {
          setUser({
            id: session.user.id,
            name: 'Atharv',
            email: session.user.email,
            role: 'admin',
            avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(session.user.id)}`,
            createdAt: new Date().toISOString(),
          });
          setIsLoading(false);
          return;
        }

        // Fetch user profile with error handling
        (async () => {
          const profile = await fetchProfileRow(session.user.id);
          setUser(buildUserFromProfile(session.user, profile.data ?? null));
            setIsLoading(false);
        })();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <SupabaseContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}