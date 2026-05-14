'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Map from '@/components/Map';
import ParkPanel from '@/components/ParkPanel';
import ProfileModal from '@/components/ProfileModal';
import SubmitSpotModal from '@/components/SubmitSpotModal';
import { verifiedParks } from '@/data/parks';
import { hydrateParks } from '@/lib/social';
import type { Park } from '@/types/park';

type PickedLatLng = {
  lat: number;
  lng: number;
};

export default function Home() {
  const initialParks = useMemo(() => hydrateParks(verifiedParks), []);
  const [parks, setParks] = useState<Park[]>(initialParks);
  const [selectedParkId, setSelectedParkId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [profileOpen, setProfileOpen] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState<PickedLatLng | null>(null);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number | null>(null);

  const selectedPark = parks.find(park => park.id === selectedParkId) || null;

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 5200);
  }, []);

  function addPost(parkId: number, text: string) {
    setParks(current =>
      current.map(park =>
        park.id === parkId
          ? {
              ...park,
              feed: [{ user: 'JB', color: 1, time: 'just now', text, tags: [] }, ...park.feed]
            }
          : park
      )
    );
  }

  function updateChallengeScore(parkId: number, challengeName: string, score: number) {
    setParks(current =>
      current.map(park => {
        if (park.id !== parkId) return park;

        return {
          ...park,
          challenges: park.challenges.map(challenge => {
            if (challenge.name !== challengeName) return challenge;
            const board = [...challenge.board, ['JB', score] as [string, number]]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8);
            return { ...challenge, board };
          })
        };
      })
    );
  }

  function toggleRsvp(parkId: number, meetupIndex: number, going: boolean) {
    setParks(current =>
      current.map(park => {
        if (park.id !== parkId) return park;
        return {
          ...park,
          meetups: park.meetups.map((meetup, index) =>
            index === meetupIndex ? { ...meetup, going: meetup.going + (going ? 1 : -1) } : meetup
          )
        };
      })
    );
  }

  return (
    <>
      <Map
        parks={parks}
        selectedPark={selectedPark}
        notice={notice}
        onNotice={showNotice}
        onOpenProfile={() => setProfileOpen(true)}
        onParkSelect={park => {
          setSelectedParkId(park.id);
          setActiveTab('feed');
        }}
        onSpotPicked={latLng => setPickedLatLng(latLng)}
      />
      <ParkPanel
        park={selectedPark}
        activeTab={activeTab}
        onClose={() => setSelectedParkId(null)}
        onTabChange={setActiveTab}
        onAddPost={addPost}
        onSubmitScore={updateChallengeScore}
        onToggleRsvp={toggleRsvp}
      />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SubmitSpotModal
        pickedLatLng={pickedLatLng}
        onClose={() => setPickedLatLng(null)}
        onSaved={() => showNotice('Saved for review. It will not appear on the map until it is verified against a source.')}
      />
    </>
  );
}
