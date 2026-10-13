/* A post's tags, as reddit's: Pinned, NSFW, Spoiler, its flair */

import { cx, ui } from './ui';

interface TagsProps {
  pinned: boolean;
  nsfw: boolean;
  spoiler: boolean;
  flair: string | null;
}

export function Tags({ pinned, nsfw, spoiler, flair }: TagsProps) {
  if (!pinned && !nsfw && !spoiler && flair === null) return null;
  return (
    <p class="rr-flex rr-flex-wrap rr-gap-1">
      {pinned && <span class={cx(ui.tag, 'rr-bg-tags-moderator-background rr-text-tags-moderator-content')}>Pinned</span>}
      {nsfw && <span class={cx(ui.tag, 'rr-bg-tags-nsfw-background rr-text-tags-nsfw-content')}>NSFW</span>}
      {spoiler && <span class={cx(ui.tag, 'rr-bg-tags-neutral-background')}>Spoiler</span>}
      {flair && <span class={cx(ui.tag, 'rr-bg-tags-neutral-background rr-text-tags-neutral-content')}>{flair}</span>}
    </p>
  );
}
