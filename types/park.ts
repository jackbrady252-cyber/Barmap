export type ParkSource = 'osm' | 'ci' | 'hidden' | 'cm' | 'kn' | 'discovery';

export type ParkSeed = {
  id: number;
  name: string;
  area: string;
  address?: string;
  region?: string;
  lat: number;
  lng: number;
  source: ParkSource;
  verified: boolean;
  equipment: string[];
  sourceName?: string;
  sourceUrl?: string;
  img?: string;
  imgCredit?: string;
  gallery?: string[];
  hiddenSpot?: boolean;
  hiddenLevel?: string;
  bestTime?: string;
  notes?: string;
  createdAt?: string;
};

export type FeedPost = {
  user: string;
  color: number;
  time: string;
  text: string;
  tags: string[];
};

export type Meetup = {
  date: {
    m: string;
    d: number;
  };
  title: string;
  who: string;
  going: number;
};

export type Challenge = {
  name: string;
  unit: string;
  board: Array<[string, number]>;
};

export type Park = ParkSeed & {
  rating: string;
  members: number;
  feed: FeedPost[];
  meetups: Meetup[];
  challenges: Challenge[];
};

export type SubmittedSpotStatus = 'pending' | 'approved' | 'rejected';

export type SubmittedSpot = {
  id: number;
  name: string;
  area: string;
  lat: number;
  lng: number;
  equipment: string[];
  hiddenLevel: string;
  bestTime: string;
  notes: string;
  createdAt: string;
  status: SubmittedSpotStatus;
};
