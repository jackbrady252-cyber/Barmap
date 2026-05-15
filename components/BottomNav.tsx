'use client';

import type { ComponentType } from 'react';
import { CalendarIcon, ChallengeIcon, FeedIcon, MapTabIcon, ProfileIcon } from '@/components/NavIcons';

export type AppTab = 'feed' | 'map' | 'challenges' | 'events' | 'profile';

const tabs: Array<{ id: AppTab; label: string; icon: ComponentType }> = [
  { id: 'feed', label: 'Feed', icon: FeedIcon },
  { id: 'map', label: 'Map', icon: MapTabIcon },
  { id: 'challenges', label: 'Challenges', icon: ChallengeIcon },
  { id: 'events', label: 'Events', icon: CalendarIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon }
];

export default function BottomNav({ activeTab, onTabChange }: { activeTab: AppTab; onTabChange: (tab: AppTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button className={`bottom-nav__item${activeTab === tab.id ? ' active' : ''}`} key={tab.id} onClick={() => onTabChange(tab.id)}>
            <Icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
