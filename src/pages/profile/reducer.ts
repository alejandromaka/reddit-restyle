import type { Vote } from '../../account/contract';
import { pageOf } from '../../core/paging';
import { chromeReducer, initialChrome } from '../../nav/chrome';
import { initialOverflow, isOverflowAction, overflowReducer } from '../../overflow/state';
import { TIMES } from '../listing/types';
import type { Item } from './contract';
import { SORTED, SORTS, TABS, type ProfileAction, type ProfileState } from './types';

// Whose, which tab, which sort, from the address: /user/someone/comments/?sort=top&t=week
export function initialState(path: string, search = ''): ProfileState {
  const [, name = '', named = 'overview'] = /^\/user\/([\w-]+)\/?(?:(\w+)\/?)?$/.exec(path) ?? [];
  const tab = TABS.find((each) => each.name === named)?.name ?? 'overview';
  const query = new URLSearchParams(search);
  const sort = SORTED.includes(tab) ? SORTS.find((each) => each === query.get('sort')) ?? 'new' : null;
  const time = sort === 'top' || sort === 'controversial' ? TIMES.find((each) => each === query.get('t')) ?? 'all' : null;
  return {
    name, tab, sort, time, path, search, page: pageOf(search),
    items: [], after: null, before: null, beyond: null, status: 'loading', error: null,
    user: { status: 'loading' },
    ...initialChrome(),
    ...initialOverflow(),
  };
}

// A post's or comment's vote, and its score with it
const rescored = <T extends { vote: Vote; score: number }>(thing: T, vote: Vote): T => ({ ...thing, vote, score: thing.score + vote - thing.vote });

const voted = (items: Item[], id: string, vote: Vote) => items.map((item): Item => {
  if (item.kind === 'post') return item.post.id === id ? { kind: 'post', post: rescored(item.post, vote) } : item;
  return item.comment.id === id ? { kind: 'comment', comment: rescored(item.comment, vote) } : item;
});

export function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'page/loaded':
      return { ...state, ...action.items, status: 'idle' };
    case 'beyond/loaded':
      return { ...state, beyond: action.beyond };
    case 'page/failed':
      return { ...state, status: 'failed', error: action.error };
    case 'user/loaded':
      return { ...state, user: { status: 'loaded', data: action.user } };
    case 'user/failed':
      return { ...state, user: { status: 'failed', error: action.error } };
    case 'vote/requested':
    case 'vote/failed':
      return { ...state, items: voted(state.items, action.id, action.vote) };
    default:
      return isOverflowAction(action) ? overflowReducer(state, action) : chromeReducer(state, action);
  }
}
