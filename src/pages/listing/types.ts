import type { Listing, Post } from './contract';

export const SORTS = ['hot', 'new', 'top', 'rising'] as const;  // the ones we offer, in order
export type Sort = (typeof SORTS)[number] | 'controversial';

export interface ListingState {
  subreddit: string | null;  // null: the front page
  sort: Sort;
  posts: Post[];
  after: string | null;      // the next page's start; null: no more
  status: 'loading' | 'failed' | 'idle' | 'more' | 'more-failed';  // loading, failed: the first page; more, more-failed: the next
  error: string | null;      // why the first page didn't come
}

export type ListingAction =
  | { type: 'page/loaded'; listing: Listing }
  | { type: 'page/failed'; error: string }
  | { type: 'more/requested' }
  | { type: 'more/loaded'; listing: Listing }
  | { type: 'more/failed' };
