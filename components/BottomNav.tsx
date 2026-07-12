'use client';

import type { ComponentType } from 'react';
import { CalendarIcon, CreateIcon, FeedIcon, MapTabIcon, ProfileIcon } from '@/components/NavIcons';

export type AppTab = 'feed' | 'map' | 'create' | 'activity' | 'profile';

const tabs: Array<{ id: AppTab; label: string; icon: ComponentType }> = [
  { id: 'feed', label: 'Home', icon: FeedIcon },
  { id: 'map', label: 'Map', icon: MapTabIcon },
  { id: 'create', label: 'Create', icon: CreateIcon },
  { id: 'activity', label: 'Activity', icon: CalendarIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon }
];

export default function BottomNav({ activeTab, onTabChange }: { activeTab: AppTab; onTabChange: (tab: AppTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            className={`bottom-nav__item${activeTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            type="button"
            aria-current={activeTab === tab.id ? 'page' : undefined}
            aria-label={tab.label}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
