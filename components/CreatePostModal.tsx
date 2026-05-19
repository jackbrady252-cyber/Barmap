'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons';
import { createPost } from '@/lib/posts';
import type { UserProfile } from '@/types/auth';
import type { Park } from '@/types/park';

type CreatePostModalProps = {
  open: boolean;
  user: User | null;
  profile: UserProfile | null;
  parks: Park[];
  onClose: () => void;
  onCreated: () => void;
  onAuthRequired: () => void;
};

export default function CreatePostModal({ open, user, profile, parks, onClose, onCreated, onAuthRequired }: CreatePostModalProps) {
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [parkId, setParkId] = useState('');
  const [missionTag, setMissionTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const selectedPark = useMemo(() => parks.find(park => String(park.id) === parkId) || null, [parkId, parks]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!user) {
      onAuthRequired();
      return;
    }

    try {
      setSubmitting(true);
      await createPost({
        user,
        profile,
        caption,
        mediaType,
        imageFile,
        park: selectedPark,
        missionTag
      });
      setCaption('');
      setImageFile(null);
      setParkId('');
      setMissionTag('');
      setMediaType('image');
      onCreated();
      onClose();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Post creation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-bg open">
      <section className="modal create-post-modal" role="dialog" aria-modal="true" aria-label="Create post">
        <button className="panel-close" type="button" onClick={onClose} aria-label="Close create post">
          <CloseIcon />
        </button>
        <div className="modal-head">
          <div className="modal-icon">
            <PlusIcon />
          </div>
          <h3>Create post</h3>
          <div className="handle">Share a session from the bars</div>
        </div>
        <form className="spot-form create-post-form" onSubmit={handleSubmit}>
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
            <label htmlFor="post-media-type">Media</label>
            <select id="post-media-type" value={mediaType} onChange={event => setMediaType(event.target.value as 'image' | 'video')}>
              <option value="image">Image upload</option>
              <option value="video">Video placeholder</option>
            </select>
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

          {mediaType === 'image' && (
            <div className="form-field full">
              <label htmlFor="post-image">Image</label>
              <input id="post-image" type="file" accept="image/*" onChange={event => setImageFile(event.target.files?.[0] || null)} required />
            </div>
          )}

          {mediaType === 'video' && (
            <p className="form-help full">Video posts are saved as placeholders for now. Upload support can come next.</p>
          )}

          <div className="form-field full">
            <label htmlFor="post-mission">Mission / session tag</label>
            <input
              id="post-mission"
              value={missionTag}
              onChange={event => setMissionTag(event.target.value)}
              placeholder="Optional: Pull-up ladder, morning crew..."
            />
          </div>

          {message && <p className="auth-message">{message}</p>}

          <div className="form-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
