/* A post in a listing: where (a mixed listing: its subreddit; one subreddit's:
   who) and when, and its "…" (Hide, Report), its title, its media (it plays,
   it opens big) or the start of its text, its score, comments and Hide (or
   Unhide). Only its title and its comments open its page: a tap anywhere
   else (its media, its text) doesn't. */

import type { Vote } from '../../../account/contract';
import { Avatar } from '../../../components/avatar';
import { Icon } from '../../../components/icon';
import { Tags } from '../../../components/tags';
import { ui } from '../../../components/ui';
import { Votes } from '../../../components/votes';
import { ago, compact } from '../../../core/text';
import type { Spot } from '../../../overflow/state';
import { MoreButton } from '../../../overflow/views';
import type { Post } from '../contract';
import { MediaView } from './media';

interface PostCardProps {
  post: Post;
  mixed: boolean;  // a listing of more than one subreddit
  hidden: boolean;  // hidden from your listings (as you left it here, else reddit's say)
  onVote: (vote: Vote) => void;
  onHide: (hidden: boolean) => void;
  onMore: (at: Spot) => void;
}

export function PostCard({ post, mixed, hidden, onVote, onHide, onMore }: PostCardProps) {
  return (
    <article
      data-place={post.id}
      class="rr-grid rr-gap-2 rr-px-4 rr-py-3 rr-border-b rr-border-neutral-border-weak">
      <p class="rr-flex rr-items-center rr-gap-1 rr-text-xs rr-text-neutral-content-weak">
        {mixed ? (
          <a
            class="rr-flex rr-items-center rr-gap-2 rr-min-w-0 rr-font-semibold rr-text-neutral-content-strong"
            href={`/r/${post.subreddit}/`}
          >
            <Avatar
              name={post.subreddit}
              icon={post.subredditIcon}
            />
            <span class="rr-truncate">r/{post.subreddit}</span>
          </a>
        ) : (
          <a
            class="rr-min-w-0 rr-truncate rr-font-semibold rr-text-neutral-content-strong"
            href={`/user/${post.author}/`}
          >
            u/{post.author}
          </a>
        )}
        <span class="rr-flex-none">· {ago(post.created)}</span>
        <span class="rr-ml-auto -rr-my-2">
          <MoreButton onOpen={onMore} />
        </span>
      </p>
      <a
        class="rr-text-base lg:rr-text-lg rr-font-semibold"
        href={post.permalink}
      >
        {post.title}
      </a>
      <Tags
        pinned={post.pinned}
        nsfw={post.nsfw}
        spoiler={post.spoiler}
        flair={post.flair}
      />
      {post.media ? <MediaView media={post.media} /> : post.text && (
        <p class="rr-line-clamp-3 rr-text-neutral-content">{post.text}</p>
      )}
      {post.link && (
        <a
          class="rr-text-a-default rr-truncate"
          href={post.link}
        >
          {post.domain}
        </a>
      )}
      <div class="rr-flex rr-gap-2">
        <Votes
          vote={post.vote}
          score={post.score}
          pill
          onVote={onVote}
        />
        <a
          class={ui.action}
          href={post.permalink}
        >
          <Icon name="comments" />
          {compact(post.comments)}
        </a>
        <button
          type="button"
          class={ui.action}
          onClick={() => onHide(!hidden)}
        >
          <Icon name={hidden ? 'show' : 'hide'} />
          {hidden ? 'Unhide' : 'Hide'}
        </button>
      </div>
    </article>
  );
}
