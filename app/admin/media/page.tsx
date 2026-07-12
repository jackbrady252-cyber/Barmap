'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginWithEmail, signOut } from '@/lib/auth';
import { isCurrentUserAdmin } from '@/lib/discovery';
import { fetchPendingParkMediaForAdmin, reviewParkMedia, type ParkMediaItem } from '@/lib/parkMedia';
import { supabaseConfigured, supabaseConfigStatus } from '@/lib/supabase';

function configurationMessage() {
  return [
    ...supabaseConfigStatus.missing.map(name => `${name} is missing or empty`),
    ...supabaseConfigStatus.invalid
  ].join('. ');
}

export default function AdminMediaPage() {
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [media, setMedia] = useState<ParkMediaItem[]>([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');

  const loadMedia = useCallback(async () => {
    setMedia(await fetchPendingParkMediaForAdmin());
  }, []);

  const checkSession = useCallback(async () => {
    setLoading(true);
    setAuthMessage('');
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
      if (!nextUser) {
        setAdmin(false);
        return;
      }
      setCheckingAdmin(true);
      const nextAdmin = await isCurrentUserAdmin();
      setAdmin(nextAdmin);
      if (nextAdmin) await loadMedia();
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Admin check failed.');
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  }, [loadMedia]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const visibleMedia = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media.filter(item => !q || [String(item.parkId), item.mediaType, item.userId].some(value => value.toLowerCase().includes(q)));
  }, [media, search]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage('');
    try {
      await loginWithEmail(email, password);
      await checkSession();
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Login failed.');
    }
  }

  async function logout() {
    await signOut();
    setUser(null);
    setAdmin(false);
    setMedia([]);
  }

  async function review(item: ParkMediaItem, status: 'approved' | 'rejected') {
    setBusyId(item.id);
    setMessage('');
    try {
      await reviewParkMedia(item.id, status);
      setMessage(status === 'approved' ? 'Park media approved.' : 'Park media rejected.');
      await loadMedia();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Review failed.');
    } finally {
      setBusyId('');
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">Park Media Admin</span>
          <h1>Supabase setup required</h1>
          <p>{configurationMessage() || 'Supabase is not configured.'}</p>
        </section>
      </main>
    );
  }

  if (loading || checkingAdmin) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">Park Media Admin</span>
          <h1>Checking access</h1>
          <p>BARMAP is verifying your session and admin permissions.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">Park Media Admin</span>
          <h1>Admin login required</h1>
          <form className="admin-login-form" onSubmit={login}>
            <div className="form-field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required />
            </div>
            {authMessage && <p className="auth-message">{authMessage}</p>}
            <button className="btn btn-primary" type="submit">Log In</button>
          </form>
        </section>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">Park Media Admin</span>
          <h1>Access blocked</h1>
          <p>{user.email} is logged in, but this account is not a BARMAP admin.</p>
          <button className="btn btn-ghost" type="button" onClick={logout}>Log Out</button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-discovery-page">
      <section className="admin-discovery-hero">
        <div>
          <span className="page-kicker">Park Media Admin</span>
          <h1>Review park photos and videos.</h1>
          <p>Only approved media becomes visible on public park cards.</p>
        </div>
        <div className="admin-status-card">
          <b>{media.length}</b>
          <span>Pending</span>
          <button className="btn btn-ghost" type="button" onClick={logout}>Log Out</button>
        </div>
      </section>

      <section className="admin-user-list">
        <div className="form-field">
          <label htmlFor="media-search">Search</label>
          <input id="media-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Park id, user id, media type" />
        </div>
        {message && <p className="auth-message">{message}</p>}
        {visibleMedia.length === 0 ? (
          <div className="premium-empty compact">
            <b>No pending park media</b>
            <span>User contributions will appear here before going public.</span>
          </div>
        ) : visibleMedia.map(item => (
          <article className="admin-user-card" key={item.id}>
            <div>
              <span className="candidate-source">Park {item.parkId} · {item.mediaType} · {new Date(item.createdAt).toLocaleString()}</span>
              <h3>User-submitted park media</h3>
              <p>Submitted by {item.userId}</p>
              <div className="admin-media-preview">
                {item.mediaType === 'image' ? (
                  <img src={item.mediaUrl} alt="" />
                ) : (
                  <video src={item.mediaUrl} controls playsInline />
                )}
              </div>
            </div>
            <div className="admin-review-actions">
              <button className="btn btn-primary" type="button" disabled={busyId === item.id} onClick={() => review(item, 'approved')}>
                Approve
              </button>
              <button className="btn btn-ghost" type="button" disabled={busyId === item.id} onClick={() => review(item, 'rejected')}>
                Reject
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
