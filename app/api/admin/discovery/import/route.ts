import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { DiscoveryImportResult, DiscoveryRegion } from '@/types/discovery';

type ImportRegion = 'london' | 'new-york';

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type StoredCandidate = {
  name: string | null;
  lat: number;
  lng: number;
  source_url?: string | null;
};

type CandidateInsert = {
  name: string;
  area: string;
  address: string;
  region: DiscoveryRegion;
  lat: number;
  lng: number;
  source: string;
  source_url: string;
  evidence: string;
  equipment_guess: string[];
  photo_url: string;
  attribution: string;
  image_status: 'none' | 'internet_verified' | 'community_verified';
  image_count: number;
  image_urls: string[];
  image_sources: string[];
  image_attributions: string[];
  image_diagnostics: string[];
  confidence_score: number;
  status: 'pending';
};

const regionConfig: Record<DiscoveryRegion, { label: string; bbox: [number, number, number, number] }> = {
  ireland: { label: 'Ireland', bbox: [51.2, -10.8, 55.6, -5.4] },
  uk: { label: 'United Kingdom', bbox: [49.8, -8.7, 60.9, 1.9] },
  london: { label: 'London', bbox: [51.28, -0.51, 51.70, 0.33] },
  'new-york': { label: 'New York City', bbox: [40.4774, -74.2591, 40.9176, -73.7004] }
};

const importRegions: ImportRegion[] = ['london', 'new-york'];

function cleanEnvValue(value: string | undefined) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getSupabaseForRequest(request: NextRequest) {
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const authorization = request.headers.get('authorization') || '';

  if (!url || !anonKey || !authorization) return null;

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: authorization }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function overpassQuery(region: ImportRegion) {
  const [south, west, north, east] = regionConfig[region].bbox;
  const bbox = `${south},${west},${north},${east}`;

  return `
[out:json][timeout:60];
(
  node["leisure"="fitness_station"](${bbox});
  way["leisure"="fitness_station"](${bbox});
  relation["leisure"="fitness_station"](${bbox});
  node["sport"="calisthenics"](${bbox});
  way["sport"="calisthenics"](${bbox});
  relation["sport"="calisthenics"](${bbox});
);
out tags center;
`.trim();
}

function sourceUrl(element: OverpassElement) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function addressFromTags(tags: Record<string, string>) {
  const parts = [
    tags['addr:housename'],
    tags['addr:housenumber'] && tags['addr:street'] ? `${tags['addr:housenumber']} ${tags['addr:street']}` : tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:postcode']
  ].filter(Boolean);

  return [...new Set(parts)].join(', ');
}

function areaFromTags(tags: Record<string, string>, fallback: string) {
  return tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'] || tags['addr:county'] || tags['addr:state'] || fallback;
}

function equipmentFromTags(tags: Record<string, string>) {
  const raw = [
    tags.fitness_station,
    tags.sport,
    tags.outdoor_gym,
    tags.exercise,
    tags.equipment,
    tags.description,
    tags.name
  ].filter(Boolean).join('; ');

  const equipment = new Set<string>();
  if (/pull.?up|horizontal.?bar|calisthenics/i.test(raw)) equipment.add('Pull-up bars');
  if (/dip/i.test(raw)) equipment.add('Dip bars');
  if (/parallel/i.test(raw)) equipment.add('Parallel bars');
  if (/rings/i.test(raw)) equipment.add('Rings');
  if (/monkey/i.test(raw)) equipment.add('Monkey bars');
  if (/fitness_station|outdoor[_ -]?gym|street[_ -]?workout|fitness/i.test(raw)) equipment.add('Outdoor fitness station');

  return Array.from(equipment);
}

function evidenceFromTags(tags: Record<string, string>) {
  const evidence = [
    tags.leisure ? `leisure=${tags.leisure}` : '',
    tags.sport ? `sport=${tags.sport}` : '',
    tags.fitness_station ? `fitness_station=${tags.fitness_station}` : '',
    tags.outdoor_gym ? `outdoor_gym=${tags.outdoor_gym}` : '',
    tags.exercise ? `exercise=${tags.exercise}` : '',
    tags.equipment ? `equipment=${tags.equipment}` : '',
    addressFromTags(tags) ? `address=${addressFromTags(tags)}` : '',
    tags.description ? `description=${tags.description}` : '',
    tags.name ? `name=${tags.name}` : ''
  ].filter(Boolean);

  return evidence.join('; ');
}

function isStrongEvidence(tags: Record<string, string>, evidence: string) {
  return tags.leisure === 'fitness_station'
    || tags.sport === 'calisthenics'
    || tags.sport === 'fitness'
    || Boolean(tags.fitness_station)
    || Boolean(tags.outdoor_gym)
    || /calisthenics|street[_ -]?workout|outdoor[_ -]?gym|pull.?up|fitness station/i.test(evidence);
}

function confidenceFor(input: { lat: number; lng: number; evidence: string; address: string; photoUrl: string; strongEvidence: boolean }) {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || !input.evidence) return 25;
  if (input.photoUrl || (input.strongEvidence && input.address)) return 88;
  if (input.strongEvidence) return 76;
  return 58;
}

async function enrichWithGoogle(candidate: CandidateInsert, regionLabel: string) {
  const key = cleanEnvValue(process.env.GOOGLE_PLACES_API_KEY) || cleanEnvValue(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  if (!key) return { candidate, enriched: false };

  const query = encodeURIComponent(`${candidate.name} ${candidate.area} calisthenics outdoor gym`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${candidate.lat},${candidate.lng}&radius=150&key=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) return { candidate, enriched: false };

  const data = await response.json() as {
    results?: Array<{
      name?: string;
      formatted_address?: string;
      photos?: Array<{ photo_reference?: string; html_attributions?: string[] }>;
    }>;
  };
  const match = data.results?.[0];
  if (!match) return { candidate, enriched: false };

  const publicGoogleKey = cleanEnvValue(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const photoReference = match.photos?.[0]?.photo_reference;
  const photoUrl = publicGoogleKey && photoReference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(photoReference)}&key=${encodeURIComponent(publicGoogleKey)}`
    : candidate.photo_url;

  return {
    candidate: {
      ...candidate,
      name: match.name || candidate.name,
      address: match.formatted_address || candidate.address,
      area: candidate.area || regionLabel,
      photo_url: photoUrl,
      attribution: match.photos?.[0]?.html_attributions?.join(' ') || candidate.attribution
    },
    enriched: true
  };
}

function isDuplicate(candidate: CandidateInsert, stored: StoredCandidate[]) {
  const candidateName = normalizeName(candidate.name);
  return stored.some(item => {
    const sameSource = item.source_url && item.source_url === candidate.source_url;
    const nearby = distanceMeters(candidate.lat, candidate.lng, item.lat, item.lng) <= 120;
    const storedName = normalizeName(item.name || '');
    const candidateTokens = candidateName.split(' ').filter(token => token.length > 2);
    const storedTokens = storedName.split(' ').filter(token => token.length > 2);
    const overlap = candidateTokens.filter(token => storedTokens.includes(token)).length;
    const neededOverlap = Math.min(2, candidateTokens.length, storedTokens.length);
    const similarName = Boolean(
      candidateName
      && storedName
      && (
        candidateName === storedName
        || (candidateName.length >= 8 && storedName.includes(candidateName))
        || (storedName.length >= 8 && candidateName.includes(storedName))
        || (neededOverlap > 0 && overlap >= neededOverlap)
      )
    );
    return sameSource || (nearby && similarName);
  });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: 'Supabase session required.' }, { status: 401 });

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || !isAdmin) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { region?: DiscoveryRegion };
  const region = body.region;
  if (!region || !importRegions.includes(region as ImportRegion)) return NextResponse.json({ error: 'Region must be london or new-york.' }, { status: 400 });
  const importRegion = region as ImportRegion;

  const query = overpassQuery(importRegion);
  const overpassBody = new URLSearchParams({ data: query });
  const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'BarMap/1.0 contact: jackbrady252@gmail.com'
    },
    body: overpassBody
  });
  const overpassText = await overpassResponse.text();
  if (!overpassResponse.ok) {
    const detail = overpassText.trim().slice(0, 800);
    return NextResponse.json({ error: `Overpass failed with ${overpassResponse.status}: ${detail || 'No response body.'}` }, { status: 502 });
  }

  let overpassData: { elements?: OverpassElement[] };
  try {
    overpassData = JSON.parse(overpassText) as { elements?: OverpassElement[] };
  } catch {
    return NextResponse.json({ error: `Overpass returned invalid JSON: ${overpassText.trim().slice(0, 800) || 'No response body.'}` }, { status: 502 });
  }
  const elements = overpassData.elements || [];

  const [{ data: existingCandidates }, { data: existingSpots }] = await Promise.all([
    supabase.from('discovery_candidates').select('name,lat,lng,source_url'),
    supabase.from('public_spots').select('name,lat,lng,source_url')
  ]);
  const stored: StoredCandidate[] = [
    ...((existingCandidates || []) as StoredCandidate[]),
    ...((existingSpots || []) as StoredCandidate[])
  ];

  const batchStored: StoredCandidate[] = [];
  const inserts: CandidateInsert[] = [];
  let skipped = 0;
  let googleEnriched = 0;

  for (const element of elements) {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const evidence = evidenceFromTags(tags);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !evidence) {
      skipped += 1;
      continue;
    }

    const name = tags.name || tags.official_name || `${regionConfig[importRegion].label} fitness station`;
    const address = addressFromTags(tags);
    const area = areaFromTags(tags, regionConfig[importRegion].label);
    const equipmentGuess = equipmentFromTags(tags);
    const strongEvidence = isStrongEvidence(tags, evidence);
    const baseCandidate: CandidateInsert = {
      name,
      area,
      address,
      region: importRegion,
      lat: lat as number,
      lng: lng as number,
      source: 'openstreetmap',
      source_url: sourceUrl(element),
      evidence,
      equipment_guess: equipmentGuess,
      photo_url: '',
      attribution: 'OpenStreetMap contributors',
      image_status: 'none',
      image_count: 0,
      image_urls: [],
      image_sources: [],
      image_attributions: [],
      image_diagnostics: [],
      confidence_score: confidenceFor({ lat: lat as number, lng: lng as number, evidence, address, photoUrl: '', strongEvidence }),
      status: 'pending'
    };

    if (isDuplicate(baseCandidate, [...stored, ...batchStored])) {
      skipped += 1;
      continue;
    }

    const { candidate, enriched } = await enrichWithGoogle(baseCandidate, regionConfig[importRegion].label);
    if (enriched) googleEnriched += 1;
    if (candidate.photo_url) {
      candidate.image_status = 'internet_verified';
      candidate.image_count = 1;
      candidate.image_urls = [candidate.photo_url];
      candidate.image_sources = ['Google Places Photos'];
      candidate.image_attributions = [candidate.attribution || 'Google Places'];
      candidate.image_diagnostics = ['image_found'];
    }
    candidate.confidence_score = confidenceFor({
      lat: candidate.lat,
      lng: candidate.lng,
      evidence: candidate.evidence,
      address: candidate.address,
      photoUrl: candidate.photo_url,
      strongEvidence
    });

    inserts.push(candidate);
    batchStored.push(candidate);
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('discovery_candidates').insert(inserts);
    if (error) return NextResponse.json({ error: `Candidate import failed: ${error.message}` }, { status: 500 });
  }

  const result: DiscoveryImportResult = {
    region,
    searched: elements.length,
    added: inserts.length,
    skipped,
    googleEnriched,
    candidates: inserts.slice(0, 12).map(candidate => ({
      name: candidate.name,
      area: candidate.area,
      address: candidate.address,
      lat: candidate.lat,
      lng: candidate.lng,
      confidenceScore: candidate.confidence_score
    }))
  };

  return NextResponse.json(result);
}
