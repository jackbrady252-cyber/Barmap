import { supabase } from '@/lib/supabase';
import type { UserDiscoveryProfile, UserProfile, UserStatus } from '@/types/auth';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  home_city: string | null;
  user_status: UserStatus | null;
  created_at: string;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    homeCity: row.home_city || '',
    userStatus: row.user_status || 'pending',
    createdAt: row.created_at
  };
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

export async function fetchFollowingIds(userId: string): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) throw new Error(`Following list failed to load: ${error.message}`);
  return ((data || []) as Array<{ following_id: string }>).map(row => row.following_id);
}

export async function fetchApprovedUsers(currentUserId?: string): Promise<UserDiscoveryProfile[]> {
  if (!supabase) return [];

  const [{ data: profiles, error: profilesError }, { data: follows, error: followsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,bio,home_city,user_status,created_at')
      .neq('user_status', 'rejected')
      .order('created_at', { ascending: false }),
    supabase
      .from('follows')
      .select('follower_id,following_id,created_at')
  ]);

  if (profilesError) throw new Error(`User directory failed to load: ${profilesError.message}`);
  if (followsError) throw new Error(`Follow graph failed to load: ${followsError.message}`);

  const followRows = (follows || []) as FollowRow[];
  const followerCounts = countBy(followRows.map(row => row.following_id));
  const followingCounts = countBy(followRows.map(row => row.follower_id));
  const currentFollowing = new Set(
    followRows
      .filter(row => row.follower_id === currentUserId)
      .map(row => row.following_id)
  );

  return ((profiles || []) as ProfileRow[]).map(row => {
    const profile = rowToProfile(row);
    return {
      ...profile,
      followerCount: followerCounts[profile.id] || 0,
      followingCount: followingCounts[profile.id] || 0,
      isFollowing: currentFollowing.has(profile.id)
    };
  });
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (followerId === followingId) throw new Error('You cannot follow yourself.');

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) throw new Error(`Follow failed: ${error.message}`);
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw new Error(`Unfollow failed: ${error.message}`);
}
