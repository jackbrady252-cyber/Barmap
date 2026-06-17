'use client';

import { useState } from 'react';
import PostCard from '@/components/PostCard';
import { getSeededFeedPosts } from '@/data/socialFeed';
import type { Park } from '@/types/park';
import type { SocialPost } from '@/types/social';

type FeedPageProps = {
  parks: Park[];
  posts: SocialPost[];
  savedPostIds: Set<string>;
  canInteract: boolean;
  followingUserIds: Set<string>;
  onRestrictedAction: () => void;
  onToggleSave: (post: SocialPost, nextSaved: boolean) => Promise<void> | void;
};

export default function FeedPage({ parks, posts, savedPostIds, canInteract, followingUserIds, onRestrictedAction, onToggleSave }: FeedPageProps) {
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const feedPosts = [...posts, ...getSeededFeedPosts(parks)];
  const visiblePosts = feedFilter === 'following'
    ? posts.filter(post => post.createdBy && followingUserIds.has(post.createdBy))
    : feedPosts;

  return (
    <main className="app-main feed-screen">
      <section className="feed-rail" aria-label="BARMAP feed">
        <div className="feed-head">
          <span>Community Feed</span>
          <b>Ireland moving today</b>
        </div>
        <div className="feed-filter" aria-label="Feed filter">
          <button className={feedFilter === 'all' ? 'active' : ''} type="button" onClick={() => setFeedFilter('all')}>All</button>
          <button className={feedFilter === 'following' ? 'active' : ''} type="button" onClick={() => setFeedFilter('following')}>Following</button>
        </div>
        {visiblePosts.length > 0 ? (
          visiblePosts.map(post => (
            <PostCard
              post={post}
              saved={savedPostIds.has(post.id)}
              canInteract={canInteract}
              onRestrictedAction={onRestrictedAction}
              onToggleSave={onToggleSave}
              key={post.id}
            />
          ))
        ) : (
          <div className="premium-empty compact">
            <b>No following posts yet</b>
            <span>Follow approved users to build this feed.</span>
          </div>
        )}
      </section>
    </main>
  );
}
