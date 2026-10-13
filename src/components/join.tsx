/* Join, or Joined (tap to leave), as reddit.com's: a black pill to join,
   an outlined one once you have */

import { cx } from './ui';

export function JoinButton({ joined, onJoin }: { joined: boolean; onJoin: (join: boolean) => void }) {
  return (
    <button
      type="button"
      class={cx('rr-flex-none rr-h-8 rr-px-4 rr-rounded-full rr-font-semibold', joined ? 'rr-border rr-border-neutral-border-medium' : 'rr-bg-primary-background rr-text-primary-onBackground')}
      aria-pressed={joined}
      onClick={() => onJoin(!joined)}
    >
      {joined ? 'Joined' : 'Join'}
    </button>
  );
}
