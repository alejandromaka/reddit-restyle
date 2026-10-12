/* The listing's bar: where you are, and its sorts */

import { cx } from '../../../components/ui';
import { SORTS, type Sort } from '../types';

const sortPath = (subreddit: string | null, sort: Sort) => `/${subreddit ? `r/${subreddit}/` : ''}${sort}/`;

interface BarProps {
  subreddit: string | null;
  sort: Sort;
}

export function Bar({ subreddit, sort }: BarProps) {
  return (
    <header class="rr-sticky rr-top-0 rr-z-bar rr-grid rr-gap-2 rr-px-4 rr-pt-3 rr-pb-2 rr-bg-surface rr-border-b rr-border-line">
      <h1 class="rr-text-xl rr-font-bold rr-truncate">{subreddit ? `r/${subreddit}` : 'Home'}</h1>
      <nav class="rr-flex rr-gap-1">
        {SORTS.map((name) => (
          <a
            key={name}
            class={cx(
              'rr-px-3 rr-py-1 rr-rounded-full rr-text-sm rr-font-bold rr-capitalize',
              name === sort ? 'rr-bg-brand-tint rr-text-brand' : 'rr-text-ink-2',
            )}
            href={sortPath(subreddit, name)}
            aria-current={name === sort ? 'page' : undefined}
          >
            {name}
          </a>
        ))}
      </nav>
    </header>
  );
}
