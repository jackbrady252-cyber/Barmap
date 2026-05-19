import { createClient } from '@supabase/supabase-js';

function cleanEnvValue(value: string | undefined) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const missingSupabaseEnv = [
  !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
  !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''
].filter(Boolean);

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.includes('supabase');
  } catch {
    return false;
  }
}

const invalidSupabaseEnv = [
  supabaseUrl && !isValidSupabaseUrl(supabaseUrl) ? 'NEXT_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL' : '',
  supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ') ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be the anon public JWT key' : ''
].filter(Boolean);

export const supabaseConfigStatus = {
  configured: missingSupabaseEnv.length === 0 && invalidSupabaseEnv.length === 0,
  missing: missingSupabaseEnv,
  invalid: invalidSupabaseEnv
};

export const supabase =
  supabaseConfigStatus.configured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      })
    : null;

export const supabaseConfigured = supabaseConfigStatus.configured;
