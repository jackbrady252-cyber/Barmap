'use client';

import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActivityPage from '@/components/ActivityPage';
import AppHeader from '@/components/AppHeader';
import AuthModal from '@/components/AuthModal';
import BottomNav, { type AppTab } from '@/components/BottomNav';
import CreatePostModal from '@/components/CreatePostModal';
import EditProfileModal from '@/components/EditProfileModal';
import FeedPage from '@/components/FeedPage';
import FeedbackModal from '@/components/FeedbackModal';
import Map from '@/components/Map';
import ParkPanel from '@/components/ParkPanel';
import ProfilePage from '@/components/ProfilePage';
import SubmitSpotModal from '@/components/SubmitSpotModal';
import { verifiedParks } from '@/data/parks';
import { getSeededFeedPosts } from '@/data/socialFeed';
import { ensureProfile, fetchProfile, getCurrentUser, signOut as signOutUser } from '@/lib/auth';
import { fetchApprovedDiscoveryParks } from '@/lib/discovery';
import { fetchApprovedUsers, fetchFollowingIds, followUser, unfollowUser } from '@/lib/follows';
import { fetchApprovedParkMedia, fetchOwnPendingParkMedia, type ParkMediaItem } from '@/lib/parkMedia';
import { fetchPosts } from '@/lib/posts';
import { fetchSavedPostIds, savePostForUser, unsavePostForUser } from '@/lib/savedPosts';
import { fetchUpcomingSessions, type TrainingSession } from '@/lib/sessions';
import { hydrateParks } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import type { AuthMode, UserDiscoveryProfile, UserProfile } from '@/types/auth';
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [usersLoading, setUsersLoading] = useState(true);
  const [discoveryUsers, setDiscoveryUsers] = useState<UserDiscoveryProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [publicSpotLoading, setPublicSpotLoading] = useState(true);
  const [publicSpotCount, setPublicSpotCount] = useState(0);
  const [parkMedia, setParkMedia] = useState<ParkMediaItem[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);
  const [pickedLatLng, setPickedLatLng] = useState<PickedLatLng | null>(null);
  const [pickingSpot, setPickingSpot] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number | null>(null);

  const parksWithMedia = useMemo(() => {
    const byPark = new globalThis.Map<number, ParkMediaItem[]>();
    parkMedia.forEach(item => byPark.set(item.parkId, [...(byPark.get(item.parkId) || []), item]));
    return parks.map(park => {
      const media = byPark.get(park.id) || [];
      const approved = media.filter(item => item.moderationStatus === 'approved');
      const approvedImages = approved.filter(item => item.mediaType === 'image').map(item => item.mediaUrl);
      return {
        ...park,
        img: approvedImages[0] || park.img,
        gallery: [...approvedImages, ...(park.gallery || [])].filter(Boolean),
        media: approved,
        pendingMediaCount: media.filter(item => item.moderationStatus === 'pending').length
      };
    });
  }, [parkMedia, parks]);

  const selectedPark = parksWithMedia.find(park => park.id === selectedParkId) || null;
  const feedPosts = useMemo(() => [...posts, ...getSeededFeedPosts(parksWithMedia)], [parksWithMedia, posts]);
  const savedPosts = useMemo(() => feedPosts.filter(post => savedPostIds.has(post.id)), [feedPosts, savedPostIds]);
  const currentDirectoryProfile = useMemo(() => discoveryUsers.find(item => item.id === user?.id) || null, [discoveryUsers, user?.id]);
  const userApproved = Boolean(user && profile?.userStatus !== 'rejected');

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
      const nextPosts = await fetchPosts(parksWithMedia);
      setPosts(nextPosts);
    } catch (err) {
      console.error('[BARMAP posts] Could not load posts', err);
      showNotice(err instanceof Error ? err.message : 'Post loading failed.');
    }
  }, [parksWithMedia, showNotice]);

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

  const loadFollowingIds = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setFollowingIds(new Set());
      return;
    }

    try {
      const ids = await fetchFollowingIds(nextUser.id);
      setFollowingIds(new Set(ids));
    } catch (err) {
      console.error('[BARMAP follows] Could not load following list', err);
      showNotice(err instanceof Error ? err.message : 'Following list loading failed.');
    }
  }, [showNotice]);

  const loadUsers = useCallback(async (currentUserId?: string) => {
    setUsersLoading(true);
    try {
      const nextUsers = await fetchApprovedUsers(currentUserId);
      setDiscoveryUsers(nextUsers);
    } catch (err) {
      console.error('[BARMAP users] Could not load user directory', err);
      showNotice(err instanceof Error ? err.message : 'User directory loading failed.');
    } finally {
      setUsersLoading(false);
    }
  }, [showNotice]);

  const loadApprovedDiscoveryParks = useCallback(async () => {
    setPublicSpotLoading(true);
    try {
      const approvedParks = await fetchApprovedDiscoveryParks();
      setPublicSpotCount(approvedParks.length);
      setParks(hydrateParks([...verifiedParks, ...approvedParks]));
    } catch (err) {
      console.error('[BARMAP discovery] Could not load approved discovery parks', err);
      showNotice(err instanceof Error ? err.message : 'Approved spot loading failed.');
    } finally {
      setPublicSpotLoading(false);
    }
  }, [showNotice]);

  const loadParkMedia = useCallback(async (userId?: string) => {
    try {
      const [approved, pendingOwn] = await Promise.all([fetchApprovedParkMedia(), fetchOwnPendingParkMedia(userId)]);
      setParkMedia([...approved, ...pendingOwn]);
    } catch (err) {
      console.error('[BARMAP park media] Could not load park media', err);
      showNotice(err instanceof Error ? err.message : 'Park media loading failed.');
    }
  }, [showNotice]);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await fetchUpcomingSessions());
    } catch (err) {
      console.error('[BARMAP sessions] Could not load sessions', err);
      showNotice(err instanceof Error ? err.message : 'Sessions loading failed.');
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
    void loadParkMedia(user?.id);
  }, [loadParkMedia, user?.id]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadApprovedDiscoveryParks();
  }, [loadApprovedDiscoveryParks]);

  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;

    const channel = client
      .channel('public-spots-map-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_spots' }, () => {
        void loadApprovedDiscoveryParks();
      })
      .subscribe();

    function refreshOnFocus() {
      void loadApprovedDiscoveryParks();
    }

    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      void client.removeChannel(channel);
    };
  }, [loadApprovedDiscoveryParks]);

  useEffect(() => {
    void loadSavedPosts(user);
  }, [loadSavedPosts, user]);

  useEffect(() => {
    void loadFollowingIds(user);
    void loadUsers(user?.id);
  }, [loadFollowingIds, loadUsers, user]);

  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;
    const channel = client
      .channel('people-directory-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void loadUsers(user?.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
        void loadUsers(user?.id);
        void loadFollowingIds(user);
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadFollowingIds, loadUsers, user]);

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

  async function handleToggleFollow(targetUser: UserDiscoveryProfile, nextFollowing: boolean) {
    if (!requireApprovedUser('follow users')) throw new Error('Approval required.');
    const currentUser = user;
    if (!currentUser) throw new Error('Approval required.');

    setDiscoveryUsers(current =>
      current.map(item => {
        if (item.id !== targetUser.id) return item;
        return {
          ...item,
          isFollowing: nextFollowing,
          followerCount: Math.max(0, item.followerCount + (nextFollowing ? 1 : -1))
        };
      })
    );
    setFollowingIds(current => {
      const next = new Set(current);
      if (nextFollowing) next.add(targetUser.id);
      else next.delete(targetUser.id);
      return next;
    });

    try {
      if (nextFollowing) await followUser(currentUser.id, targetUser.id);
      else await unfollowUser(currentUser.id, targetUser.id);
      await loadUsers(currentUser.id);
      await loadFollowingIds(currentUser);
    } catch (err) {
      await loadUsers(currentUser.id);
      await loadFollowingIds(currentUser);
      showNotice(err instanceof Error ? err.message : 'Follow action failed.');
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
        onFeedbackOpen={() => setFeedbackOpen(true)}
      />

      {activeAppTab === 'feed' && (
        <FeedPage
          parks={parksWithMedia}
          posts={posts}
          savedPostIds={savedPostIds}
          canInteract={userApproved}
          followingUserIds={followingIds}
          onRestrictedAction={() => requireApprovedUser('use feed actions')}
          onToggleSave={handleToggleSave}
        />
      )}
      {activeAppTab === 'activity' && (
        <ActivityPage
          parks={parksWithMedia}
          sessions={sessions}
          users={discoveryUsers}
          usersLoading={usersLoading}
          currentUserId={user?.id}
          followingUserIds={followingIds}
          canInteract={userApproved}
          onRestrictedAction={() => requireApprovedUser('use activity')}
          onToggleFollow={handleToggleFollow}
          onCreateSession={() => {
            if (!requireApprovedUser('host sessions')) return;
            setCreatePostOpen(true);
          }}
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
          followerCount={currentDirectoryProfile?.followerCount || 0}
          followingCount={currentDirectoryProfile?.followingCount || followingIds.size}
          onCreatePost={() => setCreatePostOpen(true)}
          onEditProfile={() => setEditProfileOpen(true)}
          onToggleSave={handleToggleSave}
          onLogWorkout={saveWorkoutLog}
          onAuthOpen={openAuth}
          onSignOut={handleSignOut}
          onFeedbackOpen={() => setFeedbackOpen(true)}
        />
      )}
      {activeAppTab === 'map' && (
        <>
          <Map
            parks={parksWithMedia}
            selectedPark={selectedPark}
            notice={notice}
            publicSpotLoading={publicSpotLoading}
            publicSpotCount={publicSpotCount}
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
            user={user}
            onMediaAdded={() => {
              void loadParkMedia(user?.id);
              showNotice('Media submitted for admin review.');
            }}
            onSubmitCorrection={() => setFeedbackOpen(true)}
          />
        </>
      )}

      <SubmitSpotModal
        pickedLatLng={pickedLatLng}
        canSubmit={userApproved}
        user={user}
        onRestrictedAction={() => requireApprovedUser('submit parks')}
        onClose={() => {
          setPickedLatLng(null);
          setPickingSpot(false);
        }}
        onSaved={() => {
          setActiveAppTab('map');
          showNotice('Thanks! Your park has been submitted and will be reviewed before appearing publicly.');
        }}
      />
      <BottomNav
        activeTab={activeAppTab}
        onTabChange={tab => {
          if (tab === 'create') {
            if (!requireApprovedUser('create')) return;
            setCreatePostOpen(true);
            return;
          }
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
        parks={parksWithMedia}
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
        onSessionCreated={() => {
          void loadSessions();
          setActiveAppTab('activity');
          showNotice('Session posted.');
        }}
        onSubmitPark={() => {
          if (!requireApprovedUser('submit parks')) return;
          setActiveAppTab('map');
          setSelectedParkId(null);
          setPickingSpot(true);
          showNotice('Tap the map where the park is located.');
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
      <FeedbackModal
        open={feedbackOpen}
        user={user}
        onClose={() => setFeedbackOpen(false)}
        onSubmitted={() => showNotice("Thanks for helping improve BarMap. We'll review your feedback as soon as possible.")}
      />
    </div>
  );
}
