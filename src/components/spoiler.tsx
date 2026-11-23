/* A spoiler post's media or text, as reddit.com's: blurred, with "View
   spoiler" over it; a tap shows it (only here: the post's page, or the feed
   again, starts hidden). Hidden, nothing in it can be tapped or played. */

import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Icon } from './icon';
import { cx, ui } from './ui';

interface SpoilerProps {
  hidden: boolean;  // a spoiler post
  kind: 'media' | 'text';  // how hard to blur it (a picture's shapes show through less)
  children: ComponentChildren;
}

export function Spoiler({ hidden, kind, children }: SpoilerProps) {
  const [shown, setShown] = useState(false);
  if (!hidden || shown) return <>{children}</>;
  return (
    <div class={cx('rr-relative rr-overflow-hidden', kind === 'media' && 'rr-rounded-media')}>
      <div
        class={cx('rr-pointer-events-none rr-select-none', kind === 'media' ? 'rr-blur-2xl rr-scale-110' : 'rr-blur')}
        aria-hidden="true"
        inert
      >
        {children}
      </div>
      <button
        type="button"
        class="rr-absolute rr-inset-0 rr-grid rr-place-items-center rr-w-full active:rr-opacity-100"
        onClick={() => setShown(true)}
      >
        <span class={cx(ui.pill, 'rr-gap-1 rr-px-3 rr-bg-media-background rr-text-media-onBackground')}>
          <Icon name="show" />
          View spoiler
        </span>
      </button>
    </div>
  );
}
