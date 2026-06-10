'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginWithEmail, signOut } from '@/lib/auth';
import {
  createDiscoveryCandidate,
  fetchDiscoveryCandidates,
  isCurrentUserAdmin,
  parseEquipmentGuess,
  reviewDiscoveryCandidate,
  verifyDiscoveryCandidateImages
} from '@/lib/discovery';
import { supabase, supabaseConfigured, supabaseConfigStatus } from '@/lib/supabase';
import type { DiscoveryCandidate, DiscoveryImportResult, DiscoveryRegion } from '@/types/discovery';

const initialForm = {
  name: '',
  area: '',
  address: '',
  region: 'london' as DiscoveryRegion,
  lat: '',
  lng: '',
  source: '',
  sourceUrl: '',
  evidence: '',
  equipmentGuess: '',
  photoUrl: '',
  attribution: '',
  confidenceScore: '50'
};

function configurationMessage() {
  return [
    ...supabaseConfigStatus.missing.map(name => `${name} is missing or empty`),
    ...supabaseConfigStatus.invalid
  ].join('. ');
}

export default function DiscoveryAdminPage() {
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [busyCandidateId, setBusyCandidateId] = useState('');
  const [busyImageCandidateId, setBusyImageCandidateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showOnlyImageProof, setShowOnlyImageProof] = useState(false);
  const [importRegion, setImportRegion] = useState<DiscoveryRegion>('london');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importResult, setImportResult] = useState<DiscoveryImportResult | null>(null);

  const pendingCount = candidates.length;
  const imageProofCount = useMemo(() => candidates.filter(candidate => candidate.imageStatus !== 'none' && candidate.imageCount > 0).length, [candidates]);
  const visibleCandidates = useMemo(
    () => showOnlyImageProof ? candidates.filter(candidate => candidate.imageStatus !== 'none' && candidate.imageCount > 0) : candidates,
    [candidates, showOnlyImageProof]
  );
  const confidenceValue = useMemo(() => {
    const parsed = Number(form.confidenceScore);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
  }, [form.confidenceScore]);

  const loadCandidates = useCallback(async () => {
    const nextCandidates = await fetchDiscoveryCandidates('pending');
    setCandidates(nextCandidates);
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
      if (nextAdmin) await loadCandidates();
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Admin check failed.');
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  }, [loadCandidates]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

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
    setCandidates([]);
  }

  async function addCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage('Latitude and longitude must be valid numbers.');
      return;
    }

    try {
      setSaving(true);
      await createDiscoveryCandidate({
        name: form.name.trim(),
        area: form.area.trim(),
        address: form.address.trim(),
        region: form.region,
        lat,
        lng,
        source: form.source.trim(),
        sourceUrl: form.sourceUrl.trim(),
        evidence: form.evidence.trim(),
        equipmentGuess: parseEquipmentGuess(form.equipmentGuess),
        photoUrl: form.photoUrl.trim(),
        attribution: form.attribution.trim(),
        confidenceScore: confidenceValue
      });
      setForm(initialForm);
      setMessage('Candidate added to review queue.');
      await loadCandidates();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Candidate creation failed.');
    } finally {
      setSaving(false);
    }
  }

  async function importCandidates() {
    setMessage('');
    setImportMessage('Searching OpenStreetMap...');
    setImportResult(null);

    try {
      setImporting(true);
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error('Admin session required.');

      console.info('[BARMAP discovery] Starting importer', { region: importRegion });
      const response = await fetch('/api/admin/discovery/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ region: importRegion })
      });
      const data = await response.json().catch(error => {
        console.error('[BARMAP discovery] Import response was not valid JSON', error);
        return {};
      }) as Partial<DiscoveryImportResult> & { error?: string };
      if (!response.ok) throw new Error(data.error || `Import failed with ${response.status}.`);
      if (typeof data.added !== 'number' || typeof data.skipped !== 'number') {
        console.error('[BARMAP discovery] Import response missing counts', data);
        throw new Error('Import completed but returned an unexpected response.');
      }

      setImportResult(data as DiscoveryImportResult);
      setImportMessage(`Added ${data.added} candidates, skipped ${data.skipped} duplicates.`);
      await loadCandidates();
    } catch (err) {
      console.error('[BARMAP discovery] Import failed', err);
      setImportMessage(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  async function reviewCandidate(candidate: DiscoveryCandidate, status: 'approved' | 'rejected') {
    if (status === 'approved' && (candidate.imageStatus === 'none' || candidate.imageCount < 1)) {
      setMessage('Image evidence is required before approving discovery candidates.');
      return;
    }

    setBusyCandidateId(candidate.id);
    setMessage('');

    try {
      await reviewDiscoveryCandidate(candidate.id, status);
      setMessage(status === 'approved' ? 'Candidate approved and published to public spots.' : 'Candidate rejected and retained for records.');
      await loadCandidates();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Candidate review failed.');
    } finally {
      setBusyCandidateId('');
    }
  }

  async function verifyImages(candidate: DiscoveryCandidate) {
    setBusyImageCandidateId(candidate.id);
    setMessage('');

    try {
      const result = await verifyDiscoveryCandidateImages(candidate.id);
      setMessage(result.imageCount > 0
        ? `Found ${result.imageCount} image${result.imageCount === 1 ? '' : 's'} from ${result.imageSources.join(', ')}.`
        : 'No image evidence found for this candidate.');
      await loadCandidates();
    } catch (err) {
      console.error('[BARMAP discovery] Image verification failed', err);
      setMessage(err instanceof Error ? err.message : 'Image verification failed.');
    } finally {
      setBusyImageCandidateId('');
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="admin-discovery-page">
        <section className="admin-gate">
          <span className="page-kicker">Discovery Admin</span>
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
          <span className="page-kicker">Discovery Admin</span>
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
          <span className="page-kicker">Discovery Admin</span>
          <h1>Admin login required</h1>
          <p>This internal review queue is hidden from the public app.</p>
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
          <span className="page-kicker">Discovery Admin</span>
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
          <span className="page-kicker">Discovery Admin</span>
          <h1>Review possible training spots before they reach the map.</h1>
          <p>Every finding stays private until you approve it. Approval copies the candidate into public spots; rejection keeps the record internal.</p>
        </div>
        <div className="admin-status-card">
          <b>{pendingCount}</b>
          <span>Pending</span>
          <button className="btn btn-ghost" type="button" onClick={logout}>Log Out</button>
        </div>
      </section>

      <section className="admin-discovery-grid">
        <form className="admin-discovery-form" onSubmit={addCandidate}>
          <div className="admin-section-head">
            <span className="page-kicker">Manual Intake</span>
            <h2>Add candidate</h2>
          </div>
          <div className="form-field">
            <label htmlFor="candidate-name">Name</label>
            <input id="candidate-name" value={form.name} onChange={event => updateField('name', event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-area">Area</label>
            <input id="candidate-area" value={form.area} onChange={event => updateField('area', event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-address">Address</label>
            <input id="candidate-address" value={form.address} onChange={event => updateField('address', event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-region">Region</label>
            <select id="candidate-region" value={form.region} onChange={event => updateField('region', event.target.value)}>
              <option value="ireland">Ireland</option>
              <option value="london">London</option>
              <option value="new-york">New York</option>
            </select>
          </div>
          <div className="admin-two-col">
            <div className="form-field">
              <label htmlFor="candidate-lat">Latitude</label>
              <input id="candidate-lat" inputMode="decimal" value={form.lat} onChange={event => updateField('lat', event.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="candidate-lng">Longitude</label>
              <input id="candidate-lng" inputMode="decimal" value={form.lng} onChange={event => updateField('lng', event.target.value)} required />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="candidate-source">Source</label>
            <input id="candidate-source" value={form.source} onChange={event => updateField('source', event.target.value)} placeholder="OSM, council site, Google Maps, Reddit..." required />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-source-url">Source link</label>
            <input id="candidate-source-url" type="url" value={form.sourceUrl} onChange={event => updateField('sourceUrl', event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-evidence">Evidence</label>
            <textarea id="candidate-evidence" value={form.evidence} onChange={event => updateField('evidence', event.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-equipment">Guessed equipment</label>
            <input id="candidate-equipment" value={form.equipmentGuess} onChange={event => updateField('equipmentGuess', event.target.value)} placeholder="Pull-up bars, dip bars, rings" />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-photo">Photo URL</label>
            <input id="candidate-photo" type="url" value={form.photoUrl} onChange={event => updateField('photoUrl', event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-attribution">Attribution</label>
            <input id="candidate-attribution" value={form.attribution} onChange={event => updateField('attribution', event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="candidate-confidence">Confidence score</label>
            <input id="candidate-confidence" type="number" min="0" max="100" step="1" value={form.confidenceScore} onChange={event => updateField('confidenceScore', event.target.value)} required />
          </div>
          <p className="admin-legal-note">Do not upload or copy copyrighted images. Store only a source photo URL, source link, and attribution until permission is clear.</p>
          {message && <p className="auth-message">{message}</p>}
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add to Queue'}</button>
        </form>

        <section className="admin-candidate-list" aria-label="Pending discovery candidates">
          <div className="admin-import-panel">
            <div className="admin-section-head">
              <span className="page-kicker">Importer</span>
              <h2>Search OpenStreetMap</h2>
            </div>
            <div className="admin-import-controls">
              <div className="form-field">
                <label htmlFor="import-region">Region</label>
                <select id="import-region" value={importRegion} onChange={event => setImportRegion(event.target.value as DiscoveryRegion)}>
                  <option value="london">London</option>
                  <option value="new-york">New York</option>
                </select>
              </div>
              <button className="btn btn-primary" type="button" disabled={importing} onClick={() => void importCandidates()}>
                {importing ? 'Searching OpenStreetMap...' : 'Search candidates'}
              </button>
            </div>
            <p className="admin-legal-note">Imports create pending review candidates only. They never publish to the public map automatically.</p>
            {importMessage && <p className="auth-message">{importMessage}</p>}
            {importResult && (
              <div className="candidate-detail-grid">
                <div><span>Searched</span><b>{importResult.searched}</b></div>
                <div><span>Added</span><b>{importResult.added}</b></div>
                <div><span>Skipped</span><b>{importResult.skipped}</b></div>
                <div><span>Google enriched</span><b>{importResult.googleEnriched}</b></div>
              </div>
            )}
          </div>
          <div className="admin-section-head">
            <span className="page-kicker">Review Queue</span>
            <h2>Pending candidates</h2>
          </div>
          <label className="admin-filter-toggle">
            <input type="checkbox" checked={showOnlyImageProof} onChange={event => setShowOnlyImageProof(event.target.checked)} />
            <span>Show only candidates with image proof</span>
            <b>{imageProofCount}/{pendingCount}</b>
          </label>
          {visibleCandidates.length === 0 ? (
            <div className="premium-empty compact">
              <b>{showOnlyImageProof ? 'No image-proven candidates' : 'No pending candidates'}</b>
              <span>{showOnlyImageProof ? 'Verify images on pending candidates to approve them.' : 'Add a manual finding to start the review queue.'}</span>
            </div>
          ) : (
            visibleCandidates.map(candidate => (
              <article className="admin-candidate-card" key={candidate.id}>
                <div className="admin-candidate-main">
                  <div>
                    <span className="candidate-source">{candidate.source}</span>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.area} · {candidate.region}</p>
                  </div>
                  <div className="confidence-badge">{candidate.confidenceScore}%</div>
                </div>
                <div className="candidate-detail-grid">
                  <div><span>Coordinates</span><b>{candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}</b></div>
                  <div><span>Status</span><b>{candidate.status}</b></div>
                  <div><span>Image status</span><b>{candidate.imageStatus.replace(/_/g, ' ')}</b></div>
                  <div><span>Images found</span><b>{candidate.imageCount}</b></div>
                  {candidate.imageSources.length > 0 && <div className="wide"><span>Image sources</span><p>{Array.from(new Set(candidate.imageSources)).join(', ')}</p></div>}
                  {candidate.address && <div className="wide"><span>Address</span><p>{candidate.address}</p></div>}
                  <div className="wide"><span>Evidence</span><p>{candidate.evidence}</p></div>
                  <div className="wide"><span>Equipment guess</span><p>{candidate.equipmentGuess.length ? candidate.equipmentGuess.join(', ') : 'No equipment guess'}</p></div>
                  {candidate.sourceUrl && (
                    <div className="wide"><span>Source link</span><a href={candidate.sourceUrl} target="_blank" rel="noreferrer">{candidate.sourceUrl}</a></div>
                  )}
                  {candidate.photoUrl && (
                    <div className="wide"><span>Photo</span><a href={candidate.photoUrl} target="_blank" rel="noreferrer">{candidate.photoUrl}</a></div>
                  )}
                  {candidate.attribution && <div className="wide"><span>Attribution</span><p>{candidate.attribution}</p></div>}
                </div>
                {candidate.imageUrls.length > 0 && (
                  <div className="candidate-image-strip" aria-label={`Images found for ${candidate.name}`}>
                    {candidate.imageUrls.map((url, index) => (
                      <a href={url} target="_blank" rel="noreferrer" key={`${candidate.id}-${url}`}>
                        <img src={url} alt={`${candidate.name} image proof ${index + 1}`} loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="admin-legal-note">Check permission and attribution before using any photo publicly.</p>
                <div className="admin-review-actions">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={busyImageCandidateId === candidate.id}
                    onClick={() => void verifyImages(candidate)}
                  >
                    {busyImageCandidateId === candidate.id ? 'Verifying...' : 'Verify Images'}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busyCandidateId === candidate.id || candidate.imageStatus === 'none' || candidate.imageCount < 1}
                    onClick={() => reviewCandidate(candidate, 'approved')}
                  >
                    {busyCandidateId === candidate.id ? 'Reviewing...' : 'Approve'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={busyCandidateId === candidate.id}
                    onClick={() => reviewCandidate(candidate, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
