'use client';

import type { User } from '@supabase/supabase-js';
import type { AuthMode, UserProfile } from '@/types/auth';

type ProfilePageProps = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  onAuthOpen: (mode: AuthMode) => void;
  onSignOut: () => void;
};

function initialsFor(profile: UserProfile | null, user: User | null) {
  if (profile?.displayName) {
    return profile.displayName
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  return user?.email?.slice(0, 2).toUpperCase() || 'BM';
}

export default function ProfilePage({ user, profile, loading, onAuthOpen, onSignOut }: ProfilePageProps) {
  if (loading) {
    return (
      <main className="app-main app-page profile-page">
        <div className="profile-auth-card">
          <span className="page-kicker">Profile</span>
          <h1>Loading account</h1>
          <p>Checking your BARMAP session.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-main app-page profile-page">
        <div className="profile-auth-card">
          <div className="profile-empty-avatar">Sign in</div>
          <span className="page-kicker">Profile</span>
          <h1>You are logged out</h1>
          <p>Create an account or log in to show your real BARMAP profile here. Your map, feed, challenges, and events stay available while logged out.</p>
          <div className="profile-auth-actions">
            <button className="btn btn-primary" type="button" onClick={() => onAuthOpen('signup')}>
              Sign Up
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => onAuthOpen('login')}>
              Log In
            </button>
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile?.displayName || user.email || 'BARMAP Athlete';
  const username = profile?.username ? `@${profile.username}` : user.email || '';
  const homeCity = profile?.homeCity || 'Ireland';

  return (
    <main className="app-main app-page profile-page">
      <div className="profile-hero">
        <div className="avatar profile-avatar">{initialsFor(profile, user)}</div>
        <h1>{displayName}</h1>
        <p>{username} - {homeCity}</p>
        {profile?.bio && <p className="profile-bio">{profile.bio}</p>}
      </div>
      <section className="profile-section">
        <h3>Account</h3>
        <div className="compact-card"><span>Email</span><b>{user.email}</b></div>
        <div className="compact-card"><span>Home city</span><b>{homeCity}</b></div>
        <div className="compact-card"><span>Member since</span><b>{profile?.createdAt ? new Date(profile.createdAt).getFullYear() : 'New'}</b></div>
        <button className="btn btn-ghost profile-signout" type="button" onClick={onSignOut}>
          Log Out
        </button>
      </section>
    </main>
  );
}
