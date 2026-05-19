'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { CloseIcon } from '@/components/icons';
import { loginWithEmail, signUpWithEmail } from '@/lib/auth';
import { supabaseConfigured, supabaseConfigStatus } from '@/lib/supabase';
import type { AuthMode, UserProfile } from '@/types/auth';

type AuthModalProps = {
  mode: AuthMode;
  open: boolean;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onAuthenticated: (profile: UserProfile | null) => void;
};

export default function AuthModal({ mode, open, onClose, onModeChange, onAuthenticated }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const configMessage = supabaseConfigured
    ? ''
    : [
        ...supabaseConfigStatus.missing.map(name => `${name} is missing or empty`),
        ...supabaseConfigStatus.invalid
      ].join('. ');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      const result =
        mode === 'signup'
          ? await signUpWithEmail({
              email,
              password,
              username: username.trim(),
              displayName: displayName || username,
              homeCity
            })
          : await loginWithEmail(email, password);

      const user = result.user;
      const session = result.session;

      if (mode === 'signup' && user && !session) {
        setMessage('Signup worked. Supabase sent a verification email. Open it, verify your email, then return here and log in.');
      } else {
        onAuthenticated(null);
        onClose();
      }
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : 'Authentication failed.';
      console.error('[BARMAP auth] Auth modal submit failed', err);
      setMessage(nextMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`modal-bg${open ? ' open' : ''}`}>
      <form className="modal auth-modal" onSubmit={handleSubmit}>
        <button className="panel-close" type="button" aria-label="Close auth modal" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="modal-head">
          <div className="avatar-lg">{mode === 'signup' ? 'UP' : 'IN'}</div>
          <h3>{mode === 'signup' ? 'Create BARMAP account' : 'Log in to BARMAP'}</h3>
          <div className="handle">
            {supabaseConfigured ? 'Email and password' : 'Supabase config needs attention'}
          </div>
        </div>

        <div className="modal-body auth-body">
          {mode === 'signup' && (
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="authUsername">Username</label>
                <input
                  id="authUsername"
                  value={username}
                  onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                  placeholder="jackbars"
                  autoComplete="username"
                />
              </div>
              <div className="form-field">
                <label htmlFor="authDisplayName">Display name</label>
                <input
                  id="authDisplayName"
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  placeholder="Jack Brady"
                  autoComplete="name"
                />
              </div>
              <div className="form-field full">
                <label htmlFor="authHomeCity">Home city</label>
                <input
                  id="authHomeCity"
                  value={homeCity}
                  onChange={event => setHomeCity(event.target.value)}
                  placeholder="Dublin"
                  autoComplete="address-level2"
                />
              </div>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="authEmail">Email</label>
            <input
              id="authEmail"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="authPassword">Password</label>
            <input
              id="authPassword"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {!supabaseConfigured && <p className="auth-message">Auth is disabled: {configMessage}</p>}
          {message && <p className="auth-message">{message}</p>}

          <div className="auth-actions">
            <button className="btn btn-primary" type="submit" disabled={!supabaseConfigured || submitting}>
              {submitting ? 'Working...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => onModeChange(mode === 'signup' ? 'login' : 'signup')}
            >
              {mode === 'signup' ? 'Use Login' : 'Create Account'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
