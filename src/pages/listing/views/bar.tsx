/* The listing's bar: reddit's wordmark (home), where you are, and its sorts */

import { Wordmark } from '../../../components/logo';
import { cx } from '../../../components/ui';
import { SORTS, type Sort } from '../types';

const sortPath = (subreddit: string | null, sort: Sort) => `/${subreddit ? `r/${subreddit}/` : ''}${sort}/`;

interface BarProps {
  subreddit: string | null;
  sort: Sort;
}

export function Bar({ subreddit, sort }: BarProps) {
  return (
    <header class="rr-sticky rr-top-0 rr-z-bar rr-grid rr-gap-2 rr-px-4 rr-pt-3 rr-pb-2 rr-bg-neutral-background rr-border-b rr-border-neutral-border-weak">
      <div class="rr-flex rr-items-center rr-gap-3">
        <a
          href="/"
          aria-label="Reddit home"
        >
          <Wordmark />
        </a>
        <h1 class={cx('rr-min-w-0 rr-text-lg rr-font-bold rr-truncate', !subreddit && 'rr-sr-only')}>{subreddit ? `r/${subreddit}` : 'Home'}</h1>
      </div>
      <nav class="rr-flex rr-gap-1">
        {SORTS.map((name) => (
          <a
            key={name}
            class={cx(
              'rr-flex rr-items-center rr-h-8 rr-px-3 rr-rounded-full rr-font-semibold rr-capitalize',
              name === sort ? 'rr-bg-secondary-background-selected' : 'rr-text-neutral-content-weak',
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
