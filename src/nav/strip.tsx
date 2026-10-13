/* The strip at the very top, as old reddit has it: Home, Popular, All, then
   your communities, side by side (swipe for more). It scrolls away with the
   page; the bar under it stays. */

import { cx } from '../components/ui';
import type { Load } from '../core/store';
import type { Community } from './contract';
import { isHere, REDDITS } from './reddits';

interface StripProps {
  current: string | null;            // the subreddit on screen; null: home
  communities: Load<Community[]>;
}

export function Strip({ current, communities }: StripProps) {
  const link = (here: boolean) => cx('rr-flex rr-items-center rr-flex-none', here ? 'rr-text-neutral-content-strong' : 'rr-text-neutral-content-weak');
  return (
    <nav
      class="rr-flex rr-gap-4 rr-h-8 rr-px-4 rr-overflow-x-auto rr-bg-neutral-background-weak rr-text-xs rr-font-semibold"
      aria-label="Reddits"
    >
      {REDDITS.map((reddit) => (
        <a
          key={reddit.path}
          class={link(isHere(reddit.name, current))}
          href={reddit.path}
          aria-current={isHere(reddit.name, current) ? 'page' : undefined}
        >
          {reddit.label}
        </a>
      ))}
      {communities.status === 'loaded' && communities.data.length > 0 && (
        <span class="rr-flex-none rr-self-center rr-h-4 rr-border-l rr-border-neutral-border-weak" />
      )}
      {communities.status === 'loaded' && communities.data.map((community) => (
        <a
          key={community.path}
          class={link(isHere(community.name, current))}
          href={community.path}
          aria-current={isHere(community.name, current) ? 'page' : undefined}
        >
          {community.label.replace(/^r\//, '')}
        </a>
      ))}
    </nav>
  );
}
