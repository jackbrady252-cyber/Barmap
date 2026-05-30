import type { ParkSeed } from '@/types/park';

export type DiscoveryCandidateStatus = 'pending' | 'approved' | 'rejected';

export type DiscoveryCandidate = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  source: string;
  sourceUrl: string;
  evidence: string;
  equipmentGuess: string[];
  photoUrl: string;
  attribution: string;
  confidenceScore: number;
  status: DiscoveryCandidateStatus;
  createdAt: string;
  reviewedAt: string;
  reviewedBy: string;
};

export type NewDiscoveryCandidate = {
  name: string;
  area: string;
  lat: number;
  lng: number;
  source: string;
  sourceUrl: string;
  evidence: string;
  equipmentGuess: string[];
  photoUrl: string;
  attribution: string;
  confidenceScore: number;
};

export type PublicSpot = ParkSeed & {
  discoveryCandidateId: string;
};
