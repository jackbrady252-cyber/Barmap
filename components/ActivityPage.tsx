'use client';

import { useMemo, useState } from 'react';
import type { TrainingSession } from '@/lib/sessions';
import type { UserDiscoveryProfile } from '@/types/auth';
import type { Park } from '@/types/park';

type ActivityPageProps = {
  users: UserDiscoveryProfile[];
  usersLoading: boolean;
  currentUserId?: string;
  followingUserIds: Set<string>;
  sessions: TrainingSession[];
  parks: Park[];
  canInteract: boolean;
  onRestrictedAction: () => void;
  onToggleFollow: (targetUser: UserDiscoveryProfile, nextFollowing: boolean) => Promise<void> | void;
  onCreateSession: () => void;
};

function initialsFor(user: UserDiscoveryProfile) {
  return (user.displayName || user.username || 'BM')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.getDate()
  };
}

function formatSessionTime(start: string, end: string) {
  const startLabel = new Date(start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (!end) return startLabel;
  const endLabel = new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${startLabel} - ${endLabel}`;
}

export default function ActivityPage({
  users,
  usersLoading,
  currentUserId,
  followingUserIds,
  sessions,
  parks,
  canInteract,
  onRestrictedAction,
  onToggleFollow,
  onCreateSession
}: ActivityPageProps) {
  const [activeTab, setActiveTab] = useState<'following' | 'sessions' | 'people'>('following');
  const [query, setQuery] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  const followingUsers = useMemo(() => users.filter(user => followingUserIds.has(user.id)), [followingUserIds, users]);
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(user => user.username.toLowerCase().includes(q) || user.displayName.toLowerCase().includes(q));
  }, [query, users]);

  const seededSessions = useMemo(() => parks.flatMap(park => park.meetups.map(meetup => ({ park, meetup }))).slice(0, 3), [parks]);

  async function toggleFollow(targetUser: UserDiscoveryProfile, nextFollowing: boolean) {
    if (!canInteract) {
      onRestrictedAction();
      return;
    }
    setBusyUserId(targetUser.id);
    try {
      await onToggleFollow(targetUser, nextFollowing);
    } finally {
      setBusyUserId('');
    }
  }

  function followButton(targetUser: UserDiscoveryProfile) {
    if (targetUser.id === currentUserId) return <span className="score-pill">You</span>;
    return (
      <button
        className={`btn ${targetUser.isFollowing ? 'btn-ghost' : 'btn-primary'}`}
        type="button"
        disabled={busyUserId === targetUser.id}
        onClick={() => void toggleFollow(targetUser, !targetUser.isFollowing)}
      >
        {busyUserId === targetUser.id ? 'Saving...' : targetUser.isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    );
  }

  return (
    <main className="app-main app-page activity-page">
      <div className="activity-tabs" role="tablist" aria-label="Activity sections">
        {[
          ['following', 'Following'],
          ['sessions', 'Sessions'],
          ['people', 'People']
        ].map(([id, label]) => (
          <button className={activeTab === id ? 'active' : ''} type="button" key={id} onClick={() => setActiveTab(id as typeof activeTab)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'following' && (
        <section className="activity-stack" aria-label="Following activity">
          {followingUsers.length > 0 ? followingUsers.map(user => (
            <article className="activity-row" key={user.id}>
              {user.avatarUrl ? <img className="avatar activity-avatar" src={user.avatarUrl} alt="" /> : <div className="avatar activity-avatar">{initialsFor(user)}</div>}
              <div>
                <b>{user.displayName || user.username}</b>
                <span>@{user.username} · recent follow</span>
              </div>
              {followButton(user)}
            </article>
          )) : (
            <div className="premium-empty compact">
              <b>No following activity yet</b>
              <span>Follow people from the People tab to build your community feed.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === 'sessions' && (
        <section className="session-list" aria-label="Upcoming sessions">
          <button className="btn btn-primary activity-full-action" type="button" onClick={onCreateSession}>Host Session</button>
          {sessions.map(session => {
            const date = formatSessionDate(session.startAt);
            return (
              <article className="session-card" key={session.id}>
                <div className="event-date">
                  <span>{date.month}</span>
                  <b>{date.day}</b>
                </div>
                <div className="session-card__body">
                  <span>{formatSessionTime(session.startAt, session.endAt)}</span>
                  <h3>{session.title}</h3>
                  <p>{session.parkName} · {session.parkArea}</p>
                  <b>{session.participantLimit ? `${session.participantLimit} max` : 'Open crew'}</b>
                </div>
              </article>
            );
          })}
          {sessions.length === 0 && seededSessions.map(({ park, meetup }) => (
            <article className="session-card" key={`${park.id}-${meetup.title}`}>
              <div className="event-date">
                <span>{meetup.date.m}</span>
                <b>{meetup.date.d}</b>
              </div>
              <div className="session-card__body">
                <span>Upcoming</span>
                <h3>{meetup.title}</h3>
                <p>{park.name} · {park.area}</p>
                <b>{meetup.going} going</b>
              </div>
            </article>
          ))}
          {sessions.length === 0 && seededSessions.length === 0 && (
            <div className="premium-empty compact">
              <b>No upcoming sessions</b>
              <span>Host a session from Create when you are ready to train.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === 'people' && (
        <section className="activity-stack" aria-label="People search">
          <div className="form-field activity-search">
            <label htmlFor="activity-user-search">Search people</label>
            <input id="activity-user-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Username or display name" />
          </div>
          {usersLoading ? (
            <div className="premium-empty compact">
              <b>Loading people</b>
              <span>Fetching BARMAP profiles.</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="premium-empty compact">
              <b>No people found</b>
              <span>Try another username or display name.</span>
            </div>
          ) : filteredUsers.map(user => (
            <article className="activity-row" key={user.id}>
              {user.avatarUrl ? <img className="avatar activity-avatar" src={user.avatarUrl} alt="" /> : <div className="avatar activity-avatar">{initialsFor(user)}</div>}
              <div>
                <b>{user.displayName || user.username}</b>
                <span>@{user.username} · {user.followerCount} followers · {user.followingCount} following</span>
                {user.bio && <p>{user.bio}</p>}
              </div>
              {followButton(user)}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
