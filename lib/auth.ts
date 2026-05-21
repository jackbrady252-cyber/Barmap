import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigStatus } from '@/lib/supabase';
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

export type UpdateProfileInput = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
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
  const normalized = (value || 'athlete')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return normalized.length >= 3 ? normalized : `user_${normalized || 'new'}`;
}

function getAuthRedirectUrl() {
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
}

function getConfigurationError() {
  if (supabaseConfigStatus.configured) return null;

  const details = [
    ...supabaseConfigStatus.missing.map(name => `${name} is missing or empty`),
    ...supabaseConfigStatus.invalid
  ];

  return `Supabase is not configured correctly: ${details.join('; ')}.`;
}

function authStageError(stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[BARMAP auth] ${stage}`, error);
  return new Error(`${stage}: ${message}`);
}

export async function getCurrentUser() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('[BARMAP auth] get current user failed', error);
    return null;
  }
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
    throw authStageError('Profile fetch failed', error);
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
    throw authStageError('Profile creation failed', error);
  }

  return rowToProfile(data);
}

export async function signUpWithEmail(input: SignUpInput) {
  const configError = getConfigurationError();
  if (!supabase || configError) throw new Error(configError || 'Supabase is not configured.');

  const username = normalizeUsername(input.username);

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        username,
        display_name: input.displayName.trim() || username,
        home_city: input.homeCity.trim()
      }
    }
  });

  if (error) throw authStageError('Sign up failed', error);
  if (!data.user) throw new Error('Sign up failed: Supabase did not return a user.');

  if (data.session) {
    await ensureProfile(data.user, { ...input, username });
  }

  return data;
}

export async function loginWithEmail(email: string, password: string) {
  const configError = getConfigurationError();
  if (!supabase || configError) throw new Error(configError || 'Supabase is not configured.');

  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw authStageError('Login failed', error);
  if (!data.session || !data.user) throw new Error('Login failed: Supabase did not return a session.');
  await ensureProfile(data.user);

  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw authStageError('Logout failed', error);
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const configError = getConfigurationError();
  if (!supabase || configError) throw new Error(configError || 'Supabase is not configured.');

  const username = normalizeUsername(input.username);
  const displayName = input.displayName.trim() || username;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      username,
      display_name: displayName,
      avatar_url: input.avatarUrl.trim(),
      bio: input.bio.trim(),
      home_city: input.homeCity.trim()
    })
    .eq('id', input.id)
    .select('id,username,display_name,avatar_url,bio,home_city,created_at')
    .single<ProfileRow>();

  if (error) throw authStageError('Profile update failed', error);
  return rowToProfile(data);
}
