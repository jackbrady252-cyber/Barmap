'use client';

import type { User } from '@supabase/supabase-js';
import { useState } from 'react';
import PostCard from '@/components/PostCard';
import type { AuthMode, UserProfile } from '@/types/auth';
import type { SocialPost } from '@/types/social';

type ProfilePageProps = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  posts: SocialPost[];
  onCreatePost: () => void;
  onEditProfile: () => void;
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

export default function ProfilePage({ user, profile, loading, posts, onCreatePost, onEditProfile, onAuthOpen, onSignOut }: ProfilePageProps) {
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'stats' | 'saved'>('posts');

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
          <p>Create an account or log in to show your real BARMAP profile here. Your map, feed, missions, and sessions stay available while logged out.</p>
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
  const postTiles = posts.slice(0, 12);

  return (
    <main className="app-main app-page profile-page">
      <div className="profile-hero">
        {profile?.avatarUrl ? (
          <img className="avatar profile-avatar profile-avatar-img" src={profile.avatarUrl} alt="" />
        ) : (
          <div className="avatar profile-avatar">{initialsFor(profile, user)}</div>
        )}
        <div className="profile-identity">
          <span className="page-kicker">Profile</span>
          <h1>{displayName}</h1>
          <p>{username} · {homeCity}</p>
          <p className="profile-bio">{profile?.bio || 'Calisthenics, verified spots, quiet sessions.'}</p>
        </div>
      </div>
      <section className="profile-stat-row" aria-label="Profile stats">
        <div>
          <b>{posts.length}</b>
          <span>Posts</span>
        </div>
        <div>
          <b>0</b>
          <span>Missions</span>
        </div>
        <div>
          <b>0</b>
          <span>Sessions</span>
        </div>
        <div>
          <b>0</b>
          <span>Spots</span>
        </div>
      </section>

      <div className="profile-actions">
        <button className="btn btn-primary" type="button" onClick={onEditProfile}>Edit Profile</button>
        <button className="btn btn-ghost" type="button" onClick={onSignOut}>Log Out</button>
      </div>

      <section className="profile-tabs" aria-label="Profile content">
        <div className="profile-tab-list">
          {[
            ['posts', 'Posts'],
            ['stats', 'Stats'],
            ['saved', 'Saved Spots']
          ].map(([id, label]) => (
            <button
              className={activeProfileTab === id ? 'active' : ''}
              type="button"
              key={id}
              onClick={() => setActiveProfileTab(id as 'posts' | 'stats' | 'saved')}
            >
              {label}
            </button>
          ))}
        </div>

        {activeProfileTab === 'posts' && (
          postTiles.length > 0 ? (
            <div className="profile-post-grid">
              {postTiles.map(post => (
                <div
                  className="profile-post-tile"
                  style={{ backgroundImage: post.mediaUrl ? `url("${post.mediaUrl}")` : post.park?.img ? `url("${post.park.img}")` : undefined }}
                  key={post.id}
                >
                  <span>{post.mediaType}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-empty">
              <b>No posts yet</b>
              <span>Your training archive starts with one session.</span>
              <button className="btn btn-primary" type="button" onClick={onCreatePost}>Create your first post</button>
            </div>
          )
        )}

        {activeProfileTab === 'stats' && (
          <div className="profile-stats-list">
            <div><span>Training streak</span><b>0 days</b></div>
            <div><span>Missions completed</span><b>0</b></div>
            <div><span>Sessions hosted</span><b>0</b></div>
            <div><span>Member since</span><b>{profile?.createdAt ? new Date(profile.createdAt).getFullYear() : 'New'}</b></div>
          </div>
        )}

        {activeProfileTab === 'saved' && (
          <div className="premium-empty">
            <b>No saved spots yet</b>
            <span>Bookmarked parks and training locations will live here.</span>
          </div>
        )}
      </section>
    </main>
  );
}
