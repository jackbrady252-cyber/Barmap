import type { SubmittedSpot } from '@/types/park';

export const SUBMISSIONS_KEY = 'barmap.hiddenSpots.v1';

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
    return Array.isArray(saved) ? saved.filter(spot => Number.isFinite(spot.lat) && Number.isFinite(spot.lng)) : [];
  } catch (err) {
    console.warn('Could not load park submissions', err);
    return [];
  }
}

export function saveSubmittedSpot(spot: SubmittedSpot) {
  const submissions = readSubmittedSpots();
  submissions.push(spot);
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}
