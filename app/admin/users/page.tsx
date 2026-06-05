'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { fetchPendingUserApplications, reviewUserApplication } from '@/lib/adminUsers';
import { getCurrentUser, loginWithEmail, signOut } from '@/lib/auth';
import { isCurrentUserAdmin } from '@/lib/discovery';
import { supabaseConfigured, supabaseConfigStatus } from '@/lib/supabase';
import type { PendingUserApplication } from '@/types/adminUsers';

function configurationMessage() {
  return [
    ...supabaseConfigStatus.missing.map(name => `${name} is missing or empty`),
    ...supabaseConfigStatus.invalid
  ].join('. ');
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [applications, setApplications] = useState<PendingUserApplication[]>([]);
  const [message, setMessage] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  const loadApplications = useCallback(async () => {
    const nextApplications = await fetchPendingUserApplications();
    setApplications(nextApplications);
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
      if (nextAdmin) await loadApplications();
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Admin check failed.');
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  }, [loadApplications]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

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
    setApplications([]);
  }

  async function reviewApplication(application: PendingUserApplication, status: 'approved' | 'rejected') {
    setBusyUserId(application.id);
    setMessage('');

    try {
      await reviewUserApplication(application.id, status);
      setMessage(status === 'approved' ? 'User approved.' : 'User rejected.');
      await loadApplications();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'User review failed.');
    } finally {
      setBusyUserId('');
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">User Admin</span>
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
          <span className="page-kicker">User Admin</span>
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
          <span className="page-kicker">User Admin</span>
          <h1>Admin login required</h1>
          <p>This internal approval queue is hidden from the public app.</p>
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
          <span className="page-kicker">User Admin</span>
          <h1>Access blocked</h1>
          <p>{user.email} is logged in, but this account is not a BARMAP admin.</p>
          {authMessage && <p className="auth-message">{authMessage}</p>}
          <button className="btn btn-ghost" type="button" onClick={logout}>Log Out</button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-discovery-page">
      <section className="admin-discovery-hero">
        <div>
          <span className="page-kicker">User Admin</span>
          <h1>Approve early BARMAP users before wider launch.</h1>
          <p>Pending users can sign in and see their status, but full app actions stay locked until approval.</p>
        </div>
        <div className="admin-status-card">
          <b>{applications.length}</b>
          <span>Pending</span>
          <button className="btn btn-ghost" type="button" onClick={logout}>Log Out</button>
        </div>
      </section>

      <section className="admin-user-list" aria-label="Pending user applications">
        <div className="admin-section-head">
          <span className="page-kicker">Approval Queue</span>
          <h2>Pending users</h2>
        </div>
        {message && <p className="auth-message">{message}</p>}
        {applications.length === 0 ? (
          <div className="premium-empty compact">
            <b>No pending users</b>
            <span>New signups waiting for launch access will appear here.</span>
          </div>
        ) : (
          applications.map(application => (
            <article className="admin-user-card" key={application.id}>
              <div>
                <span className="candidate-source">{application.email}</span>
                <h3>{application.displayName}</h3>
                <p>@{application.username} · {application.homeCity || 'No city'} · {new Date(application.createdAt).toLocaleString()}</p>
              </div>
              <div className="admin-review-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busyUserId === application.id}
                  onClick={() => reviewApplication(application, 'approved')}
                >
                  {busyUserId === application.id ? 'Reviewing...' : 'Approve'}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={busyUserId === application.id}
                  onClick={() => reviewApplication(application, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
