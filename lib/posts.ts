import type { User } from '@supabase/supabase-js';
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

export type CreatePostInput = {
  user: User;
  profile: UserProfile | null;
  caption: string;
  mediaType: 'image' | 'video';
  imageFile?: File | null;
  park?: Park | null;
  missionTag?: string;
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

function postRowToSocialPost(row: PostRow, parks: Park[]): SocialPost {
  const matchedPark = typeof row.park_id === 'number' ? parks.find(park => park.id === row.park_id) : undefined;
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
        img: row.media_url || '',
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
    mediaType: row.media_type,
    mediaUrl: row.media_url || undefined,
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

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'post-image';
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

  return ((data || []) as unknown as PostRow[]).map(row => postRowToSocialPost(row, parks));
}

export async function createPost(input: CreatePostInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured. Add the Supabase URL and anon key before creating posts.');
  if (input.profile?.userStatus === 'rejected') throw new Error('This account cannot create posts.');

  const caption = input.caption.trim();
  if (!caption) throw new Error('Caption is required.');

  let mediaUrl = '';

  if (input.mediaType === 'image') {
    if (!input.imageFile) throw new Error('Choose an image to upload.');

    const path = `${input.user.id}/${Date.now()}-${sanitizeFileName(input.imageFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .upload(path, input.imageFile, {
        cacheControl: '3600',
        contentType: input.imageFile.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('[BARMAP posts] Media upload failed', uploadError);
      throw new Error(`Media upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
    mediaUrl = data.publicUrl;
  }

  const { error } = await supabase.from('posts').insert({
    user_id: input.user.id,
    caption,
    media_type: input.mediaType,
    media_url: mediaUrl,
    park_id: input.park?.id || null,
    location_name: input.park?.name || null,
    location_area: input.park?.area || null,
    mission_tag: input.missionTag?.trim() || null
  });

  if (error) {
    console.error('[BARMAP posts] Create failed', error);
    throw new Error(`Post creation failed: ${error.message}`);
  }
}
