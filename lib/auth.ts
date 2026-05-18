import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/auth';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  home_city: string | null;
  created_at: string;
};

type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  homeCity: string;
};

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    homeCity: row.home_city || '',
    createdAt: row.created_at
  };
}

function usernameFromEmail(email?: string) {
  return (email?.split('@')[0] || 'bar athlete')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

function normalizeUsername(value: string) {
  return (value || 'athlete')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

export async function getCurrentUser() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,bio,home_city,created_at')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.warn('Could not fetch profile', error);
    return null;
  }

  return data ? rowToProfile(data) : null;
}

export async function ensureProfile(user: User, input?: Partial<SignUpInput>): Promise<UserProfile | null> {
  if (!supabase) return null;

  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const metadata = user.user_metadata || {};
  const username = normalizeUsername(input?.username || metadata.username || usernameFromEmail(user.email));
  const displayName = input?.displayName || metadata.display_name || username;
  const homeCity = input?.homeCity || metadata.home_city || '';

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username,
      display_name: displayName,
      avatar_url: '',
      bio: '',
      home_city: homeCity
    })
    .select('id,username,display_name,avatar_url,bio,home_city,created_at')
    .single<ProfileRow>();

  if (error) {
    console.warn('Could not create profile', error);
    return fetchProfile(user.id);
  }

  return rowToProfile(data);
}

export async function signUpWithEmail(input: SignUpInput) {
  if (!supabase) throw new Error('Supabase is not configured yet.');

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        display_name: input.displayName,
        home_city: input.homeCity
      }
    }
  });

  if (error) throw error;
  if (data.user && data.session) await ensureProfile(data.user, input);

  return data;
}

export async function loginWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) await ensureProfile(data.user);

  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
