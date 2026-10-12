/* A post in a listing: where and when, its title, its preview, its score and comments */

import { Icon } from '../../../components/icon';
import { cx, ui } from '../../../components/ui';
import { ago, compact } from '../../../core/text';
import type { Post } from '../contract';

export function PostCard({ post }: { post: Post }) {
  const tagged = post.pinned || post.nsfw || post.spoiler || post.flair !== null;
  return (
    <article class="rr-grid rr-gap-2 rr-p-4 rr-bg-surface">
      <p class="rr-flex rr-flex-wrap rr-gap-x-1 rr-text-xs rr-text-ink-2">
        <a
          class="rr-font-bold rr-text-ink"
          href={`/r/${post.subreddit}/`}
        >
          r/{post.subreddit}
        </a>
        <span>· {ago(post.created)} · u/{post.author}</span>
      </p>
      <a
        class="rr-text-lg rr-font-semibold rr-leading-snug rr-text-ink"
        href={post.permalink}
      >
        {post.title}
      </a>
      {tagged && (
        <p class="rr-flex rr-flex-wrap rr-gap-1">
          {post.pinned && <span class={cx(ui.tag, 'rr-bg-pinned rr-text-white')}>Pinned</span>}
          {post.nsfw && <span class={cx(ui.tag, 'rr-bg-nsfw rr-text-white')}>NSFW</span>}
          {post.spoiler && <span class={cx(ui.tag, 'rr-bg-ink-2 rr-text-white')}>Spoiler</span>}
          {post.flair && <span class={cx(ui.tag, 'rr-bg-track rr-text-ink-2')}>{post.flair}</span>}
        </p>
      )}
      {post.image ? (
        <a href={post.permalink}>
          <img
            class="rr-block rr-w-full rr-h-auto rr-rounded-inset rr-bg-track"
            src={post.image.url}
            width={post.image.width}
            height={post.image.height}
            loading="lazy"
            decoding="async"
            alt=""
          />
        </a>
      ) : post.link && (
        <a
          class="rr-text-sm rr-text-link rr-truncate"
          href={post.link}
        >
          {post.domain}
        </a>
      )}
      <div class="rr-flex rr-items-center rr-gap-4 rr-text-sm rr-font-bold rr-text-ink-2">
        <span class="rr-flex rr-items-center rr-gap-1">
          <Icon name="up" />
          {compact(post.score)}
          <Icon name="down" />
        </span>
        <a
          class="rr-flex rr-items-center rr-gap-1 rr-text-ink-2"
          href={post.permalink}
        >
          <Icon name="comments" />
          {compact(post.comments)}
        </a>
      </div>
    </article>
  );
}
