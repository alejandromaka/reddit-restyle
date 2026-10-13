/* A listing's sorts, as reddit.com's: a dropdown of them (Best on the front
   page, then Hot, New, Top, Rising), and with Top a second, its span (Now …
   All time); then anything else the listing has there (r/all: its filters).
   A line under them. */

import type { ComponentChildren } from 'preact';

import { Picker } from '../../../components/picker';
import { SORTS, TIMES, type Kind, type Sort, type Time } from '../types';

const sortPath = (subreddit: string | null, sort: Sort) => `/${subreddit ? `r/${subreddit}/` : ''}${sort}/`;
const SORT_LABELS: Record<Sort, string> = { best: 'Best', hot: 'Hot', new: 'New', top: 'Top', rising: 'Rising', controversial: 'Controversial' };
const TIME_LABELS: Record<Time, string> = { hour: 'Now', day: 'Today', week: 'This week', month: 'This month', year: 'This year', all: 'All time' };

interface SortsProps {
  subreddit: string | null;
  kind: Kind;
  sort: Sort;
  time: Time | null;
  children?: ComponentChildren;
}

export function Sorts({ subreddit, kind, sort, time, children }: SortsProps) {
  const offered: readonly Sort[] = kind === 'home' ? ['best', ...SORTS] : SORTS;
  const sorts = offered.includes(sort) ? offered : [sort, ...offered];  // one the address names that we don't offer
  const spanPath = (span: Time) => `${sortPath(subreddit, sort)}?t=${span}`;
  return (
    <div class="rr-flex rr-items-center rr-gap-5 rr-h-12 rr-px-4 rr-border-b rr-border-neutral-border-weak">
      <Picker
        label="Sort"
        chosen={SORT_LABELS[sort]}
        value={sortPath(subreddit, sort)}
        options={sorts.map((name) => [sortPath(subreddit, name), SORT_LABELS[name]])}
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
