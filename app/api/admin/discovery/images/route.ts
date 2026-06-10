import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type CandidateRow = {
  id: string;
  name: string;
  area: string;
  address: string | null;
  lat: number;
  lng: number;
  source_url: string | null;
  photo_url: string | null;
  attribution: string | null;
};

type ImageProof = {
  url: string;
  source: string;
  attribution: string;
};

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

function uniqueImages(images: ImageProof[]) {
  const seen = new Set<string>();
  return images.filter(image => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  }).slice(0, 8);
}

function osmApiUrl(sourceUrl: string) {
  const match = sourceUrl.match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/i);
  if (!match) return '';
  return `https://www.openstreetmap.org/api/0.6/${match[1]}/${match[2]}.json`;
}

function splitImageTag(value: string) {
  return value
    .split(/[;,]\s*/)
    .map(item => item.trim())
    .filter(Boolean);
}

function commonsImageUrl(value: string) {
  const cleaned = value.trim();
  if (!/^file:/i.test(cleaned)) return '';
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cleaned)}`;
}

function imagesFromOsmTags(tags: Record<string, string>) {
  const images: ImageProof[] = [];
  const directImageKeys = Object.keys(tags).filter(key => key === 'image' || key.startsWith('image:'));

  for (const key of directImageKeys) {
    for (const url of splitImageTag(tags[key])) {
      if (/^https?:\/\//i.test(url)) {
        images.push({ url, source: 'OpenStreetMap image tag', attribution: 'OpenStreetMap contributors' });
      }
    }
  }

  for (const key of ['wikimedia_commons', 'image:commons']) {
    const commons = tags[key];
    if (!commons) continue;
    for (const value of splitImageTag(commons)) {
      const url = commonsImageUrl(value);
      if (url) images.push({ url, source: 'Wikimedia Commons via OpenStreetMap', attribution: value });
    }
  }

  return images;
}

async function searchOsmImages(candidate: CandidateRow) {
  const apiUrl = candidate.source_url ? osmApiUrl(candidate.source_url) : '';
  if (!apiUrl) return [];

  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': 'BarMap/1.0 contact: jackbrady252@gmail.com' }
  });
  if (!response.ok) return [];

  const data = await response.json().catch(() => null) as { elements?: Array<{ tags?: Record<string, string> }> } | null;
  const tags = data?.elements?.[0]?.tags || {};
  return imagesFromOsmTags(tags);
}

async function searchGoogleImages(candidate: CandidateRow) {
  const key = cleanEnvValue(process.env.GOOGLE_PLACES_API_KEY) || cleanEnvValue(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  if (!key) return [];

  const query = encodeURIComponent([candidate.name, candidate.address, candidate.area, 'outdoor gym calisthenics'].filter(Boolean).join(' '));
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${candidate.lat},${candidate.lng}&radius=180&key=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json().catch(() => null) as {
    results?: Array<{
      name?: string;
      photos?: Array<{ photo_reference?: string; html_attributions?: string[] }>;
    }>;
  } | null;
  const photos = data?.results?.[0]?.photos || [];

  return photos
    .map(photo => {
      if (!photo.photo_reference) return null;
      return {
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=900&photo_reference=${encodeURIComponent(photo.photo_reference)}&key=${encodeURIComponent(key)}`,
        source: 'Google Places Photos',
        attribution: photo.html_attributions?.join(' ') || data?.results?.[0]?.name || 'Google Places'
      };
    })
    .filter(Boolean) as ImageProof[];
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: 'Supabase session required.' }, { status: 401 });

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || !isAdmin) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { candidateId?: string };
  if (!body.candidateId) return NextResponse.json({ error: 'candidateId is required.' }, { status: 400 });

  const { data: candidate, error: candidateError } = await supabase
    .from('discovery_candidates')
    .select('id,name,area,address,lat,lng,source_url,photo_url,attribution')
    .eq('id', body.candidateId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json({ error: candidateError?.message || 'Discovery candidate not found.' }, { status: 404 });
  }

  const row = candidate as CandidateRow;
  const existingImage = row.photo_url
    ? [{ url: row.photo_url, source: 'Existing candidate photo URL', attribution: row.attribution || row.source_url || 'Existing candidate photo URL' }]
    : [];
  const [googleImages, osmImages] = await Promise.all([
    searchGoogleImages(row),
    searchOsmImages(row)
  ]);
  const images = uniqueImages([...existingImage, ...googleImages, ...osmImages]);
  const imageStatus = images.length > 0 ? 'internet_verified' : 'none';

  const { error: updateError } = await supabase
    .from('discovery_candidates')
    .update({
      image_status: imageStatus,
      image_count: images.length,
      image_urls: images.map(image => image.url),
      image_sources: images.map(image => image.source),
      image_attributions: images.map(image => image.attribution),
      photo_url: images[0]?.url || '',
      attribution: images[0]?.attribution || ''
    })
    .eq('id', row.id);

  if (updateError) return NextResponse.json({ error: `Image verification failed: ${updateError.message}` }, { status: 500 });

  return NextResponse.json({
    imageStatus,
    imageCount: images.length,
    imageSources: Array.from(new Set(images.map(image => image.source))),
    images
  });
}
