'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons';
import { filesToMedia, revokeMediaPreviews, type SelectedMediaFile } from '@/lib/media';
import { createPost } from '@/lib/posts';
import { createTrainingSession } from '@/lib/sessions';
import type { UserProfile } from '@/types/auth';
import type { Park } from '@/types/park';

type CreatePostModalProps = {
  open: boolean;
  user: User | null;
  profile: UserProfile | null;
  parks: Park[];
  onClose: () => void;
  onCreated: () => void;
  onSessionCreated: () => void;
  onSubmitPark: () => void;
  onAuthRequired: () => void;
};

type CreateMode = 'choices' | 'post' | 'session';

export default function CreatePostModal({
  open,
  user,
  profile,
  parks,
  onClose,
  onCreated,
  onSessionCreated,
  onSubmitPark,
  onAuthRequired
}: CreatePostModalProps) {
  const [mode, setMode] = useState<CreateMode>('choices');
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<SelectedMediaFile[]>([]);
  const [parkId, setParkId] = useState('');
  const [missionTag, setMissionTag] = useState('');
  const [sessionParkId, setSessionParkId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionLimit, setSessionLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');

  const selectedPark = useMemo(() => parks.find(park => String(park.id) === parkId) || null, [parkId, parks]);
  const selectedSessionPark = useMemo(() => parks.find(park => String(park.id) === sessionParkId) || null, [sessionParkId, parks]);

  if (!open) return null;

  function resetPost() {
    revokeMediaPreviews(mediaFiles);
    setCaption('');
    setMediaFiles([]);
    setParkId('');
    setMissionTag('');
    setProgress('');
  }

  function closeModal() {
    resetPost();
    setMode('choices');
    setMessage('');
    onClose();
  }

  function addPostMedia(files: FileList | null) {
    if (!files) return;
    const next = filesToMedia(files);
    setMessage(next.errors.join(' '));
    setMediaFiles(current => [...current, ...next.media].slice(0, 10));
  }

  function removePostMedia(id: string) {
    setMediaFiles(current => {
      const target = current.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter(item => item.id !== id);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!user) {
      onAuthRequired();
      return;
    }

    try {
      setSubmitting(true);
      setProgress(`Uploading 0/${mediaFiles.length}`);
      await createPost({
        user,
        profile,
        caption,
        mediaFiles,
        park: selectedPark,
        missionTag,
        onProgress: (completed, total) => setProgress(`Uploading ${completed}/${total}`)
      });
      resetPost();
      onCreated();
      closeModal();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Post creation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSessionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!user) {
      onAuthRequired();
      return;
    }
    if (!selectedSessionPark) {
      setMessage('Choose a park for the session.');
      return;
    }

    try {
      setSubmitting(true);
      await createTrainingSession({
        user,
        park: selectedSessionPark,
        date: sessionDate,
        startTime: sessionStart,
        endTime: sessionEnd,
        description: sessionDescription,
        participantLimit: sessionLimit
      });
      setSessionParkId('');
      setSessionDate('');
      setSessionStart('');
      setSessionEnd('');
      setSessionDescription('');
      setSessionLimit('');
      setMode('choices');
      onSessionCreated();
      closeModal();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Session save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-bg open">
      <section className="modal create-post-modal" role="dialog" aria-modal="true" aria-label="Create post">
        <button className="panel-close" type="button" onClick={closeModal} aria-label="Close create">
          <CloseIcon />
        </button>
        <div className="modal-head">
          <div className="modal-icon">
            <PlusIcon />
          </div>
          <h3>Create</h3>
          <div className="handle">Share media, host a session, or submit a park</div>
        </div>

        {mode === 'choices' && (
          <div className="create-choice-grid">
            <button type="button" onClick={() => setMode('post')}>
              <b>New Post</b>
              <span>Photos, videos, and mixed carousels.</span>
            </button>
            <button type="button" onClick={() => setMode('session')}>
              <b>Host Session</b>
              <span>Create a dated training meetup.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeModal();
                onSubmitPark();
              }}
            >
              <b>Submit Park</b>
              <span>Pin a new spot for admin review.</span>
            </button>
          </div>
        )}

        {mode === 'post' && (
        <form className="spot-form create-post-form" onSubmit={handleSubmit}>
          <button className="btn btn-ghost" type="button" onClick={() => setMode('choices')}>Back</button>
          <div className="form-field full">
            <label htmlFor="post-media">Media</label>
            <input
              id="post-media"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
              multiple
              required
              onChange={event => addPostMedia(event.target.files)}
            />
          </div>
          {mediaFiles.length > 0 && (
            <div className="media-preview-grid full">
              {mediaFiles.map(item => (
                <div className="media-preview" key={item.id}>
                  {item.mediaType === 'image' ? <img src={item.previewUrl} alt="" /> : <video src={item.previewUrl} muted playsInline controls />}
                  <button type="button" onClick={() => removePostMedia(item.id)} aria-label={`Remove ${item.file.name}`}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <div className="form-field full">
            <label htmlFor="post-caption">Caption</label>
            <textarea
              id="post-caption"
              value={caption}
              onChange={event => setCaption(event.target.value)}
              placeholder="What went down today?"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="post-location">Location</label>
            <select id="post-location" value={parkId} onChange={event => setParkId(event.target.value)}>
              <option value="">No tagged location</option>
              {parks.map(park => (
                <option value={park.id} key={park.id}>
                  {park.name} - {park.area}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field full">
            <label htmlFor="post-mission">Mission / session tag</label>
            <input
              id="post-mission"
              value={missionTag}
              onChange={event => setMissionTag(event.target.value)}
              placeholder="Optional: Pull-up ladder, morning crew..."
            />
          </div>

          {progress && <p className="form-help">{progress}</p>}
          {message && <p className="auth-message">{message}</p>}

          <div className="form-actions">
            <button className="btn btn-ghost" type="button" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
        )}

        {mode === 'session' && (
          <form className="spot-form create-post-form" onSubmit={handleSessionSubmit}>
            <button className="btn btn-ghost" type="button" onClick={() => setMode('choices')}>Back</button>
            <div className="form-field full">
              <label htmlFor="session-park">Park / location</label>
              <select id="session-park" required value={sessionParkId} onChange={event => setSessionParkId(event.target.value)}>
                <option value="">Choose park</option>
                {parks.map(park => (
                  <option value={park.id} key={park.id}>{park.name} - {park.area}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="session-date">Date</label>
              <input id="session-date" type="date" required value={sessionDate} onChange={event => setSessionDate(event.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="session-start">Start time</label>
              <input id="session-start" type="time" required value={sessionStart} onChange={event => setSessionStart(event.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="session-end">End time optional</label>
              <input id="session-end" type="time" value={sessionEnd} onChange={event => setSessionEnd(event.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="session-limit">Participant limit optional</label>
              <input id="session-limit" type="number" min="1" max="200" inputMode="numeric" value={sessionLimit} onChange={event => setSessionLimit(event.target.value)} />
            </div>
            <div className="form-field full">
              <label htmlFor="session-description">Description optional</label>
              <textarea id="session-description" value={sessionDescription} onChange={event => setSessionDescription(event.target.value)} placeholder="Training focus, level, meeting point..." />
            </div>
            {message && <p className="auth-message">{message}</p>}
            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Post Session'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
