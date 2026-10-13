import type { Vote } from '../../account/contract';
import { chromeReducer, initialChrome } from '../../nav/chrome';
import type { Post } from './contract';
import { TIMES, type Kind, type ListingAction, type ListingState, type Sort, type Time } from './types';

export function kindOf(subreddit: string | null): Kind {
  if (subreddit === null) return 'home';
  const name = subreddit.toLowerCase();
  if (name === 'popular' || name === 'all') return name;
  return subreddit.includes('+') ? 'multi' : 'subreddit';
}

// Top's span from the address (?t=), day unless it says
const timeOf = (search: string): Time => TIMES.find((time) => time === new URLSearchParams(search).get('t')) ?? 'day';

// The subreddit and sort a listing's path names: /r/pics/top/ → pics, top; / → the front page, best (a subreddit: hot)
export function initialState(path: string, search = ''): ListingState {
  const [, subreddit = null, named] = /^\/(?:r\/([\w+]+)\/?)?(?:(\w+)\/?)?$/.exec(path) ?? [];
  const sort = named ?? (subreddit === null ? 'best' : 'hot');
  const kind = kindOf(subreddit);
  return {
    subreddit, kind, sort: sort as Sort, time: sort === 'top' || sort === 'controversial' ? timeOf(search) : null,
    posts: [], after: null, status: 'loading', error: null,
    about: kind === 'subreddit' ? { status: 'loading' } : null,
    ...initialChrome(),
  };
}

// A post's vote, and its score with it
const voted = (posts: Post[], id: string, vote: Vote) =>
  posts.map((post) => (post.id === id ? { ...post, vote, score: post.score + vote - post.vote } : post));

// The subreddit joined or left, its members with it
function joined(state: ListingState, join: boolean): ListingState {
  if (state.about?.status !== 'loaded' || state.about.data.joined === join) return state;
  const { data } = state.about;
  return { ...state, about: { status: 'loaded', data: { ...data, joined: join, members: data.members + (join ? 1 : -1) } } };
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
    case 'vote/requested':
    case 'vote/failed':
      return { ...state, posts: voted(state.posts, action.id, action.vote) };
    case 'join/requested':
    case 'join/failed':
      return joined(state, action.joined);
    case 'about/loaded':
      return { ...state, about: { status: 'loaded', data: action.about } };
    case 'about/failed':
      return { ...state, about: { status: 'failed', error: action.error } };
    default:
      return chromeReducer(state, action);
  }
}
