import { supabase } from '@/lib/supabase';
import type { PendingUserApplication } from '@/types/adminUsers';
import type { UserStatus } from '@/types/auth';

type PendingUserApplicationRow = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  home_city: string | null;
  user_status: UserStatus;
  created_at: string;
};

function rowToApplication(row: PendingUserApplicationRow): PendingUserApplication {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    homeCity: row.home_city || '',
    userStatus: row.user_status,
    createdAt: row.created_at
  };
}

export async function fetchPendingUserApplications(): Promise<PendingUserApplication[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('list_pending_user_applications');
  if (error) throw new Error(`Pending users failed to load: ${error.message}`);

  return ((data || []) as PendingUserApplicationRow[]).map(rowToApplication);
}

export async function reviewUserApplication(userId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.rpc('review_user_application', {
    profile_id: userId,
    next_status: status
  });

  if (error) throw new Error(`User review failed: ${error.message}`);
}
