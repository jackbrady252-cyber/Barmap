import type { User } from '@supabase/supabase-js';
import { sanitizeFileName, type SelectedMediaFile } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import type { Park } from '@/types/park';

const PARK_MEDIA_BUCKET = 'park-media';

export type ParkMediaItem = {
  id: string;
  parkId: number;
  userId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type ParkMediaRow = {
  id: string;
  park_id: number;
  user_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

function rowToParkMedia(row: ParkMediaRow): ParkMediaItem {
  return {
    id: row.id,
    parkId: row.park_id,
    userId: row.user_id,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at
  };
}

export async function uploadParkMediaFiles(
  user: User,
  park: Park,
  media: SelectedMediaFile[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (media.length === 0) throw new Error('Choose at least one photo or video.');

  let completed = 0;
  for (const item of media) {
    const path = `${user.id}/${park.id}/${Date.now()}-${item.id}-${sanitizeFileName(item.file.name)}`;
    const { error: uploadError } = await supabase.storage.from(PARK_MEDIA_BUCKET).upload(path, item.file, {
      cacheControl: '3600',
      contentType: item.file.type || (item.mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
      upsert: false
    });
    if (uploadError) throw new Error(`Upload failed for ${item.file.name}: ${uploadError.message}`);

    const { data } = supabase.storage.from(PARK_MEDIA_BUCKET).getPublicUrl(path);
    const { error: insertError } = await supabase.from('park_media').insert({
      park_id: park.id,
      user_id: user.id,
      media_type: item.mediaType,
      media_url: data.publicUrl,
      moderation_status: 'pending'
    });
    if (insertError) throw new Error(`Media review save failed: ${insertError.message}`);

    completed += 1;
    onProgress?.(completed, media.length);
  }
}

export async function fetchApprovedParkMedia(): Promise<ParkMediaItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('park_media')
    .select('id,park_id,user_id,media_type,media_url,moderation_status,created_at')
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[BARMAP park media] Could not load approved media', error);
    return [];
  }

  return ((data || []) as ParkMediaRow[]).map(rowToParkMedia);
}

export async function fetchOwnPendingParkMedia(userId?: string): Promise<ParkMediaItem[]> {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('park_media')
    .select('id,park_id,user_id,media_type,media_url,moderation_status,created_at')
    .eq('user_id', userId)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[BARMAP park media] Could not load pending media', error);
    return [];
  }

  return ((data || []) as ParkMediaRow[]).map(rowToParkMedia);
}

export async function fetchPendingParkMediaForAdmin(): Promise<ParkMediaItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('park_media')
    .select('id,park_id,user_id,media_type,media_url,moderation_status,created_at')
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Park media failed to load: ${error.message}`);
  return ((data || []) as ParkMediaRow[]).map(rowToParkMedia);
}

export async function reviewParkMedia(id: string, status: 'approved' | 'rejected'): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('park_media')
    .update({ moderation_status: status, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Park media review failed: ${error.message}`);
}
