import type { ParkSeed } from '@/types/park';

export type DiscoveryCandidateStatus = 'pending' | 'approved' | 'rejected';

export type DiscoveryCandidate = {
  id: string;
  name: string;
  area: string;
  address: string;
  region: DiscoveryRegion;
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
  address: string;
  region: DiscoveryRegion;
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
  address: string;
  region: DiscoveryRegion;
};

export type DiscoveryRegion = 'ireland' | 'uk' | 'london' | 'new-york';

export type DiscoveryImportResult = {
  region: DiscoveryRegion;
  searched: number;
  added: number;
  skipped: number;
  googleEnriched: number;
  candidates: Array<{
    name: string;
    area: string;
    address: string;
    lat: number;
    lng: number;
    confidenceScore: number;
  }>;
};
