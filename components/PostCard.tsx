'use client';

import { useState } from 'react';
import { BookmarkIcon, CloseIcon, CommentIcon, HeartIcon, PlayIcon, ShareIcon } from '@/components/icons';
import LocationTag from '@/components/LocationTag';
import UserAvatar from '@/components/UserAvatar';
import type { SocialPost } from '@/types/social';

type PostCardProps = {
  post: SocialPost;
};

export default function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(post.saved);
  const [commentOpen, setCommentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const likes = post.likes + (liked ? 1 : 0);
  const comments = post.comments;
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
          <button type="button" aria-label="View comments" onClick={() => setCommentOpen(true)}>
            <CommentIcon />
            <span>{comments}</span>
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
          <button type="button" aria-label="Share post" onClick={() => setShareOpen(true)}>
            <ShareIcon />
            <span>Share</span>
          </button>
        </div>

        <div className="post-community">
          <span>{likes} likes</span>
          <span>{comments} comments</span>
          {post.commentPreview && <b>{post.commentPreview}</b>}
        </div>
      </div>

      {commentOpen && (
        <div className="sheet-backdrop" onClick={() => setCommentOpen(false)}>
          <section className="action-sheet" role="dialog" aria-modal="true" aria-label="Comments" onClick={event => event.stopPropagation()}>
            <button className="sheet-close" type="button" onClick={() => setCommentOpen(false)} aria-label="Close comments">
              <CloseIcon />
            </button>
            <span className="sheet-kicker">Comments</span>
            <h3>{comments} notes from the crew</h3>
            {post.commentPreview ? (
              <div className="comment-preview">
                <UserAvatar user={post.user} size="sm" />
                <p>{post.commentPreview}</p>
              </div>
            ) : (
              <div className="premium-empty compact">
                <b>No comments yet</b>
                <span>Be first to add signal to this session.</span>
              </div>
            )}
            <div className="comment-composer">
              <input type="text" placeholder="Add a comment..." aria-label="Add a comment" />
              <button className="btn btn-primary" type="button">Send</button>
            </div>
          </section>
        </div>
      )}

      {shareOpen && (
        <div className="sheet-backdrop" onClick={() => setShareOpen(false)}>
          <section className="action-sheet" role="dialog" aria-modal="true" aria-label="Share post" onClick={event => event.stopPropagation()}>
            <button className="sheet-close" type="button" onClick={() => setShareOpen(false)} aria-label="Close share sheet">
              <CloseIcon />
            </button>
            <span className="sheet-kicker">Share</span>
            <h3>Send this session</h3>
            <div className="share-grid">
              <button type="button">Copy Link</button>
              <button type="button">Share Profile</button>
              <button type="button">Open Spot</button>
            </div>
            <p className="sheet-note">Sharing is a frontend placeholder until social delivery is connected.</p>
          </section>
        </div>
      )}
    </article>
  );
}
