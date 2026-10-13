/* A post in a listing: where (a mixed listing: its subreddit; one subreddit's:
   who) and when, and its "…" (Hide, Report), its title, its media (it plays,
   it opens big) or the start of its text, its score and comments. Its title,
   its comments, or a tap on the rest: its page. */

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
  onVote: (vote: Vote) => void;
  onMore: (at: Spot) => void;
}

export function PostCard({ post, mixed, onVote, onMore }: PostCardProps) {
  return (
    // A tap on it, but not on something of its own (a link, a button, a video): the post. (Keys: its title.)
    <article
      class="rr-grid rr-gap-2 rr-px-4 rr-py-3 rr-border-b rr-border-neutral-border-weak"
      onClick={(event) => {
        if (!(event.target as Element).closest('a, button, video')) location.assign(post.permalink);
      }}
    >
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
        class="rr-text-base rr-font-semibold"
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
      </div>
    </article>
  );
}
