/* A post in a listing: where and when, its title, its preview, its score and comments */

import { Icon } from '../../../components/icon';
import { cx, ui } from '../../../components/ui';
import { ago, compact } from '../../../core/text';
import type { Post } from '../contract';

export function PostCard({ post }: { post: Post }) {
  const tagged = post.pinned || post.nsfw || post.spoiler || post.flair !== null;
  return (
    <article class="rr-grid rr-gap-2 rr-px-4 rr-py-3 rr-border-b rr-border-neutral-border-weak">
      <p class="rr-flex rr-flex-wrap rr-gap-x-1 rr-text-xs rr-text-neutral-content-weak">
        <a
          class="rr-font-semibold rr-text-neutral-content-strong"
          href={`/r/${post.subreddit}/`}
        >
          r/{post.subreddit}
        </a>
        <span>· {ago(post.created)} · u/{post.author}</span>
      </p>
      <a
        class="rr-text-lg rr-font-semibold"
        href={post.permalink}
      >
        {post.title}
      </a>
      {tagged && (
        <p class="rr-flex rr-flex-wrap rr-gap-1">
          {post.pinned && <span class={cx(ui.tag, 'rr-bg-tags-moderator-background rr-text-tags-moderator-content')}>Pinned</span>}
          {post.nsfw && <span class={cx(ui.tag, 'rr-bg-tags-nsfw-background rr-text-tags-nsfw-content')}>NSFW</span>}
          {post.spoiler && <span class={cx(ui.tag, 'rr-bg-tags-neutral-background')}>Spoiler</span>}
          {post.flair && <span class={cx(ui.tag, 'rr-bg-tags-neutral-background rr-text-tags-neutral-content')}>{post.flair}</span>}
        </p>
      )}
      {post.image ? (
        <a
          class="rr-relative rr-block"
          href={post.permalink}
        >
          <img
            class="rr-block rr-w-full rr-h-auto rr-rounded-media"
            src={post.image.url}
            width={post.image.width}
            height={post.image.height}
            loading="lazy"
            decoding="async"
            alt=""
          />
          {post.video && <span class={ui.badge}><Icon name="play" /><span class="rr-sr-only">Video</span></span>}
          {post.gallery > 1 && <span class={ui.badge}>1/{post.gallery}</span>}
        </a>
      ) : post.text && (
        <a
          class="rr-line-clamp-3 rr-text-neutral-content"
          href={post.permalink}
        >
          {post.text}
        </a>
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
        <span class={ui.action}>
          <Icon name="up" />
          {compact(post.score)}
          <Icon name="down" />
        </span>
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
