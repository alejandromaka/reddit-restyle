import type { ListingAction, ListingState, Sort } from './types';

// The subreddit and sort a listing's path names: /r/pics/top/ → pics, top; / → the front page, hot
export function initialState(path: string): ListingState {
  const [, subreddit = null, sort = 'hot'] = /^\/(?:r\/([\w+]+)\/?)?(?:(\w+)\/?)?$/.exec(path) ?? [];
  return { subreddit, sort: sort as Sort, posts: [], after: null, status: 'loading', error: null };
}

export function listingReducer(state: ListingState, action: ListingAction): ListingState {
  switch (action.type) {
    case 'page/loaded':
      return { ...state, posts: action.listing.posts, after: action.listing.after, status: 'idle' };
    case 'page/failed':
      return { ...state, status: 'failed', error: action.error };
    case 'more/requested':
      return state.after && state.status !== 'more' ? { ...state, status: 'more' } : state;
    case 'more/loaded': {
      // A post that moved up while we read shows once
      const seen = new Set(state.posts.map(({ id }) => id));
      const posts = [...state.posts, ...action.listing.posts.filter(({ id }) => !seen.has(id))];
      return { ...state, posts, after: action.listing.after, status: 'idle' };
    }
    case 'more/failed':
      return { ...state, status: 'more-failed' };
  }
}
