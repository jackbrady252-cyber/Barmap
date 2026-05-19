'use client';

import { PinIcon, PlusIcon, UserIcon } from '@/components/icons';
import type { UserProfile } from '@/types/auth';

type AppHeaderProps = {
  pickingSpot: boolean;
  profile: UserProfile | null;
  loggedIn: boolean;
  onSubmitPark: () => void;
  onProfileOpen: () => void;
};

function initialsFor(profile: UserProfile | null) {
  if (!profile?.displayName) return '';
  return profile.displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AppHeader({ pickingSpot, profile, loggedIn, onSubmitPark, onProfileOpen }: AppHeaderProps) {
  const initials = initialsFor(profile);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="6" y1="6" x2="6" y2="18" />
            <line x1="18" y1="6" x2="18" y2="18" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
        </div>
        <div>
          <span className="brand-text">BARMAP</span>
          <span className="brand-sub">/ IRELAND</span>
        </div>
      </div>
      <div className="nav-actions">
        <button className={`btn${pickingSpot ? ' btn-primary' : ''}`} id="addParkBtn" onClick={onSubmitPark}>
          {pickingSpot ? <PinIcon small /> : <PlusIcon small />}
          {pickingSpot ? 'Pick spot' : 'Submit park'}
        </button>
        <button
          className={`avatar header-profile${loggedIn ? '' : ' logged-out'}`}
          id="profileBtn"
          title={loggedIn ? 'Profile' : 'Sign in'}
          aria-label={loggedIn ? 'Open profile' : 'Sign in'}
          onClick={onProfileOpen}
        >
          {loggedIn && initials ? initials : <UserIcon small />}
          {!loggedIn && <span>Sign in</span>}
        </button>
      </div>
    </div>
  );
}
