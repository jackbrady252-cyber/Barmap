import type { SubmittedSpot } from '@/types/park';
import { sanitizeFileName, type SelectedMediaFile } from '@/lib/media';
import { supabase } from '@/lib/supabase';

export const SUBMISSIONS_KEY = 'barmap.hiddenSpots.v1';

type SubmittedSpotRow = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  equipment: string[];
  hidden_level: string;
  best_time: string;
  notes: string;
  photo_url?: string;
  status: SubmittedSpot['status'];
  created_at: string;
};

type NewSubmittedSpot = Omit<SubmittedSpot, 'id' | 'createdAt' | 'status'> & {
  mediaUrls?: string[];
};
const PARK_SUBMISSIONS_BUCKET = 'park-submissions';

export function equipmentFromInput(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function readSubmittedSpots(): SubmittedSpot[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = JSON.parse(window.localStorage.getItem(SUBMISSIONS_KEY) || '[]');
    return Array.isArray(saved)
      ? saved
          .filter(spot => Number.isFinite(spot.lat) && Number.isFinite(spot.lng))
          .map(spot => ({
            ...spot,
            status: spot.status || 'pending',
            createdAt: spot.createdAt || new Date().toISOString()
          }))
      : [];
  } catch (err) {
    console.warn('Could not load park submissions', err);
    return [];
  }
}

function saveSubmittedSpotLocally(spot: SubmittedSpot) {
  const submissions = readSubmittedSpots();
  submissions.push(spot);
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

function rowToSubmittedSpot(row: SubmittedSpotRow): SubmittedSpot {
  return {
    id: Number(row.id.replace(/\D/g, '').slice(0, 12)) || Date.parse(row.created_at),
    name: row.name,
    area: row.area,
    lat: row.lat,
    lng: row.lng,
    equipment: row.equipment,
    hiddenLevel: row.hidden_level,
    bestTime: row.best_time,
    notes: row.notes,
    photoUrl: row.photo_url || '',
    status: row.status,
    createdAt: row.created_at
  };
}

function createLocalSpot(input: NewSubmittedSpot): SubmittedSpot {
  return {
    ...input,
    id: Date.now(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

export async function createSubmittedSpot(input: NewSubmittedSpot): Promise<SubmittedSpot> {
  if (!supabase) {
    const localSpot = createLocalSpot(input);
    saveSubmittedSpotLocally(localSpot);
    return localSpot;
  }

  const { data, error } = await supabase
    .from('submitted_spots')
    .insert({
      name: input.name,
      area: input.area,
      lat: input.lat,
      lng: input.lng,
      equipment: input.equipment,
      hidden_level: input.hiddenLevel,
      best_time: input.bestTime,
      notes: input.notes,
      photo_url: input.photoUrl || '',
      status: 'pending'
    })
    .select('id,name,area,lat,lng,equipment,hidden_level,best_time,notes,photo_url,status,created_at')
    .single<SubmittedSpotRow>();

  if (error) {
    console.warn('Could not save park submission to Supabase. Falling back to localStorage.', error);
    const localSpot = createLocalSpot(input);
    saveSubmittedSpotLocally(localSpot);
    return localSpot;
  }

  const submittedSpot = rowToSubmittedSpot(data);

  const imageUrls = input.mediaUrls?.length ? input.mediaUrls : input.photoUrl ? [input.photoUrl] : [];
  const { error: candidateError } = await supabase.from('discovery_candidates').insert({
    name: input.name,
    area: input.area,
    address: input.area,
    region: 'ireland',
    lat: input.lat,
    lng: input.lng,
    source: 'user_submission',
    source_url: '',
    evidence: input.notes || 'Submitted by a BarMap community member.',
    equipment_guess: input.equipment,
    photo_url: input.photoUrl || '',
    attribution: 'BarMap community submission',
    image_status: imageUrls.length ? 'community_verified' : 'none',
    image_count: imageUrls.length,
    image_urls: imageUrls,
    image_sources: imageUrls.map(() => 'User uploaded media'),
    image_attributions: imageUrls.map(() => 'BarMap community submission'),
    image_diagnostics: imageUrls.length ? ['image_found'] : [],
    confidence_score: imageUrls.length ? 82 : 45,
    status: 'pending'
  });
  if (candidateError) {
    console.warn('Could not create discovery review candidate for submitted park.', candidateError);
  }

  return submittedSpot;
}

export async function fetchSubmittedSpots(): Promise<SubmittedSpot[]> {
  if (!supabase) return readSubmittedSpots();

  const { data, error } = await supabase
    .from('submitted_spots')
    .select('id,name,area,lat,lng,equipment,hidden_level,best_time,notes,photo_url,status,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Could not fetch park submissions from Supabase. Falling back to localStorage.', error);
    return readSubmittedSpots();
  }

  return (data || []).map(row => rowToSubmittedSpot(row as SubmittedSpotRow));
}

export async function uploadSubmissionPhoto(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(PARK_SUBMISSIONS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'image/jpeg',
    upsert: false
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from(PARK_SUBMISSIONS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSubmissionMediaFiles(
  userId: string,
  media: SelectedMediaFile[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (media.length === 0) throw new Error('Choose at least one photo or video.');

  const urls: string[] = [];
  for (const item of media) {
    const path = `${userId}/${Date.now()}-${item.id}-${sanitizeFileName(item.file.name)}`;
    const { error } = await supabase.storage.from(PARK_SUBMISSIONS_BUCKET).upload(path, item.file, {
      cacheControl: '3600',
      contentType: item.file.type || (item.mediaType === 'image' ? 'image/jpeg' : 'video/mp4'),
      upsert: false
    });
    if (error) throw new Error(`Upload failed for ${item.file.name}: ${error.message}`);

    const { data } = supabase.storage.from(PARK_SUBMISSIONS_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
    onProgress?.(urls.length, media.length);
  }

  return urls;
}
