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
  onAddPost: (parkId: number, text: string) => void;
  onSubmitScore: (parkId: number, challengeName: string, score: number) => void;
  onToggleRsvp: (parkId: number, meetupIndex: number, going: boolean) => void;
};

export default function ParkPanel({
  park,
  activeTab,
  onClose,
  onTabChange,
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
        <div className="panel-stats">
          <div className="stat"><div className="v">0</div><div className="l">Members</div></div>
          <div className="stat"><div className="v">0</div><div className="l">Posts</div></div>
          <div className="stat"><div className="v">0.0</div><div className="l">Rating</div></div>
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
  const gmapsDir = `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`;
  const gmapsView = `https://www.google.com/maps/search/?api=1&query=${park.lat},${park.lng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${park.lat}&mlon=${park.lng}#map=19/${park.lat}/${park.lng}`;

  function submitPost() {
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
          <span id="parkLoc">{park.area}</span>
        </div>
      </div>

      <div className="panel-stats">
        <div className="stat"><div className="v" id="statMembers">{park.members}</div><div className="l">Members</div></div>
        <div className="stat"><div className="v" id="statPosts">{park.feed.length}</div><div className="l">Posts</div></div>
        <div className="stat"><div className="v" id="statRating">{park.rating} <span className="unit">★</span></div><div className="l">Rating</div></div>
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
                placeholder="Share a workout, ask a question..."
                value={postText}
                onChange={event => setPostText(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') submitPost();
                }}
              />
              <button className="btn-primary btn" id="postBtn" onClick={submitPost}>Post</button>
            </div>
            {park.feed.map((post, index) => <Post post={post} key={`${post.user}-${post.time}-${index}`} />)}
          </>
        )}

        {activeTab === 'meetups' && (
          <Meetups
            park={park}
            goingMeetups={goingMeetups}
            onToggle={(index, going) => {
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
                onSubmit={() => {
                  const value = window.prompt(`Enter your score for "${challenge.name}":`);
                  if (!value || Number.isNaN(Number.parseFloat(value))) return;
                  onSubmitScore(park.id, challenge.name, Number.parseFloat(value));
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Tabs({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <div className="tabs">
      {['feed', 'meetups', 'challenges'].map(tab => (
        <button className={`tab${activeTab === tab ? ' active' : ''}`} data-tab={tab} key={tab} onClick={() => onTabChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function Post({ post }: { post: FeedPost }) {
  const initials = post.user.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

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
        <span className="action"><HeartIcon /> {Math.floor(seeded(post.user.length + post.text.length) * 40 + 3)}</span>
        <span className="action"><CommentIcon /> {Math.floor(seeded(post.user.length * 2 + post.text.length) * 8)}</span>
        <span className="action"><ShareIcon /> Share</span>
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
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
        No meetups yet.
        <br />
        <br />
        <button className="btn-primary btn" onClick={() => window.alert('Coming soon!')}>+ Host a meetup</button>
      </div>
    );
  }

  return (
    <>
      <button className="btn-primary btn" style={{ marginBottom: 14, width: '100%', justifyContent: 'center' }} onClick={() => window.alert('Coming soon!')}>
        + Host a meetup
      </button>
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

function ChallengeCard({ challenge, onSubmit }: { challenge: Challenge; onSubmit: () => void }) {
  return (
    <div className="challenge">
      <div className="challenge-head">
        <h4>{challenge.name}</h4>
        <span className="badge">{challenge.unit}</span>
      </div>
      <div className="leaderboard">
        {challenge.board.map((row, index) => (
          <div className={`lb-row r${index + 1}`} key={`${row[0]}-${index}`}>
            <div className="lb-rank">{index + 1}</div>
            <div className="lb-name">{row[0]}</div>
            <div className="lb-score">{row[1]}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }} onClick={onSubmit}>
        Submit your score
      </button>
    </div>
  );
}
