'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { submitFeedback, type FeedbackCategory } from '@/lib/feedback';

type FeedbackModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSubmitted: () => void;
};

export default function FeedbackModal({ open, user, onClose, onSubmitted }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [emailReply, setEmailReply] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await submitFeedback({ user, category, message, emailReply, screenshotFile });
      setCategory('bug');
      setMessage('');
      setEmailReply('');
      setScreenshotFile(null);
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback submission failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`modal-bg${open ? ' open' : ''}`} onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form className="modal auth-modal" onSubmit={submit}>
        <button className="panel-close" type="button" aria-label="Close feedback" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="modal-head">
          <h3>Feedback</h3>
          <div className="handle">Help shape BarMap before the next session.</div>
        </div>
        <div className="modal-body auth-body">
          <div className="form-field">
            <label htmlFor="feedback-category">Category</label>
            <select id="feedback-category" value={category} onChange={event => setCategory(event.target.value as FeedbackCategory)}>
              <option value="bug">Report a Bug</option>
              <option value="feature">Suggest a Feature</option>
              <option value="park_info">Report Incorrect Park Information</option>
              <option value="contact">Contact the BarMap Team</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="feedback-message">Description</label>
            <textarea id="feedback-message" value={message} onChange={event => setMessage(event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="feedback-screenshot">Optional screenshot</label>
            <input id="feedback-screenshot" type="file" accept="image/*" onChange={event => setScreenshotFile(event.target.files?.[0] || null)} />
          </div>
          <div className="form-field">
            <label htmlFor="feedback-email">Optional reply email</label>
            <input id="feedback-email" type="email" value={emailReply} onChange={event => setEmailReply(event.target.value)} placeholder="you@example.com" />
          </div>
          {error && <p className="auth-message">{error}</p>}
          <div className="auth-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Sending...' : 'Send Feedback'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
