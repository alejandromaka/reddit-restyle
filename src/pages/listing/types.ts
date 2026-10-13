import type { Vote } from '../../account/contract';
import type { Load } from '../../core/store';
import type { ChromeAction, ChromeState } from '../../nav/chrome';
import type { About, Listing, Post } from './contract';

export const SORTS = ['hot', 'new', 'top', 'rising'] as const;  // the ones we offer, in order (the front page: Best first)
export type Sort = (typeof SORTS)[number] | 'best' | 'controversial';
export const TIMES = ['hour', 'day', 'week', 'month', 'year', 'all'] as const;  // top's (and controversial's) span: ?t=
export type Time = (typeof TIMES)[number];

// What a listing is of: the front page, reddit's two, several subreddits at once, or one
export type Kind = 'home' | 'popular' | 'all' | 'multi' | 'subreddit';

export interface ListingState extends ChromeState {
  subreddit: string | null;  // null: the front page
  kind: Kind;
  sort: Sort;
  time: Time | null;         // top's span (day unless the address says); null: a sort without one
  posts: Post[];
  after: string | null;      // the next page's start; null: no more
  status: 'loading' | 'failed' | 'idle' | 'more' | 'more-failed';  // loading, failed: the first page; more, more-failed: the next
  error: string | null;      // why the first page didn't come
  about: Load<About> | null;  // one subreddit's; null: not one subreddit
}

export type ListingAction =
  | { type: 'page/loaded'; listing: Listing }
  | { type: 'page/failed'; error: string }
  | { type: 'more/requested' }
  | { type: 'more/loaded'; listing: Listing }
  | { type: 'more/failed' }
  | { type: 'vote/requested'; id: string; vote: Vote }
  | { type: 'vote/failed'; id: string; vote: Vote }     // back to the vote before
  | { type: 'join/requested'; joined: boolean }
  | { type: 'join/failed'; joined: boolean }            // back to before
  | { type: 'about/loaded'; about: About }
  | { type: 'about/failed'; error: string }
  | ChromeAction;
