import type { User } from '@supabase/supabase-js';
import { sanitizeFileName, type SelectedMediaFile } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/auth';
import type { Park } from '@/types/park';
import type { SocialPost, SocialUser } from '@/types/social';

const POST_MEDIA_BUCKET = 'post-media';

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  home_city: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  caption: string;
  media_type: 'image' | 'video';
  media_url: string | null;
  park_id: number | null;
  location_name: string | null;
  location_area: string | null;
  mission_tag: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  profiles?: ProfileRow | ProfileRow[] | null;
};

type PostMediaRow = {
  id: string;
  post_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  position: number;
};

export type CreatePostInput = {
  user: User;
  profile: UserProfile | null;
  caption: string;
  mediaFiles: SelectedMediaFile[];
  park?: Park | null;
  missionTag?: string;
  onProgress?: (completed: number, total: number) => void;
};

function initialsFor(name: string, fallback: string) {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || fallback.slice(0, 2).toUpperCase() || 'BM';
}

function userFromProfile(profile: ProfileRow | null | undefined, fallbackUserId: string): SocialUser {
  const name = profile?.display_name || profile?.username || 'BARMAP Athlete';
  const username = profile?.username || fallbackUserId.slice(0, 8);

  return {
    id: profile?.id || fallbackUserId,
    name,
    handle: `@${username}`,
    initials: initialsFor(name, username),
    home: profile?.home_city || 'Ireland',
    role: 'community athlete'
  };
}

function profileFromJoined(row: PostRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function relativeTime(value: string) {
  const created = new Date(value).getTime();
  const diff = Date.now() - created;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (!Number.isFinite(created)) return 'now';
  if (diff < minute) return 'now';
  if (diff < hour) return `${Math.floor(diff / minute)} min`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} days`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function postRowToSocialPost(row: PostRow, parks: Park[], mediaRows: PostMediaRow[] = []): SocialPost {
  const matchedPark = typeof row.park_id === 'number' ? parks.find(park => park.id === row.park_id) : undefined;
  const mediaItems = mediaRows
    .filter(item => item.post_id === row.id)
    .sort((a, b) => a.position - b.position)
    .map(item => ({
      id: item.id,
      mediaType: item.media_type,
      mediaUrl: item.media_url,
      position: item.position
    }));
  const firstMedia = mediaItems[0];
  const fallbackPark = row.location_name
    ? ({
        id: row.park_id || -1,
        name: row.location_name,
        area: row.location_area || 'Tagged spot',
        lat: 0,
        lng: 0,
        equipment: [],
        hiddenLevel: '',
        bestTime: '',
        verified: false,
        img: firstMedia?.mediaUrl || row.media_url || '',
        source: 'cm',
        sourceUrl: '',
        rating: 'New',
        members: 0,
        feed: [],
        meetups: [],
        challenges: []
      } satisfies Park)
    : undefined;

  return {
    id: row.id,
    user: userFromProfile(profileFromJoined(row), row.user_id),
    park: matchedPark || fallbackPark,
    mediaType: firstMedia?.mediaType || row.media_type,
    mediaUrl: firstMedia?.mediaUrl || row.media_url || undefined,
    mediaItems: mediaItems.length
      ? mediaItems
      : row.media_url
        ? [{ id: `${row.id}-legacy-media`, mediaType: row.media_type, mediaUrl: row.media_url, position: 0 }]
        : [],
    caption: row.caption,
    challenge: row.mission_tag || undefined,
    tags: row.mission_tag ? ['mission'] : [],
    likes: row.likes_count || 0,
    comments: row.comments_count || 0,
    saved: false,
    time: relativeTime(row.created_at),
    createdBy: row.user_id,
    createdAt: row.created_at
  };
}

export async function fetchPosts(parks: Park[]): Promise<SocialPost[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      caption,
      media_type,
      media_url,
      park_id,
      location_name,
      location_area,
      mission_tag,
      likes_count,
      comments_count,
      created_at,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url,
        home_city
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[BARMAP posts] Fetch failed', error);
    throw new Error(`Post fetch failed: ${error.message}`);
  }

  const rows = (data || []) as unknown as PostRow[];
  const postIds = rows.map(row => row.id);
  let mediaRows: PostMediaRow[] = [];

  if (postIds.length > 0) {
    const { data: mediaData, error: mediaError } = await supabase
      .from('post_media')
      .select('id,post_id,media_type,media_url,position')
      .in('post_id', postIds)
      .order('position', { ascending: true });

    if (mediaError) {
      console.warn('[BARMAP posts] Post media fetch failed; falling back to legacy media fields', mediaError);
    } else {
      mediaRows = (mediaData || []) as PostMediaRow[];
    }
  }

  return rows.map(row => postRowToSocialPost(row, parks, mediaRows));
}

export async function createPost(input: CreatePostInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured. Add the Supabase URL and anon key before creating posts.');
  if (input.profile?.userStatus === 'rejected') throw new Error('This account cannot create posts.');

  const caption = input.caption.trim();
  if (!caption) throw new Error('Caption is required.');
  if (input.mediaFiles.length === 0) throw new Error('Choose at least one photo or video.');

  const uploaded = [];
  let completed = 0;
  for (const item of input.mediaFiles) {
    const path = `${input.user.id}/${Date.now()}-${item.id}-${sanitizeFileName(item.file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .upload(path, item.file, {
        cacheControl: '3600',
        contentType: item.file.type || (item.mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
        upsert: false
      });

    if (uploadError) {
      console.error('[BARMAP posts] Media upload failed', uploadError);
      throw new Error(`Media upload failed for ${item.file.name}: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
    uploaded.push({ ...item, mediaUrl: data.publicUrl });
    completed += 1;
    input.onProgress?.(completed, input.mediaFiles.length);
  }

  const first = uploaded[0];
  const { data: postData, error } = await supabase.from('posts').insert({
    user_id: input.user.id,
    caption,
    media_type: first.mediaType,
    media_url: first.mediaUrl,
    park_id: input.park?.id || null,
    location_name: input.park?.name || null,
    location_area: input.park?.area || null,
    mission_tag: input.missionTag?.trim() || null
  }).select('id').single<{ id: string }>();

  if (error) {
    console.error('[BARMAP posts] Create failed', error);
    throw new Error(`Post creation failed: ${error.message}`);
  }

  const { error: mediaError } = await supabase.from('post_media').insert(
    uploaded.map((item, position) => ({
      post_id: postData.id,
      media_type: item.mediaType,
      media_url: item.mediaUrl,
      position
    }))
  );

  if (mediaError) {
    console.error('[BARMAP posts] Post media insert failed', mediaError);
    throw new Error(`Post media save failed: ${mediaError.message}`);
  }
}
