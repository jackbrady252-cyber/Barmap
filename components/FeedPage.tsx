'use client';

import PostCard from '@/components/PostCard';
import { getSeededFeedPosts } from '@/data/socialFeed';
import type { Park } from '@/types/park';
import type { SocialPost } from '@/types/social';

type FeedPageProps = {
  parks: Park[];
  posts: SocialPost[];
  savedPostIds: Set<string>;
  onToggleSave: (post: SocialPost, nextSaved: boolean) => Promise<void> | void;
};

export default function FeedPage({ parks, posts, savedPostIds, onToggleSave }: FeedPageProps) {
  const feedPosts = [...posts, ...getSeededFeedPosts(parks)];

  return (
    <main className="app-main feed-screen">
      <section className="feed-rail" aria-label="BARMAP feed">
        <div className="feed-head">
          <span>Community Feed</span>
          <b>Ireland moving today</b>
        </div>
        {feedPosts.map(post => (
          <PostCard post={post} saved={savedPostIds.has(post.id)} onToggleSave={onToggleSave} key={post.id} />
        ))}
      </section>
    </main>
  );
}
