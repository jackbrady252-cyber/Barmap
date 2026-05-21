'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookmarkIcon, CloseIcon, CommentIcon, HeartIcon, PlayIcon, ShareIcon } from '@/components/icons';
import LocationTag from '@/components/LocationTag';
import UserAvatar from '@/components/UserAvatar';
import type { SocialPost } from '@/types/social';

type PostCardProps = {
  post: SocialPost;
  saved?: boolean;
  onToggleSave?: (post: SocialPost, nextSaved: boolean) => Promise<void> | void;
};

export default function PostCard({ post, saved: savedProp, onToggleSave }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(savedProp ?? post.saved);
  const [saving, setSaving] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');

  const likes = post.likes + (liked ? 1 : 0);
  const comments = post.comments + localComments.length;
  const commentsKey = useMemo(() => `barmap:post:${post.id}:comments`, [post.id]);
  const backgroundImage = post.mediaUrl
    ? `url("${post.mediaUrl}")`
    : post.park?.img
      ? `url("${post.park.img}")`
      : undefined;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedComments = JSON.parse(window.localStorage.getItem(commentsKey) || '[]');
      if (Array.isArray(storedComments)) setLocalComments(storedComments.filter(item => typeof item === 'string'));
    } catch {
      setLocalComments([]);
    }
  }, [commentsKey]);

  useEffect(() => {
    setSaved(savedProp ?? post.saved);
  }, [post.saved, savedProp]);

  async function toggleSaved() {
    if (saving) return;

    const next = !saved;
    setSaved(next);
    setSaving(true);
    setFeedback(next ? 'Saving...' : 'Removing...');

    try {
      await onToggleSave?.(post, next);
      setFeedback(next ? 'Saved.' : 'Removed.');
    } catch (err) {
      setSaved(!next);
      setFeedback(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
      window.setTimeout(() => setFeedback(''), 2200);
    }
  }

  function submitComment() {
    const text = commentText.trim();
    if (!text) return;

    setLocalComments(current => {
      const next = [text, ...current];
      if (typeof window !== 'undefined') window.localStorage.setItem(commentsKey, JSON.stringify(next));
      return next;
    });
    setCommentText('');
  }

  async function sharePost() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?post=${post.id}` : '';
    const title = `BARMAP post by ${post.user.name}`;
    const text = post.caption;

    try {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        await nav.share({ title, text, url });
        setFeedback('Shared.');
      } else if (nav?.clipboard && url) {
        await nav.clipboard.writeText(url);
        setFeedback('Link copied.');
      } else {
        setFeedback('Share link unavailable in this browser.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFeedback('Could not share this post.');
    }

    window.setTimeout(() => setFeedback(''), 2200);
  }

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
            onClick={toggleSaved}
            disabled={saving}
          >
            <BookmarkIcon />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
          <button type="button" aria-label="Share post" onClick={sharePost}>
            <ShareIcon />
            <span>Share</span>
          </button>
        </div>

        {feedback && <div className="post-feedback">{feedback}</div>}

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
            ) : localComments.length === 0 ? (
              <div className="premium-empty compact">
                <b>No comments yet</b>
                <span>Be first to add signal to this session.</span>
              </div>
            ) : (
              null
            )}
            {localComments.map((comment, index) => (
              <div className="comment-preview" key={`${post.id}-comment-${index}`}>
                <UserAvatar user={post.user} size="sm" />
                <p>{comment}</p>
              </div>
            ))}
            <div className="comment-composer" onClick={event => event.stopPropagation()}>
              <input
                type="text"
                placeholder="Add a comment..."
                aria-label="Add a comment"
                value={commentText}
                onChange={event => setCommentText(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') submitComment();
                }}
              />
              <button
                className="btn btn-primary"
                type="button"
                disabled={!commentText.trim()}
                onMouseDown={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={event => {
                  event.stopPropagation();
                  submitComment();
                }}
              >
                Send
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
