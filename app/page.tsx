'use client';

import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import AuthModal from '@/components/AuthModal';
import BottomNav, { type AppTab } from '@/components/BottomNav';
import ChallengesPage from '@/components/ChallengesPage';
import CreatePostModal from '@/components/CreatePostModal';
import EditProfileModal from '@/components/EditProfileModal';
import EventsPage from '@/components/EventsPage';
import FeedPage from '@/components/FeedPage';
import { PlusIcon } from '@/components/icons';
import Map from '@/components/Map';
import ParkPanel from '@/components/ParkPanel';
import ProfilePage from '@/components/ProfilePage';
import SubmitSpotModal from '@/components/SubmitSpotModal';
import { verifiedParks } from '@/data/parks';
import { getSeededFeedPosts } from '@/data/socialFeed';
import { ensureProfile, fetchProfile, getCurrentUser, signOut as signOutUser } from '@/lib/auth';
import { fetchApprovedDiscoveryParks } from '@/lib/discovery';
import { fetchPosts } from '@/lib/posts';
import { fetchSavedPostIds, savePostForUser, unsavePostForUser } from '@/lib/savedPosts';
import { hydrateParks } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import type { AuthMode, UserProfile } from '@/types/auth';
import type { MissionSubmission, WorkoutLog } from '@/types/activity';
import type { Park } from '@/types/park';
import type { SocialPost } from '@/types/social';

type PickedLatLng = {
  lat: number;
  lng: number;
};

export default function Home() {
  const initialParks = useMemo(() => hydrateParks(verifiedParks), []);
  const [parks, setParks] = useState<Park[]>(initialParks);
  const [selectedParkId, setSelectedParkId] = useState<number | null>(null);
  const [activeAppTab, setActiveAppTab] = useState<AppTab>('feed');
  const [activeParkTab, setActiveParkTab] = useState('feed');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);
  const [pickedLatLng, setPickedLatLng] = useState<PickedLatLng | null>(null);
  const [pickingSpot, setPickingSpot] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number | null>(null);

  const selectedPark = parks.find(park => park.id === selectedParkId) || null;
  const feedPosts = useMemo(() => [...posts, ...getSeededFeedPosts(parks)], [parks, posts]);
  const savedPosts = useMemo(() => feedPosts.filter(post => savedPostIds.has(post.id)), [feedPosts, savedPostIds]);
  const userApproved = Boolean(user && profile?.userStatus === 'approved');

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 5200);
  }, []);

  const loadUserProfile = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setSavedPostIds(new Set());
      setAuthLoading(false);
      return;
    }

    try {
      const nextProfile = (await fetchProfile(nextUser.id)) || (await ensureProfile(nextUser));
      setProfile(nextProfile);
    } catch (err) {
      console.error('[BARMAP auth] Could not load profile after auth state change', err);
      setProfile(null);
      showNotice(err instanceof Error ? err.message : 'Profile loading failed.');
    } finally {
      setAuthLoading(false);
    }
  }, [showNotice]);

  const loadPosts = useCallback(async () => {
    try {
      const nextPosts = await fetchPosts(parks);
      setPosts(nextPosts);
    } catch (err) {
      console.error('[BARMAP posts] Could not load posts', err);
      showNotice(err instanceof Error ? err.message : 'Post loading failed.');
    }
  }, [parks, showNotice]);

  const loadSavedPosts = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setSavedPostIds(new Set());
      return;
    }

    try {
      const ids = await fetchSavedPostIds(nextUser.id);
      setSavedPostIds(new Set(ids));
    } catch (err) {
      console.error('[BARMAP saved posts] Could not load saved posts', err);
      showNotice(err instanceof Error ? err.message : 'Saved posts loading failed.');
    }
  }, [showNotice]);

  const loadApprovedDiscoveryParks = useCallback(async () => {
    try {
      const approvedParks = await fetchApprovedDiscoveryParks();
      if (approvedParks.length === 0) return;
      setParks(hydrateParks([...verifiedParks, ...approvedParks]));
    } catch (err) {
      console.error('[BARMAP discovery] Could not load approved discovery parks', err);
      showNotice(err instanceof Error ? err.message : 'Approved spot loading failed.');
    }
  }, [showNotice]);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      if (!supabase) {
        setAuthLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      if (mounted) await loadUserProfile(currentUser);
    }

    loadAuth();

    if (!supabase) return undefined;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      window.setTimeout(() => {
        if (mounted) void loadUserProfile(session?.user || null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    void loadApprovedDiscoveryParks();
  }, [loadApprovedDiscoveryParks]);

  useEffect(() => {
    void loadSavedPosts(user);
  }, [loadSavedPosts, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedLogs = JSON.parse(window.localStorage.getItem('barmap:workout_logs') || '[]');
      const storedSubmissions = JSON.parse(window.localStorage.getItem('barmap:mission_submissions') || '[]');
      if (Array.isArray(storedLogs)) setWorkoutLogs(storedLogs);
      if (Array.isArray(storedSubmissions)) setMissionSubmissions(storedSubmissions);
    } catch {
      setWorkoutLogs([]);
      setMissionSubmissions([]);
    }
  }, []);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  function requireApprovedUser(action = 'use this feature') {
    if (!user) {
      openAuth('login');
      showNotice(`Log in to ${action}.`);
      return false;
    }

    if (profile?.userStatus === 'rejected') {
      showNotice('This account is not approved for BARMAP access.');
      return false;
    }

    if (profile?.userStatus !== 'approved') {
      showNotice('Your account is pending admin approval.');
      return false;
    }

    return true;
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      setSavedPostIds(new Set());
      showNotice('Logged out.');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Logout failed.');
    }
  }

  async function handleToggleSave(post: SocialPost, nextSaved: boolean) {
    if (!requireApprovedUser('save posts')) throw new Error('Approval required.');
    const currentUser = user;
    if (!currentUser) throw new Error('Approval required.');

    setSavedPostIds(current => {
      const next = new Set(current);
      if (nextSaved) next.add(post.id);
      else next.delete(post.id);
      return next;
    });

    try {
      if (nextSaved) await savePostForUser(currentUser.id, post.id);
      else await unsavePostForUser(currentUser.id, post.id);
    } catch (err) {
      setSavedPostIds(current => {
        const next = new Set(current);
        if (nextSaved) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
      showNotice(err instanceof Error ? err.message : 'Save failed.');
      throw err;
    }
  }

  function addPost(parkId: number, text: string) {
    if (!requireApprovedUser('post at parks')) return;

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
    if (!requireApprovedUser('join missions')) return;

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
    if (!requireApprovedUser('join sessions')) return;

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

  function saveWorkoutLog(input: Omit<WorkoutLog, 'id' | 'createdAt'>) {
    if (!requireApprovedUser('log workouts')) return;

    const nextLog: WorkoutLog = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    setWorkoutLogs(current => {
      const next = [nextLog, ...current];
      window.localStorage.setItem('barmap:workout_logs', JSON.stringify(next));
      return next;
    });
    showNotice('Workout logged.');
  }

  function submitMission(input: Omit<MissionSubmission, 'id' | 'verificationStatus' | 'createdAt'>) {
    if (!requireApprovedUser('join missions')) return;

    const submission: MissionSubmission = {
      ...input,
      id: crypto.randomUUID(),
      verificationStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    setMissionSubmissions(current => {
      const next = [submission, ...current];
      window.localStorage.setItem('barmap:mission_submissions', JSON.stringify(next));
      return next;
    });
    showNotice('Mission submitted for verification.');
  }

  return (
    <div className="app-shell">
      <AppHeader
        pickingSpot={pickingSpot}
        profile={profile}
        loggedIn={Boolean(user)}
        onSubmitPark={() => {
          if (!requireApprovedUser('submit parks')) return;
          setActiveAppTab('map');
          setSelectedParkId(null);
          setPickingSpot(current => !current);
        }}
        onProfileOpen={() => setActiveAppTab('profile')}
      />

      {activeAppTab === 'feed' && (
        <FeedPage
          parks={parks}
          posts={posts}
          savedPostIds={savedPostIds}
          canInteract={userApproved}
          onRestrictedAction={() => requireApprovedUser('use feed actions')}
          onToggleSave={handleToggleSave}
        />
      )}
      {activeAppTab === 'challenges' && (
        <ChallengesPage
          parks={parks}
          submissions={missionSubmissions}
          canInteract={userApproved}
          onRestrictedAction={() => requireApprovedUser('join missions')}
          onSubmitMission={submitMission}
        />
      )}
      {activeAppTab === 'events' && (
        <EventsPage
          parks={parks}
          canInteract={userApproved}
          onRestrictedAction={() => requireApprovedUser('join sessions')}
        />
      )}
      {activeAppTab === 'profile' && (
        <ProfilePage
          user={user}
          profile={profile}
          loading={authLoading}
          posts={posts.filter(post => post.createdBy === user?.id)}
          savedPosts={savedPosts}
          savedPostIds={savedPostIds}
          workoutLogs={workoutLogs}
          missionSubmissions={missionSubmissions}
          onCreatePost={() => setCreatePostOpen(true)}
          onEditProfile={() => setEditProfileOpen(true)}
          onToggleSave={handleToggleSave}
          onLogWorkout={saveWorkoutLog}
          onAuthOpen={openAuth}
          onSignOut={handleSignOut}
        />
      )}
      {activeAppTab === 'map' && (
        <>
          <Map
            parks={parks}
            selectedPark={selectedPark}
            notice={notice}
            pickingSpot={pickingSpot}
            onNotice={showNotice}
            onPickingSpotChange={setPickingSpot}
            onParkSelect={park => {
              setSelectedParkId(park.id);
              setActiveParkTab('feed');
            }}
            onSpotPicked={latLng => setPickedLatLng(latLng)}
          />
          <ParkPanel
            park={selectedPark}
            activeTab={activeParkTab}
            onClose={() => setSelectedParkId(null)}
            onTabChange={setActiveParkTab}
            canInteract={userApproved}
            onRestrictedAction={() => requireApprovedUser('use park actions')}
            onAddPost={addPost}
            onSubmitScore={updateChallengeScore}
            onToggleRsvp={toggleRsvp}
          />
        </>
      )}

      <SubmitSpotModal
        pickedLatLng={pickedLatLng}
        canSubmit={userApproved}
        onRestrictedAction={() => requireApprovedUser('submit parks')}
        onClose={() => {
          setPickedLatLng(null);
          setPickingSpot(false);
        }}
        onSaved={() => {
          setActiveAppTab('map');
          showNotice('Saved for review. It will not appear on the map until it is verified against a source.');
        }}
      />
      <button
        className="floating-create"
        type="button"
        onClick={() => {
          if (!requireApprovedUser('create a post')) return;
          setCreatePostOpen(true);
        }}
      >
        <PlusIcon />
        <span>Create</span>
      </button>
      <BottomNav
        activeTab={activeAppTab}
        onTabChange={tab => {
          setActiveAppTab(tab);
          if (tab !== 'map') {
            setSelectedParkId(null);
            setPickingSpot(false);
          }
        }}
      />
      <AuthModal
        mode={authMode}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onModeChange={setAuthMode}
        onAuthenticated={() => {
          setAuthModalOpen(false);
          setActiveAppTab('profile');
          showNotice('Logged in.');
        }}
      />
      <CreatePostModal
        open={createPostOpen}
        user={user}
        profile={profile}
        parks={parks}
        onClose={() => setCreatePostOpen(false)}
        onAuthRequired={() => {
          setCreatePostOpen(false);
          openAuth('login');
        }}
        onCreated={() => {
          void loadPosts();
          setActiveAppTab('feed');
          showNotice('Post created.');
        }}
      />
      <EditProfileModal
        open={editProfileOpen}
        profile={profile}
        onClose={() => setEditProfileOpen(false)}
        onSaved={nextProfile => {
          setProfile(nextProfile);
          showNotice('Profile saved.');
        }}
      />
    </div>
  );
}
