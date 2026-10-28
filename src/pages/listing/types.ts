import type { Vote } from '../../account/contract';
import type { Load } from '../../core/store';
import type { ChromeAction, ChromeState } from '../../nav/chrome';
import type { OverflowAction, OverflowState } from '../../overflow/state';
import type { About, Listing, Post } from './contract';

export const SORTS = ['hot', 'new', 'top', 'rising'] as const;  // the ones we offer, in order (the front page: Best first)
export type Sort = (typeof SORTS)[number] | 'best' | 'controversial';
export const TIMES = ['hour', 'day', 'week', 'month', 'year', 'all'] as const;  // top's (and controversial's) span: ?t=
export type Time = (typeof TIMES)[number];

// What a listing is of: the front page, reddit's two, several subreddits at once, or one
export type Kind = 'home' | 'popular' | 'all' | 'multi' | 'subreddit';

export interface ListingState extends ChromeState, OverflowState {
  subreddit: string | null;  // null: the front page
  kind: Kind;
  sort: Sort;
  time: Time | null;         // top's span (day unless the address says); null: a sort without one
  path: string;              // its address (its pages' links: the same, starting elsewhere)
  search: string;
  page: number;              // which page, from 1 (old reddit's count=)
  posts: Post[];
  after: string | null;      // the next page's start; null: the last page
  before: string | null;     // the page before's end; null: the first
  status: 'loading' | 'failed' | 'idle';
  error: string | null;      // why the page didn't come
  about: Load<About> | null;  // one subreddit's; null: not one subreddit
  filters: Load<string[]> | null;  // r/all: the subreddits you keep out of it, A–Z; null: not r/all
  filterError: string | null;      // why a change to them didn't go
}

export type ListingAction =
  | { type: 'page/loaded'; listing: Listing }
  | { type: 'page/refreshed'; listing: Listing }  // back to the page as you left it: its fresh copy
  | { type: 'page/failed'; error: string }
  | { type: 'vote/requested'; id: string; vote: Vote }
  | { type: 'vote/failed'; id: string; vote: Vote }     // back to the vote before
  | { type: 'join/requested'; joined: boolean }
  | { type: 'join/failed'; joined: boolean }            // back to before
  | { type: 'about/loaded'; about: About }
  | { type: 'about/failed'; error: string }
  | { type: 'filters/loaded'; filters: string[] }
  | { type: 'filters/failed'; error: string }
  | { type: 'filter/requested'; subreddit: string; filtered: boolean }   // kept out of r/all, or let back in
  | { type: 'filter/failed'; subreddit: string; filtered: boolean; error: string }  // back to before
  | ChromeAction
  | OverflowAction;
