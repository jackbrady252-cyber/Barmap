'use client';

import type { User } from '@supabase/supabase-js';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { CloseIcon } from '@/components/icons';
import PostCard from '@/components/PostCard';
import type { MissionSubmission, WorkoutLog } from '@/types/activity';
import type { AuthMode, UserProfile } from '@/types/auth';
import type { SocialPost } from '@/types/social';

type ProfilePageProps = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  posts: SocialPost[];
  savedPosts: SocialPost[];
  savedPostIds: Set<string>;
  workoutLogs: WorkoutLog[];
  missionSubmissions: MissionSubmission[];
  followerCount: number;
  followingCount: number;
  onCreatePost: () => void;
  onEditProfile: () => void;
  onToggleSave: (post: SocialPost, nextSaved: boolean) => Promise<void> | void;
  onLogWorkout: (log: Omit<WorkoutLog, 'id' | 'createdAt'>) => void;
  onAuthOpen: (mode: AuthMode) => void;
  onSignOut: () => void;
  onFeedbackOpen: () => void;
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

export default function ProfilePage({
  user,
  profile,
  loading,
  posts,
  savedPosts,
  savedPostIds,
  workoutLogs,
  missionSubmissions,
  followerCount,
  followingCount,
  onCreatePost,
  onEditProfile,
  onToggleSave,
  onLogWorkout,
  onAuthOpen,
  onSignOut,
  onFeedbackOpen
}: ProfilePageProps) {
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'contributions' | 'saved'>('posts');
  const [logOpen, setLogOpen] = useState(false);
  const [workoutType, setWorkoutType] = useState('');
  const [exercise, setExercise] = useState('');
  const [setsRepsTimeDistance, setSetsRepsTimeDistance] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

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

  const userStatus = profile?.userStatus || 'pending';

  if (userStatus === 'rejected') {
    return (
      <main className="app-main app-page profile-page">
        <div className="profile-auth-card">
          <div className="profile-empty-avatar">{userStatus}</div>
          <span className="page-kicker">Application</span>
          <h1>Access not approved</h1>
          <p>This account is not approved for BARMAP access right now.</p>
          <div className="profile-auth-actions">
            <button className="btn btn-ghost" type="button" onClick={onSignOut}>Log Out</button>
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile?.displayName || user.email || 'BARMAP Athlete';
  const username = profile?.username ? `@${profile.username}` : user.email || '';
  const homeCity = profile?.homeCity || 'Ireland';
  const postTiles = posts.slice(0, 12);
  const pendingSubmissions = missionSubmissions.filter(submission => submission.verificationStatus === 'pending');

  function submitWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogWorkout({
      workoutType: workoutType.trim(),
      exercise: exercise.trim(),
      setsRepsTimeDistance: setsRepsTimeDistance.trim(),
      location: location.trim(),
      notes: notes.trim()
    });
    setWorkoutType('');
    setExercise('');
    setSetsRepsTimeDistance('');
    setLocation('');
    setNotes('');
    setLogOpen(false);
  }

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
          <b>{followerCount}</b>
          <span>Followers</span>
        </div>
        <div>
          <b>{followingCount}</b>
          <span>Following</span>
        </div>
        <div>
          <b>{savedPosts.length}</b>
          <span>Saved</span>
        </div>
      </section>

      <div className="profile-actions">
        <button className="btn btn-primary" type="button" onClick={onEditProfile}>Edit Profile</button>
        <button className="btn btn-ghost" type="button" onClick={onFeedbackOpen}>Feedback</button>
        <button className="btn btn-ghost" type="button" onClick={() => setLogOpen(true)}>Settings</button>
        <button className="btn btn-ghost" type="button" onClick={onSignOut}>Log Out</button>
      </div>

      <section className="profile-tabs" aria-label="Profile content">
        <div className="profile-tab-list">
          {[
            ['posts', 'Posts'],
            ['contributions', 'Contributions'],
            ['saved', 'Saved']
          ].map(([id, label]) => (
            <button
              className={activeProfileTab === id ? 'active' : ''}
              type="button"
              key={id}
              onClick={() => setActiveProfileTab(id as 'posts' | 'contributions' | 'saved')}
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
                  style={{ backgroundImage: post.mediaItems?.[0]?.mediaType === 'image' ? `url("${post.mediaItems[0].mediaUrl}")` : post.mediaUrl ? `url("${post.mediaUrl}")` : post.park?.img ? `url("${post.park.img}")` : undefined }}
                  key={post.id}
                />
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

        {activeProfileTab === 'contributions' && (
          <div className="profile-stats-stack">
            <section className="profile-stat-section">
              <h3>Park Contributions</h3>
              <div className="profile-stats-list">
                <div><span>Posts at parks</span><b>{posts.filter(post => post.park).length}</b></div>
                <div><span>Saved park posts</span><b>{savedPosts.length}</b></div>
              </div>
            </section>

            <section className="profile-stat-section">
              <h3>Training Activity</h3>
              <div className="profile-stats-list">
                <div><span>Logged workouts</span><b>{workoutLogs.length}</b></div>
                <div><span>Pending mission proofs</span><b>{pendingSubmissions.length}</b></div>
              </div>
            </section>
          </div>
        )}

        {activeProfileTab === 'saved' && (
          savedPosts.length > 0 ? (
            <div className="profile-saved-feed">
              {savedPosts.map(post => (
                <PostCard
                  post={post}
                  saved={savedPostIds.has(post.id)}
                  canInteract
                  onToggleSave={onToggleSave}
                  key={post.id}
                />
              ))}
            </div>
          ) : (
            <div className="premium-empty">
              <b>No saved posts yet</b>
              <span>Bookmark posts from the feed and they will appear here.</span>
            </div>
          )
        )}
      </section>
      {logOpen && (
        <div className="modal-bg open" onClick={event => {
          if (event.target === event.currentTarget) setLogOpen(false);
        }}>
          <form className="modal auth-modal" onSubmit={submitWorkout}>
            <button className="panel-close" type="button" aria-label="Close workout log" onClick={() => setLogOpen(false)}>
              <CloseIcon />
            </button>
            <div className="modal-head">
              <h3>Log Workout</h3>
              <div className="handle">Add a real training entry to your profile</div>
            </div>
            <div className="auth-body modal-body">
              <div className="form-field">
                <label htmlFor="workout-type">Workout type</label>
                <input id="workout-type" value={workoutType} onChange={event => setWorkoutType(event.target.value)} placeholder="Strength, skill, endurance..." required />
              </div>
              <div className="form-field">
                <label htmlFor="workout-exercise">Exercise</label>
                <input id="workout-exercise" value={exercise} onChange={event => setExercise(event.target.value)} placeholder="Pull-ups, dips, run..." required />
              </div>
              <div className="form-field">
                <label htmlFor="workout-result">Sets / reps / time / distance</label>
                <input id="workout-result" value={setsRepsTimeDistance} onChange={event => setSetsRepsTimeDistance(event.target.value)} placeholder="5x8, 20 reps, 25 min, 3 km..." required />
              </div>
              <div className="form-field">
                <label htmlFor="workout-location">Location</label>
                <input id="workout-location" value={location} onChange={event => setLocation(event.target.value)} placeholder="Park or city" />
              </div>
              <div className="form-field">
                <label htmlFor="workout-notes">Notes</label>
                <textarea id="workout-notes" value={notes} onChange={event => setNotes(event.target.value)} />
              </div>
              <div className="auth-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setLogOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Save Workout</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
