import { supabase } from '@/lib/supabase';
import type { DiscoveryCandidate, NewDiscoveryCandidate, PublicSpot } from '@/types/discovery';

type DiscoveryCandidateRow = {
  id: string;
  name: string;
  area: string;
  address: string | null;
  region: 'ireland' | 'uk' | 'london' | 'new-york' | null;
  lat: number;
  lng: number;
  source: string;
  source_url: string | null;
  evidence: string;
  equipment_guess: string[];
  photo_url: string | null;
  attribution: string | null;
  image_status: 'none' | 'internet_verified' | 'community_verified' | null;
  image_count: number | null;
  image_urls: string[] | null;
  image_sources: string[] | null;
  image_attributions: string[] | null;
  image_diagnostics: Array<'no_google_api_key' | 'no_google_match' | 'no_osm_image' | 'image_found'> | null;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type PublicSpotRow = {
  id: string;
  discovery_candidate_id: string;
  name: string;
  area: string;
  address: string | null;
  region: 'ireland' | 'uk' | 'london' | 'new-york' | null;
  lat: number;
  lng: number;
  source: string;
  source_url: string | null;
  evidence: string;
  equipment: string[];
  photo_url: string | null;
  attribution: string | null;
  created_at: string;
};

function rowToCandidate(row: DiscoveryCandidateRow): DiscoveryCandidate {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    address: row.address || '',
    region: row.region || 'ireland',
    lat: row.lat,
    lng: row.lng,
    source: row.source,
    sourceUrl: row.source_url || '',
    evidence: row.evidence,
    equipmentGuess: row.equipment_guess || [],
    photoUrl: row.photo_url || '',
    attribution: row.attribution || '',
    imageStatus: row.image_status || 'none',
    imageCount: row.image_count || 0,
    imageUrls: row.image_urls || [],
    imageSources: row.image_sources || [],
    imageAttributions: row.image_attributions || [],
    imageDiagnostics: row.image_diagnostics || [],
    confidenceScore: row.confidence_score,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || '',
    reviewedBy: row.reviewed_by || ''
  };
}

function rowToPublicSpot(row: PublicSpotRow, index: number): PublicSpot {
  const numericId = Number.parseInt(row.id.replace(/-/g, '').slice(0, 10), 16);

  return {
    id: -Math.abs(Number.isFinite(numericId) ? numericId : 100000 + index),
    discoveryCandidateId: row.discovery_candidate_id,
    name: row.name,
    area: row.area,
    address: row.address || '',
    region: row.region || 'ireland',
    lat: row.lat,
    lng: row.lng,
    source: 'discovery',
    verified: true,
    equipment: row.equipment || [],
    sourceName: row.source || 'Admin discovery',
    sourceUrl: row.source_url || '',
    img: row.photo_url || '',
    imgCredit: row.attribution || '',
    gallery: row.photo_url ? [row.photo_url] : [],
    hiddenSpot: false,
    hiddenLevel: 'Admin reviewed',
    bestTime: '',
    notes: row.evidence,
    createdAt: row.created_at
  };
}

export function parseEquipmentGuess(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.warn('[BARMAP discovery] Admin check failed', error);
    return false;
  }

  return Boolean(data);
}

export async function fetchDiscoveryCandidates(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<DiscoveryCandidate[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('discovery_candidates')
    .select('id,name,area,address,region,lat,lng,source,source_url,evidence,equipment_guess,photo_url,attribution,image_status,image_count,image_urls,image_sources,image_attributions,image_diagnostics,confidence_score,status,created_at,reviewed_at,reviewed_by')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Discovery candidates failed to load: ${error.message}`);
  return ((data || []) as DiscoveryCandidateRow[]).map(rowToCandidate);
}

export async function createDiscoveryCandidate(input: NewDiscoveryCandidate): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const hasManualImage = Boolean(input.photoUrl);

  const { error } = await supabase.from('discovery_candidates').insert({
    name: input.name,
    area: input.area,
    address: input.address,
    region: input.region,
    lat: input.lat,
    lng: input.lng,
    source: input.source,
    source_url: input.sourceUrl,
    evidence: input.evidence,
    equipment_guess: input.equipmentGuess,
    photo_url: input.photoUrl,
    attribution: input.attribution,
    image_status: hasManualImage ? 'internet_verified' : 'none',
    image_count: hasManualImage ? 1 : 0,
    image_urls: hasManualImage ? [input.photoUrl] : [],
    image_sources: hasManualImage ? [input.source || 'Manual photo URL'] : [],
    image_attributions: hasManualImage ? [input.attribution || input.sourceUrl || 'Manual photo URL'] : [],
    image_diagnostics: hasManualImage ? ['image_found'] : [],
    confidence_score: input.confidenceScore,
    status: 'pending'
  });

  if (error) throw new Error(`Candidate creation failed: ${error.message}`);
}

export async function reviewDiscoveryCandidate(id: string, status: 'approved' | 'rejected'): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.rpc('review_discovery_candidate', {
    candidate_id: id,
    next_status: status
  });

  if (error) throw new Error(`Candidate review failed: ${error.message}`);
}

export async function verifyDiscoveryCandidateImages(id: string): Promise<{ imageCount: number; imageStatus: string; imageSources: string[]; imageDiagnostics: string[] }> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Admin session required.');

  const response = await fetch('/api/admin/discovery/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ candidateId: id })
  });
  const data = await response.json().catch(() => ({})) as { error?: string; imageCount?: number; imageStatus?: string; imageSources?: string[]; imageDiagnostics?: string[] };
  if (!response.ok) throw new Error(data.error || `Image verification failed with ${response.status}.`);

  return {
    imageCount: data.imageCount || 0,
    imageStatus: data.imageStatus || 'none',
    imageSources: data.imageSources || [],
    imageDiagnostics: data.imageDiagnostics || []
  };
}

export async function fetchApprovedDiscoveryParks(): Promise<PublicSpot[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('public_spots')
    .select('id,discovery_candidate_id,name,area,address,region,lat,lng,source,source_url,evidence,equipment,photo_url,attribution,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[BARMAP discovery] Could not load approved public spots', error);
    return [];
  }

  return ((data || []) as PublicSpotRow[]).map(rowToPublicSpot);
}

// Future discovery integrations should feed normalized rows into createDiscoveryCandidate:
// - OpenStreetMap / Overpass API search
// - Google Places enrichment
// - council page parsing
// - user-submitted verification signals
// - confidence scoring and duplicate detection
