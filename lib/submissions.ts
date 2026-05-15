import type { SubmittedSpot } from '@/types/park';
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
  status: SubmittedSpot['status'];
  created_at: string;
};

type NewSubmittedSpot = Omit<SubmittedSpot, 'id' | 'createdAt' | 'status'>;

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
      status: 'pending'
    })
    .select('id,name,area,lat,lng,equipment,hidden_level,best_time,notes,status,created_at')
    .single<SubmittedSpotRow>();

  if (error) {
    console.warn('Could not save park submission to Supabase. Falling back to localStorage.', error);
    const localSpot = createLocalSpot(input);
    saveSubmittedSpotLocally(localSpot);
    return localSpot;
  }

  return rowToSubmittedSpot(data);
}

export async function fetchSubmittedSpots(): Promise<SubmittedSpot[]> {
  if (!supabase) return readSubmittedSpots();

  const { data, error } = await supabase
    .from('submitted_spots')
    .select('id,name,area,lat,lng,equipment,hidden_level,best_time,notes,status,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Could not fetch park submissions from Supabase. Falling back to localStorage.', error);
    return readSubmittedSpots();
  }

  return (data || []).map(row => rowToSubmittedSpot(row as SubmittedSpotRow));
}
