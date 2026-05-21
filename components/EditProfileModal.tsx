'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { updateProfile } from '@/lib/auth';
import type { UserProfile } from '@/types/auth';

type EditProfileModalProps = {
  open: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
};

export default function EditProfileModal({ open, profile, onClose, onSaved }: EditProfileModalProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!profile || !open) return;
    setUsername(profile.username);
    setDisplayName(profile.displayName);
    setAvatarUrl(profile.avatarUrl);
    setBio(profile.bio);
    setHomeCity(profile.homeCity);
    setMessage('');
  }, [open, profile]);

  if (!open || !profile) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setMessage('');

    try {
      setSubmitting(true);
      const saved = await updateProfile({
        id: profile.id,
        username,
        displayName,
        avatarUrl,
        bio,
        homeCity
      });
      onSaved(saved);
      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Profile update failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-bg open" onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form className="modal auth-modal edit-profile-modal" onSubmit={submit}>
        <button className="panel-close" type="button" aria-label="Close edit profile" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="modal-head">
          <h3>Edit profile</h3>
          <div className="handle">Update your public BARMAP identity</div>
        </div>
        <div className="auth-body modal-body">
          <div className="form-field">
            <label htmlFor="edit-display-name">Display name</label>
            <input id="edit-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="edit-username">Username</label>
            <input
              id="edit-username"
              value={username}
              onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              minLength={3}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-home-city">Home city</label>
            <input id="edit-home-city" value={homeCity} onChange={event => setHomeCity(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="edit-avatar-url">Avatar URL</label>
            <input id="edit-avatar-url" type="url" value={avatarUrl} onChange={event => setAvatarUrl(event.target.value)} placeholder="https://..." />
          </div>
          <div className="form-field">
            <label htmlFor="edit-bio">Bio</label>
            <textarea id="edit-bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={220} />
          </div>
          {message && <p className="auth-message">{message}</p>}
          <div className="auth-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Profile'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
