/* Search, in the bar, as reddit.com's: a field (on a phone, 🔍 opens it over
   the bar, with Cancel; wider, it's always there). In a subreddit it starts
   in it (its name, a chip in the field: × or ⌫ on the empty field takes it
   out, and the search is all of reddit's). Enter goes to the results, a
   listing of posts (/search/?q=…, /r/name/search/?q=…&restrict_sr=on). */

import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/icon';
import { cx } from '../components/ui';

// Whether a search can be in this subreddit only: one (or several, r/pics+funny), not reddit's own or a person's
export const searchable = (subreddit: string | null): subreddit is string =>
  subreddit !== null && !/^(popular|all|u_.*)$/i.test(subreddit);

// A search's address: its words, all of reddit or a subreddit's only, and anything else kept (its sort, its span)
export function searchUrl(query: string, within: string | null, rest: Record<string, string> = {}) {
  const params = new URLSearchParams({ q: query, ...rest });
  if (!within) return `/search/?${params}`;
  params.set('restrict_sr', 'on');
  return `/r/${within}/search/?${params}`;
}

export interface Searched {
  query: string;
  restricted: boolean;  // in the subreddit only
}

interface SearchProps {
  current: string | null;   // the subreddit on screen
  searched: Searched | null;  // the results on screen: their words
  open: boolean;             // a phone's: over the bar
  onOpen: () => void;
  onClose: () => void;
}

export function Search({ current, searched, open, onOpen, onClose }: SearchProps) {
  const start = searchable(current) && (searched ? searched.restricted : true) ? current : null;
  const [within, setWithin] = useState(start);
  const [query, setQuery] = useState(searched?.query ?? '');
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => setWithin(start), [start]);
  const cancel = () => {
    setWithin(start);
    setQuery(searched?.query ?? '');
    field.current?.blur();
    onClose();
  };
  return (
    <>
      <button
        type="button"
        class="rr-grid rr-place-items-center rr-flex-none rr-w-8 rr-h-8 rr-rounded-full rr-ml-auto sm:rr-hidden"
        aria-label="Search"
        aria-expanded={open}
        onClick={() => {
          onOpen();
          field.current?.focus();  // in the tap itself, so iOS brings up the keyboard (the field is there, unseen)
        }}
      >
        <Icon name="search" large />
      </button>
      <form
        role="search"
        class={cx(
          'rr-absolute rr-inset-0 rr-z-bar rr-flex rr-items-center rr-gap-3 rr-px-4 rr-bg-neutral-background',
          'sm:rr-static sm:rr-flex-1 sm:rr-max-w-[36rem] sm:rr-mx-auto sm:rr-px-4 sm:rr-opacity-100 sm:rr-pointer-events-auto',
          !open && 'rr-opacity-0 rr-pointer-events-none',
        )}
        action={within ? `/r/${within}/search/` : '/search/'}
        onSubmit={(event) => {
          event.preventDefault();
          const words = query.trim();
          if (!words) return;
          field.current?.blur();
          location.assign(searchUrl(words, within));
        }}
      >
        <label class="rr-flex rr-flex-1 rr-items-center rr-gap-2 rr-min-w-0 rr-h-10 rr-px-3 rr-rounded-full rr-bg-secondary-background rr-text-neutral-content-weak">
          <Icon name="search" />
          {within && (
            <span class="rr-flex rr-flex-none rr-items-center rr-gap-1 rr-h-6 rr-pl-3 rr-rounded-full rr-bg-neutral-background rr-text-xs rr-font-semibold rr-text-neutral-content-strong">
              <span class="rr-max-w-[8rem] rr-truncate">r/{within}</span>
              <button
                type="button"
                class="rr-grid rr-flex-none rr-place-items-center rr-w-6 rr-h-6 rr-rounded-full"
                aria-label={`Search all of reddit, not only r/${within}`}
                onClick={() => {
                  setWithin(null);
                  field.current?.focus();
                }}
              >
                <Icon name="close" />
              </button>
            </span>
          )}
          <input
            ref={field}
            name="q"
            class="rr-flex-1 rr-min-w-0 rr-text-base rr-text-neutral-content-strong rr-outline-none"
            type="search"
            placeholder={within ? `Search in r/${within}` : 'Search Reddit'}
            aria-label={within ? `Search in r/${within}` : 'Search Reddit'}
            autocapitalize="off"
            autocomplete="off"
            enterKeyHint="search"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && within && !event.currentTarget.value) setWithin(null);
              if (event.key === 'Escape') cancel();
            }}
          />
          {query && (
            <button
              type="button"
              class="rr-grid rr-flex-none rr-place-items-center rr-w-6 rr-h-6 rr-rounded-full"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                field.current?.focus();
              }}
            >
              <Icon name="close" />
            </button>
          )}
        </label>
        <button
          type="button"
          class="rr-flex-none rr-text-xs rr-font-semibold sm:rr-hidden"
          onClick={cancel}
        >
          Cancel
        </button>
      </form>
    </>
  );
}
