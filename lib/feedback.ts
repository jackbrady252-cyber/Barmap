import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const FEEDBACK_BUCKET = 'feedback-screenshots';

export type FeedbackCategory = 'bug' | 'feature' | 'park_info' | 'contact';
export type FeedbackStatus = 'new' | 'reviewing' | 'resolved';

export type FeedbackInput = {
  user: User | null;
  category: FeedbackCategory;
  message: string;
  emailReply: string;
  screenshotFile?: File | null;
};

export type FeedbackReport = {
  id: string;
  userId: string;
  category: FeedbackCategory;
  message: string;
  screenshotUrl: string;
  emailReply: string;
  appVersion: string;
  deviceInfo: string;
  status: FeedbackStatus;
  createdAt: string;
};

type FeedbackRow = {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  message: string;
  screenshot_url: string | null;
  email_reply: string | null;
  app_version: string | null;
  device_info: string | null;
  status: FeedbackStatus;
  created_at: string;
};

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'feedback-screenshot';
}

function rowToFeedback(row: FeedbackRow): FeedbackReport {
  return {
    id: row.id,
    userId: row.user_id || '',
    category: row.category,
    message: row.message,
    screenshotUrl: row.screenshot_url || '',
    emailReply: row.email_reply || '',
    appVersion: row.app_version || '',
    deviceInfo: row.device_info || '',
    status: row.status,
    createdAt: row.created_at
  };
}

async function uploadScreenshot(file: File) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const path = `public/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(FEEDBACK_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'image/jpeg',
    upsert: false
  });
  if (error) throw new Error(`Screenshot upload failed: ${error.message}`);
  const { data } = supabase.storage.from(FEEDBACK_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const message = input.message.trim();
  if (!message) throw new Error('Description is required.');

  const screenshotUrl = input.screenshotFile ? await uploadScreenshot(input.screenshotFile) : '';
  const deviceInfo = typeof navigator === 'undefined' ? 'server' : navigator.userAgent;

  const { error } = await supabase.from('feedback_reports').insert({
    user_id: input.user?.id || null,
    category: input.category,
    message,
    screenshot_url: screenshotUrl,
    email_reply: input.emailReply.trim(),
    app_version: '0.1.0',
    device_info: deviceInfo,
    status: 'new'
  });
  if (error) throw new Error(`Feedback submission failed: ${error.message}`);
}

export async function fetchFeedbackReports(): Promise<FeedbackReport[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('feedback_reports')
    .select('id,user_id,category,message,screenshot_url,email_reply,app_version,device_info,status,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Feedback failed to load: ${error.message}`);
  return ((data || []) as FeedbackRow[]).map(rowToFeedback);
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('feedback_reports').update({ status }).eq('id', id);
  if (error) throw new Error(`Feedback update failed: ${error.message}`);
}
