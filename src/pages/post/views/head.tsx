/* The post, as reddit.com shows it on its page: where, when and who (its
   subreddit's icon; Join, "…"), its title and tags, all of it (text, pictures,
   video, link), then its votes, comments and Share */

import { useState } from 'preact/hooks';
import type { Vote } from '../../../account/contract';
import { Avatar } from '../../../components/avatar';
import { Icon } from '../../../components/icon';
import { JoinButton } from '../../../components/join';
import { Markdown } from '../../../components/markdown';
import { Tags } from '../../../components/tags';
import { ui } from '../../../components/ui';
import { Votes } from '../../../components/votes';
import type { Load } from '../../../core/store';
import { ago, compact } from '../../../core/text';
import type { About } from '../../listing/contract';
import { MediaView } from '../../listing/views/media';
import type { Spot } from '../../../overflow/state';
import { MoreButton } from '../../../overflow/views';
import type { FullPost } from '../contract';

interface PostHeadProps {
  post: FullPost;
  about: Load<About> | null;
  onVote: (vote: Vote) => void;
  onJoin: (join: boolean) => void;
  onMore: (at: Spot) => void;
}

export function PostHead({ post, about, onVote, onJoin, onMore }: PostHeadProps) {
  return (
    <article
      data-place={post.id}
      class="rr-grid rr-gap-3 rr-px-4 rr-pt-3 rr-pb-2"
    >
      <div class="rr-flex rr-items-center rr-gap-2">
        <a
          class="rr-flex-none"
          href={`/r/${post.subreddit}/`}
        >
          <Avatar
            name={post.subreddit}
            icon={post.subredditIcon}
            size="md"
          />
        </a>
        <div class="rr-grid rr-min-w-0 rr-text-xs rr-text-neutral-content-weak">
          <p class="rr-flex rr-gap-1">
            <a
              class="rr-truncate rr-font-semibold rr-text-neutral-content-strong"
              href={`/r/${post.subreddit}/`}
            >
              r/{post.subreddit}
            </a>
            <span class="rr-flex-none">· {ago(post.created)}</span>
          </p>
          <a
            class="rr-truncate"
            href={`/user/${post.author}/`}
          >
            u/{post.author}
          </a>
        </div>
        <span class="rr-flex rr-items-center rr-gap-1 rr-ml-auto">
          {about?.status === 'loaded' && (
            <JoinButton
              joined={about.data.joined}
              onJoin={onJoin}
            />
          )}
          <MoreButton onOpen={onMore} />
        </span>
      </div>
      <h1 class="rr-text-xl rr-font-bold rr-break-words">{post.title}</h1>
      <Tags
        pinned={post.pinned}
        nsfw={post.nsfw}
        spoiler={post.spoiler}
        flair={post.flair}
      />
      {post.media && <MediaView media={post.media} />}
      {post.html && <Markdown html={post.html} />}
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
          href="#comments"
        >
          <Icon name="comments" />
          {compact(post.comments)}
        </a>
        <Share
          title={post.title}
          url={`https://www.reddit.com${post.permalink}`}
        />
      </div>
    </article>
  );
}

// Share: the phone's own share sheet (else the address, copied)
function Share({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const share = () => {
    if (navigator.share) {
      navigator.share({ title, url }).catch((error: unknown) => {
        if ((error as Error).name !== 'AbortError') console.error(error);  // AbortError: you closed the sheet
      });
    } else {
      navigator.clipboard.writeText(url).then(() => setCopied(true), (error: unknown) => console.error(error));
    }
  };
  return (
    <button
      type="button"
      class={ui.action}
      onClick={share}
    >
      <Icon name="share" />
      {copied ? 'Copied' : 'Share'}
    </button>
  );
}
