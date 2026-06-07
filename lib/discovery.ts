import { supabase } from '@/lib/supabase';
import type { DiscoveryCandidate, NewDiscoveryCandidate, PublicSpot } from '@/types/discovery';

type DiscoveryCandidateRow = {
  id: string;
  name: string;
  area: string;
  address: string | null;
  region: 'ireland' | 'uk' | 'new-york' | null;
  lat: number;
  lng: number;
  source: string;
  source_url: string | null;
  evidence: string;
  equipment_guess: string[];
  photo_url: string | null;
  attribution: string | null;
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
  region: 'ireland' | 'uk' | 'new-york' | null;
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
    confidenceScore: row.confidence_score,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || '',
    reviewedBy: row.reviewed_by || ''
  };
}

function rowToPublicSpot(row: PublicSpotRow, index: number): PublicSpot {
  return {
    id: -100000 - index - Math.abs(row.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0)),
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
    .select('id,name,area,address,region,lat,lng,source,source_url,evidence,equipment_guess,photo_url,attribution,confidence_score,status,created_at,reviewed_at,reviewed_by')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Discovery candidates failed to load: ${error.message}`);
  return ((data || []) as DiscoveryCandidateRow[]).map(rowToCandidate);
}

export async function createDiscoveryCandidate(input: NewDiscoveryCandidate): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

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
