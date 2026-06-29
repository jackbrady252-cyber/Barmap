'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginWithEmail, signOut } from '@/lib/auth';
import { isCurrentUserAdmin } from '@/lib/discovery';
import { fetchFeedbackReports, updateFeedbackStatus, type FeedbackCategory, type FeedbackReport } from '@/lib/feedback';
import { supabaseConfigured, supabaseConfigStatus } from '@/lib/supabase';

function configurationMessage() {
  return [
    ...supabaseConfigStatus.missing.map(name => `${name} is missing or empty`),
    ...supabaseConfigStatus.invalid
  ].join('. ');
}

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [message, setMessage] = useState('');
  const [busyReportId, setBusyReportId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FeedbackCategory>('all');
  const [search, setSearch] = useState('');

  const loadReports = useCallback(async () => {
    const nextReports = await fetchFeedbackReports();
    setReports(nextReports);
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
      if (nextAdmin) await loadReports();
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Admin check failed.');
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  }, [loadReports]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const visibleReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports
      .filter(report => categoryFilter === 'all' || report.category === categoryFilter)
      .filter(report => !q || [report.category, report.message, report.emailReply, report.deviceInfo, report.status].some(value => value.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [categoryFilter, reports, search]);

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
    setReports([]);
  }

  async function resolveReport(report: FeedbackReport) {
    setBusyReportId(report.id);
    setMessage('');
    try {
      await updateFeedbackStatus(report.id, 'resolved');
      setMessage('Feedback marked resolved.');
      await loadReports();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Feedback update failed.');
    } finally {
      setBusyReportId('');
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">Feedback Admin</span>
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
          <span className="page-kicker">Feedback Admin</span>
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
          <span className="page-kicker">Feedback Admin</span>
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
          <span className="page-kicker">Feedback Admin</span>
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
          <span className="page-kicker">Feedback Admin</span>
          <h1>Review public launch feedback.</h1>
          <p>Newest reports appear first. Resolve items once they have been handled.</p>
        </div>
        <div className="admin-status-card">
          <b>{reports.filter(report => report.status !== 'resolved').length}</b>
          <span>Open</span>
          <button className="btn btn-ghost" type="button" onClick={logout}>Log Out</button>
        </div>
      </section>

      <section className="admin-user-list">
        <div className="admin-review-filters">
          <div className="form-field">
            <label htmlFor="feedback-search">Search feedback</label>
            <input id="feedback-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Message, status, device, email" />
          </div>
          <div className="form-field">
            <label htmlFor="feedback-category">Category</label>
            <select id="feedback-category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as 'all' | FeedbackCategory)}>
              <option value="all">All</option>
              <option value="bug">Report a Bug</option>
              <option value="feature">Suggest a Feature</option>
              <option value="park_info">Incorrect Park Information</option>
              <option value="contact">Contact</option>
            </select>
          </div>
        </div>
        {message && <p className="auth-message">{message}</p>}
        {visibleReports.length === 0 ? (
          <div className="premium-empty compact">
            <b>No feedback found</b>
            <span>New public reports will appear here.</span>
          </div>
        ) : visibleReports.map(report => (
          <article className="admin-user-card" key={report.id}>
            <div>
              <span className="candidate-source">{report.category} · {report.status} · {new Date(report.createdAt).toLocaleString()}</span>
              <h3>{report.message}</h3>
              <p>{report.emailReply || 'No reply email'} · {report.appVersion}</p>
              <p>{report.deviceInfo}</p>
              {report.screenshotUrl && <p><a href={report.screenshotUrl} target="_blank" rel="noreferrer">Screenshot</a></p>}
            </div>
            <div className="admin-review-actions">
              <button className="btn btn-primary" type="button" disabled={busyReportId === report.id || report.status === 'resolved'} onClick={() => resolveReport(report)}>
                {busyReportId === report.id ? 'Saving...' : report.status === 'resolved' ? 'Resolved' : 'Mark Resolved'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
