import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Park } from '@/types/park';

export type TrainingSession = {
  id: string;
  parkId: number;
  parkName: string;
  parkArea: string;
  hostUserId: string;
  title: string;
  startAt: string;
  endAt: string;
  description: string;
  participantLimit: number | null;
  createdAt: string;
};

type SessionRow = {
  id: string;
  park_id: number;
  park_name: string;
  park_area: string;
  host_user_id: string;
  title: string | null;
  start_at: string;
  end_at: string | null;
  description: string | null;
  participant_limit: number | null;
  created_at: string;
};

export type CreateSessionInput = {
  user: User;
  park: Park;
  date: string;
  startTime: string;
  endTime?: string;
  description?: string;
  participantLimit?: string;
};

function rowToSession(row: SessionRow): TrainingSession {
  return {
    id: row.id,
    parkId: row.park_id,
    parkName: row.park_name,
    parkArea: row.park_area,
    hostUserId: row.host_user_id,
    title: row.title || 'Community training session',
    startAt: row.start_at,
    endAt: row.end_at || '',
    description: row.description || '',
    participantLimit: row.participant_limit,
    createdAt: row.created_at
  };
}

function localDateTimeToIso(date: string, time: string) {
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) throw new Error('Choose a valid date and time.');
  return value.toISOString();
}

export async function createTrainingSession(input: CreateSessionInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const startAt = localDateTimeToIso(input.date, input.startTime);
  const endAt = input.endTime ? localDateTimeToIso(input.date, input.endTime) : null;
  const limit = input.participantLimit?.trim() ? Number(input.participantLimit) : null;

  if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error('End time must be after the start time.');
  }
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 200)) {
    throw new Error('Participant limit must be between 1 and 200.');
  }

  const { error } = await supabase.from('sessions').insert({
    park_id: input.park.id,
    park_name: input.park.name,
    park_area: input.park.area,
    host_user_id: input.user.id,
    title: 'Community training session',
    start_at: startAt,
    end_at: endAt,
    description: input.description?.trim() || '',
    participant_limit: limit
  });

  if (error) throw new Error(`Session save failed: ${error.message}`);
}

export async function fetchUpcomingSessions(): Promise<TrainingSession[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('id,park_id,park_name,park_area,host_user_id,title,start_at,end_at,description,participant_limit,created_at')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(80);

  if (error) {
    console.warn('[BARMAP sessions] Could not load sessions', error);
    return [];
  }

  return ((data || []) as SessionRow[]).map(rowToSession);
}
