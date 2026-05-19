'use client';

import { useState } from 'react';
import { BookmarkIcon, CommentIcon, HeartIcon, PlayIcon, ShareIcon } from '@/components/icons';
import LocationTag from '@/components/LocationTag';
import UserAvatar from '@/components/UserAvatar';
import type { SocialPost } from '@/types/social';

type PostCardProps = {
  post: SocialPost;
};

export default function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(post.saved);

  const likes = post.likes + (liked ? 1 : 0);
  const backgroundImage = post.mediaUrl
    ? `url("${post.mediaUrl}")`
    : post.park?.img
      ? `url("${post.park.img}")`
      : undefined;

  return (
    <article className="social-post">
      <header className="social-post__header">
        <UserAvatar user={post.user} />
        <div>
          <b>{post.user.name}</b>
          <span>{post.user.handle} · {post.time}</span>
        </div>
      </header>

      <div className={`social-post__media social-post__media--${post.mediaType}`} style={{ backgroundImage }}>
        <div className="media-type">
          {post.mediaType === 'video' && <PlayIcon />}
          <span>{post.mediaType}</span>
        </div>
      </div>

      <div className="social-post__body">
        <div className="post-context">
          {post.park && <LocationTag park={post.park} compact />}
          {post.challenge && <span className="challenge-tag">{post.challenge}</span>}
          {post.distance && <span className="user-tag">{post.distance}</span>}
        </div>

        <p>{post.caption}</p>

        <div className="tag-row">
          {post.tags.map(tag => (
            <span className="user-tag" key={tag}>#{tag}</span>
          ))}
        </div>

        <div className="post-actions-row">
          <button
            className={liked ? 'active' : ''}
            type="button"
            aria-label={liked ? 'Unlike post' : 'Like post'}
            onClick={() => setLiked(current => !current)}
          >
            <HeartIcon />
            <span>{likes}</span>
          </button>
          <button type="button" aria-label="View comments">
            <CommentIcon />
            <span>{post.comments}</span>
          </button>
          <button
            className={saved ? 'active' : ''}
            type="button"
            aria-label={saved ? 'Remove saved post' : 'Save post'}
            onClick={() => setSaved(current => !current)}
          >
            <BookmarkIcon />
            <span>Save</span>
          </button>
          <button type="button" aria-label="Share post">
            <ShareIcon />
            <span>Share</span>
          </button>
        </div>

        <div className="post-community">
          <span>{likes} likes</span>
          <span>{post.comments} comments</span>
          {post.commentPreview && <b>{post.commentPreview}</b>}
        </div>
      </div>
    </article>
  );
}
