import { supabase } from '@/lib/supabase';

type SavedPostRow = {
  post_id: string;
};

export async function fetchSavedPostIds(userId: string): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[BARMAP saved posts] Fetch failed', error);
    throw new Error(`Saved posts fetch failed: ${error.message}`);
  }

  return ((data || []) as SavedPostRow[]).map(row => row.post_id);
}

export async function savePostForUser(userId: string, postId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('saved_posts')
    .upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' });

  if (error) {
    console.error('[BARMAP saved posts] Save failed', error);
    throw new Error(`Save failed: ${error.message}`);
  }
}

export async function unsavePostForUser(userId: string, postId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) {
    console.error('[BARMAP saved posts] Unsave failed', error);
    throw new Error(`Unsave failed: ${error.message}`);
  }
}
