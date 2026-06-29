'use client';

import { useMemo, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import type { UserDiscoveryProfile } from '@/types/auth';

type UsersPageProps = {
  currentUserId?: string;
  users: UserDiscoveryProfile[];
  loading: boolean;
  canInteract: boolean;
  onRestrictedAction: () => void;
  onToggleFollow: (targetUser: UserDiscoveryProfile, nextFollowing: boolean) => Promise<void> | void;
};

function initialsFor(user: UserDiscoveryProfile) {
  return (user.displayName || user.username || 'BM')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UsersPage({ currentUserId, users, loading, canInteract, onRestrictedAction, onToggleFollow }: UsersPageProps) {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(user =>
      user.username.toLowerCase().includes(q)
      || user.displayName.toLowerCase().includes(q)
    );
  }, [query, users]);

  const selectedUser = users.find(user => user.id === selectedUserId) || null;

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

  function renderFollowButton(targetUser: UserDiscoveryProfile) {
    if (targetUser.id === currentUserId) {
      return <span className="score-pill">You</span>;
    }

    return (
      <button
        className={`btn ${targetUser.isFollowing ? 'btn-ghost' : 'btn-primary'}`}
        type="button"
        disabled={busyUserId === targetUser.id}
        onClick={event => {
          event.stopPropagation();
          void toggleFollow(targetUser, !targetUser.isFollowing);
        }}
      >
        {busyUserId === targetUser.id ? 'Saving...' : targetUser.isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    );
  }

  return (
    <main className="app-main app-page users-page">
      <section className="section-hero users-hero">
        <div>
          <span className="page-kicker">Users</span>
          <h1>Find approved BARMAP athletes.</h1>
          <p>Search by username or display name, follow people, and open profiles from the directory.</p>
        </div>
        <div className="form-field">
          <label htmlFor="user-search">Search users</label>
          <input
            id="user-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Username or display name"
          />
        </div>
      </section>

      {loading ? (
        <div className="premium-empty compact">
          <b>Loading users</b>
          <span>Fetching approved profiles.</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="premium-empty compact">
          <b>No users found</b>
          <span>Try another username or display name.</span>
        </div>
      ) : (
        <section className="users-list" aria-label="Approved users">
          {filteredUsers.map(user => (
            <article
              className={`user-directory-card${selectedUserId === user.id ? ' active' : ''}`}
              key={user.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedUserId(user.id)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedUserId(user.id);
                }
              }}
            >
              {user.avatarUrl ? (
                <img className="avatar user-directory-avatar" src={user.avatarUrl} alt="" />
              ) : (
                <div className="avatar user-directory-avatar">{initialsFor(user)}</div>
              )}
              <div className="user-directory-main">
                <h3>{user.displayName || user.username}</h3>
                <p>@{user.username} · {user.homeCity || 'BARMAP'}</p>
                {user.bio && <p>{user.bio}</p>}
                <div className="user-count-row">
                  <span><b>{user.followerCount}</b> followers</span>
                  <span><b>{user.followingCount}</b> following</span>
                </div>
              </div>
              <div className="user-directory-action">
                {renderFollowButton(user)}
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedUser && (
        <section className="selected-user-panel" aria-label={`${selectedUser.displayName} profile`}>
          <button className="panel-close" type="button" aria-label="Close selected profile" onClick={() => setSelectedUserId('')}>
            <CloseIcon />
          </button>
          <div className="profile-hero">
            {selectedUser.avatarUrl ? (
              <img className="avatar profile-avatar profile-avatar-img" src={selectedUser.avatarUrl} alt="" />
            ) : (
              <div className="avatar profile-avatar">{initialsFor(selectedUser)}</div>
            )}
            <div className="profile-identity">
              <span className="page-kicker">Profile</span>
              <h1>{selectedUser.displayName || selectedUser.username}</h1>
              <p>@{selectedUser.username} · {selectedUser.homeCity || 'BARMAP'}</p>
              <p className="profile-bio">{selectedUser.bio || 'Approved BARMAP athlete.'}</p>
            </div>
          </div>
          <section className="profile-stat-row" aria-label="Selected user stats">
            <div>
              <b>{selectedUser.followerCount}</b>
              <span>Followers</span>
            </div>
            <div>
              <b>{selectedUser.followingCount}</b>
              <span>Following</span>
            </div>
            <div>
              <b>{new Date(selectedUser.createdAt).getFullYear()}</b>
              <span>Joined</span>
            </div>
            <div>
              {renderFollowButton(selectedUser)}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
