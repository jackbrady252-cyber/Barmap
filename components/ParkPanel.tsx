'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon, CommentIcon, GlobeIcon, HeartIcon, MapIcon, PinIcon, SendIcon, ShareIcon, SourceIcon } from '@/components/icons';
import { seeded } from '@/lib/social';
import type { Challenge, FeedPost, Meetup, Park } from '@/types/park';

type ParkPanelProps = {
  park: Park | null;
  activeTab: string;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  canInteract: boolean;
  onRestrictedAction: () => void;
  onAddPost: (parkId: number, text: string) => void;
  onSubmitScore: (parkId: number, challengeName: string, score: number) => void;
  onToggleRsvp: (parkId: number, meetupIndex: number, going: boolean) => void;
};

export default function ParkPanel({
  park,
  activeTab,
  onClose,
  onTabChange,
  canInteract,
  onRestrictedAction,
  onAddPost,
  onSubmitScore,
  onToggleRsvp
}: ParkPanelProps) {
  const [activeImage, setActiveImage] = useState('');
  const [postText, setPostText] = useState('');
  const [goingMeetups, setGoingMeetups] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setActiveImage(park?.img || '');
    setPostText('');
    setGoingMeetups({});
  }, [park?.id, park?.img]);

  if (!park) {
    return (
      <div className="panel" id="sidePanel">
        <button className="panel-close" id="closePanel" title="Close" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="park-hero empty" id="parkHero">
          <svg className="placeholder-icon icon" viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <polyline points="21,15 16,10 6,19" />
          </svg>
          <span className="placeholder-text">No photo yet - be first</span>
          <div className="hero-fade" />
          <div className="hero-credit" id="parkHeroCredit" />
          <div className="hero-badge" id="parkHeroBadge" style={{ display: 'none' }} />
        </div>
        <div className="panel-header">
          <h2 id="parkName">Park name</h2>
          <div className="loc">
            <PinIcon small />
            <span id="parkLoc">Location</span>
          </div>
        </div>
        <div className="equipment-wrap">
          <div className="equipment-label">Equipment available</div>
          <div className="equipment" />
        </div>
        <Tabs activeTab={activeTab} onTabChange={onTabChange} />
        <div className="tab-content" id="tabContent" />
      </div>
    );
  }

  const gallery = (park.gallery || []).filter(Boolean);
  const locationText = park.address ? `${park.area} · ${park.address}` : park.area;
  const gmapsDir = `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`;
  const gmapsView = `https://www.google.com/maps/search/?api=1&query=${park.lat},${park.lng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${park.lat}&mlon=${park.lng}#map=19/${park.lat}/${park.lng}`;

  function submitPost() {
    if (!canInteract) {
      onRestrictedAction();
      return;
    }

    const text = postText.trim();
    if (!park || !text) return;
    onAddPost(park.id, text);
    setPostText('');
  }

  return (
    <div className="panel open" id="sidePanel">
      <button className="panel-close" id="closePanel" title="Close" onClick={onClose}>
        <CloseIcon />
      </button>

      <div
        className={`park-hero${activeImage ? '' : ' empty'}`}
        id="parkHero"
        style={activeImage ? { backgroundImage: `url("${activeImage}")` } : undefined}
      >
        {!activeImage && (
          <>
            <svg className="placeholder-icon icon" viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <polyline points="21,15 16,10 6,19" />
            </svg>
            <span className="placeholder-text">No photo yet - be first</span>
          </>
        )}
        <div className="hero-fade" />
        <div className="hero-credit" id="parkHeroCredit">
          {park.imgCredit ? `Photo: ${park.imgCredit}` : ''}
        </div>
        {park.verified && (
          <div className="hero-badge" id="parkHeroBadge">
            <CheckIcon />
            {park.sourceName ? `${park.sourceName} verified` : 'OSM verified'}
          </div>
        )}
      </div>

      <div className={`photo-gallery${gallery.length ? ' show' : ''}`} id="photoGallery">
        {gallery.map((src, index) => (
          <button
            className={`photo-thumb${src === activeImage ? ' active' : ''}`}
            key={src}
            type="button"
            title={`Photo ${index + 1}`}
            style={{ backgroundImage: `url("${src}")` }}
            onClick={() => setActiveImage(src)}
          />
        ))}
      </div>

      <div className="panel-header">
        <h2 id="parkName">{park.name}</h2>
        <div className="loc">
          <PinIcon small />
          <span id="parkLoc">{locationText}</span>
        </div>
      </div>

      <div className="equipment-wrap">
        <div className="equipment-label">Equipment available</div>
        <div className="equipment" id="equipment">
          {park.equipment.map(item => <span className="chip" key={item}>{item}</span>)}
        </div>
      </div>

      <div className="external-links" id="externalLinks">
        {park.sourceUrl && (
          <a href={park.sourceUrl} target="_blank" rel="noreferrer">
            <SourceIcon />
            Source
          </a>
        )}
        <a href={gmapsDir} target="_blank" rel="noreferrer">
          <SendIcon small />
          Directions
        </a>
        <a href={gmapsView} target="_blank" rel="noreferrer">
          <GlobeIcon small />
          Street view
        </a>
        <a href={osmUrl} target="_blank" rel="noreferrer">
          <MapIcon />
          Map data
        </a>
      </div>

      <Tabs activeTab={activeTab} onTabChange={onTabChange} />

      <div className="tab-content" id="tabContent">
        {activeTab === 'feed' && (
          <>
            <div className="composer">
              <input
                id="newPostInput"
                placeholder={canInteract ? 'Share a workout, ask a question...' : 'Approval required to post'}
                value={postText}
                onChange={event => setPostText(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') submitPost();
                }}
              />
              <button className="btn-primary btn" id="postBtn" onClick={submitPost}>Post</button>
            </div>
            {park.feed.map((post, index) => <Post post={post} key={`${post.user}-${post.time}-${index}`} />)}
            {park.feed.length === 0 && (
              <EmptyState title="No park posts yet" body="Share the first training note for this spot." />
            )}
          </>
        )}

        {activeTab === 'meetups' && (
          <Meetups
            park={park}
            goingMeetups={goingMeetups}
            onToggle={(index, going) => {
              if (!canInteract) {
                onRestrictedAction();
                return;
              }
              setGoingMeetups(current => ({ ...current, [index]: going }));
              onToggleRsvp(park.id, index, going);
            }}
          />
        )}

        {activeTab === 'challenges' && (
          <>
            {park.challenges.map(challenge => (
              <ChallengeCard
                challenge={challenge}
                key={challenge.name}
              />
            ))}
            {park.challenges.length === 0 && (
              <EmptyState title="No missions yet" body="This spot has no local mission board yet." />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel-empty-state">
      <b>{title}</b>
      <span>{body}</span>
    </div>
  );
}

function Tabs({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const labels: Record<string, string> = {
    feed: 'Feed',
    meetups: 'Sessions',
    challenges: 'Missions'
  };

  return (
    <div className="tabs">
      {['feed', 'meetups', 'challenges'].map(tab => (
        <button className={`tab${activeTab === tab ? ' active' : ''}`} data-tab={tab} key={tab} onClick={() => onTabChange(tab)}>
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}

function Post({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);
  const initials = post.user.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const likes = Math.floor(seeded(post.user.length + post.text.length) * 40 + 3) + (liked ? 1 : 0);
  const comments = Math.floor(seeded(post.user.length * 2 + post.text.length) * 8);

  async function shareParkPost() {
    const text = `${post.user}: ${post.text}`;
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        await nav.share({ title: 'BARMAP park post', text });
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(text);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  }

  return (
    <div className="post">
      <div className="post-head">
        <div className={`avatar-sm c${post.color}`}>{initials}</div>
        <div className="meta"><b>{post.user}</b><br /><span className="time">{post.time}</span></div>
      </div>
      <div className="post-body">{post.text}</div>
      {post.tags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {post.tags.map(tag => <span className="workout-tag" key={tag}>{tag}</span>)}
        </div>
      )}
      <div className="post-foot">
        <button className={`action${liked ? ' active' : ''}`} type="button" onClick={() => setLiked(current => !current)}>
          <HeartIcon /> {likes}
        </button>
        <span className="action"><CommentIcon /> {comments}</span>
        <button className="action" type="button" onClick={shareParkPost}>
          <ShareIcon /> {shared ? 'Copied' : 'Share'}
        </button>
      </div>
    </div>
  );
}

function Meetups({
  park,
  goingMeetups,
  onToggle
}: {
  park: Park;
  goingMeetups: Record<number, boolean>;
  onToggle: (index: number, going: boolean) => void;
}) {
  if (park.meetups.length === 0) {
    return (
      <div className="panel-empty-state">
        <b>No meetups yet</b>
        <span>Community sessions for this park will appear here.</span>
      </div>
    );
  }

  return (
    <>
      {park.meetups.map((meetup, index) => (
        <MeetupCard
          meetup={meetup}
          key={`${meetup.title}-${index}`}
          going={Boolean(goingMeetups[index])}
          onToggle={() => onToggle(index, !goingMeetups[index])}
        />
      ))}
    </>
  );
}

function MeetupCard({ meetup, going, onToggle }: { meetup: Meetup; going: boolean; onToggle: () => void }) {
  return (
    <div className="meetup">
      <div className="date"><div className="m">{meetup.date.m}</div><div className="d">{meetup.date.d}</div></div>
      <div className="info">
        <h4>{meetup.title}</h4>
        <p>Hosted by {meetup.who}</p>
        <div className="rsvp">
          <button className={`rsvp-btn${going ? ' going' : ''}`} onClick={onToggle}>
            {going ? 'Going' : "I'm in"}
          </button>
          <span className="going-count">{meetup.going} going</span>
        </div>
      </div>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <div className="challenge">
      <div className="challenge-head">
        <h4>{challenge.name}</h4>
        <span className="badge">{challenge.unit}</span>
      </div>
      <div className="panel-empty-state">
        <b>No verified results yet</b>
        <span>Submit mission proof from the Missions tab. Approved results will appear on leaderboards.</span>
      </div>
    </div>
  );
}
