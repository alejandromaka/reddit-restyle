/* A listing's sorts, as reddit.com's: a dropdown of them (Best on the front
   page, then Hot, New, Top, Rising; a search's: Relevance, Hot, Top, New,
   Comments), and with Top a second, its span (Now … All time; a search's,
   with any sort); then anything else the listing has there (r/all: its
   filters). A line under them. */

import type { ComponentChildren } from 'preact';

import { Picker } from '../../../components/picker';
import { SEARCH_SORTS, SORTS, TIMES, type Kind, type Sort, type Time } from '../types';

const sortPath = (subreddit: string | null, sort: Sort) => `/${subreddit ? `r/${subreddit}/` : ''}${sort}/`;
const SORT_LABELS: Record<Sort, string> = {
  best: 'Best', hot: 'Hot', new: 'New', top: 'Top', rising: 'Rising', controversial: 'Controversial', relevance: 'Relevance', comments: 'Comments',
};
const TIME_LABELS: Record<Time, string> = { hour: 'Now', day: 'Today', week: 'This week', month: 'This month', year: 'This year', all: 'All time' };

// A search's address by sort and span: its own (its words, where), the sort and span changed, from its first page
function searchPath(path: string, search: string, sort: Sort, time: Time | null) {
  const query = new URLSearchParams(search);
  for (const name of ['count', 'after', 'before']) query.delete(name);
  query.set('sort', sort);
  if (time) query.set('t', time);
  return `${path}?${query}`;
}

interface SortsProps {
  subreddit: string | null;
  kind: Kind;
  sort: Sort;
  time: Time | null;
  path?: string;    // a search's: its address (path, query)
  search?: string;
  children?: ComponentChildren;
}

export function Sorts({ subreddit, kind, sort, time, path = '', search = '', children }: SortsProps) {
  const searching = kind === 'search';
  const offered: readonly Sort[] = searching ? SEARCH_SORTS : kind === 'home' ? ['best', ...SORTS] : SORTS;
  const sorts = offered.includes(sort) ? offered : [sort, ...offered];  // one the address names that we don't offer
  const sorted = (name: Sort) => (searching ? searchPath(path, search, name, time) : sortPath(subreddit, name));
  const spanPath = (span: Time) => (searching ? searchPath(path, search, sort, span) : `${sortPath(subreddit, sort)}?t=${span}`);
  return (
    <div class="rr-flex rr-items-center rr-gap-5 rr-h-12 rr-px-4 rr-border-b rr-border-neutral-border-weak">
      <Picker
        label="Sort"
        chosen={SORT_LABELS[sort]}
        value={sorted(sort)}
        options={sorts.map((name) => [sorted(name), SORT_LABELS[name]])}
      />
      {time && (
        <Picker
          label="Time"
          chosen={TIME_LABELS[time]}
          value={spanPath(time)}
          options={TIMES.map((span) => [spanPath(span), TIME_LABELS[span]])}
        />
      )}
      {children}
    </div>
  );
}
