/* reddit's markdown, cleaned (core/html.ts), in a grid (its blocks spaced);
   a tap on a spoiler shows it */

import { cx } from './ui';

const HIDDEN = ['rr-bg-neutral-content-strong', 'rr-text-transparent'];

export function Markdown({ html, class: className }: { html: string; class?: string }) {
  return (
    <div
      class={cx('rr-grid rr-gap-2 rr-break-words', className)}
      onClick={reveal}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function reveal(event: MouseEvent) {
  const spoiler = (event.target as Element).closest('[data-spoiler]');
  if (!spoiler?.classList.contains('rr-text-transparent')) return;
  spoiler.classList.remove(...HIDDEN);
  event.preventDefault();  // a spoiler inside a link: shown, not followed
}
