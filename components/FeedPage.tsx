'use client';

import PostCard from '@/components/PostCard';
import { getSeededFeedPosts } from '@/data/socialFeed';
import type { Park } from '@/types/park';

export default function FeedPage({ parks }: { parks: Park[] }) {
  const posts = getSeededFeedPosts(parks);

  return (
    <main className="app-main feed-screen">
      <section className="feed-rail" aria-label="BARMAP feed">
        <div className="feed-head">
          <span>Community Feed</span>
          <b>Ireland moving today</b>
        </div>
        {posts.map(post => (
          <PostCard post={post} key={post.id} />
        ))}
      </section>
    </main>
  );
}
