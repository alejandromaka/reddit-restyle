/* A search's results, under the bar: its words, and where it looked (all of
   reddit, or a subreddit only), with the other one a tap away, its sort and
   span kept. Then its posts, as any listing's. */

import { searchable, searchUrl } from '../../../nav/search';
import type { Time } from '../types';

interface SearchedProps {
  query: string;
  subreddit: string | null;  // where it was asked from
  restricted: boolean;       // in it only
  sort: string;
  time: Time | null;
}

export function SearchHeading({ query, subreddit, restricted, sort, time }: SearchedProps) {
  const rest = { sort, ...(time ? { t: time } : {}) };
  const link = 'rr-font-semibold rr-text-a-default';
  return (
    <header class="rr-grid rr-gap-1 rr-px-4 rr-pt-4 rr-pb-2">
      <h1 class="rr-text-xl rr-font-bold rr-break-words">{query ? `“${query}”` : 'Search'}</h1>
      <p class="rr-text-xs rr-text-neutral-content-weak">
        {restricted && subreddit ? (
          <>
            {`In r/${subreddit} · `}
            <a class={link} href={searchUrl(query, null, rest)}>Search all of reddit</a>
          </>
        ) : (
          <>
            In all of reddit
            {searchable(subreddit) && (
              <>
                {' · '}
                <a class={link} href={searchUrl(query, subreddit, rest)}>{`Search only r/${subreddit}`}</a>
              </>
            )}
          </>
        )}
      </p>
    </header>
  );
}
