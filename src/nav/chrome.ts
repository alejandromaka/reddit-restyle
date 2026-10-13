/* What every page has around it (nav/frame.tsx): your communities (the strip
   and the menu) and you (the bar), asked for at document start; and logging
   out. Each page's store carries them (ChromeState) and hands their actions
   to chromeReducer. */

import { fetchMe, logOut, type Me } from '../account/contract';
import type { Load } from '../core/store';
import { fetchCommunities, type Community } from './contract';

export interface ChromeState {
  communities: Load<Community[]>;  // the strip's and the menu's
  me: Load<Me>;                    // the bar's
}

export type ChromeAction =
  | { type: 'communities/loaded'; communities: Community[] }
  | { type: 'communities/failed'; error: string }
  | { type: 'me/loaded'; me: Me }
  | { type: 'me/failed'; error: string }
  | { type: 'logout/requested' };

export const initialChrome = (): ChromeState => ({ communities: { status: 'loading' }, me: { status: 'loading' } });

export function chromeReducer<S extends ChromeState>(state: S, action: ChromeAction): S {
  switch (action.type) {
    case 'communities/loaded':
      return { ...state, communities: { status: 'loaded', data: action.communities } };
    case 'communities/failed':
      return { ...state, communities: { status: 'failed', error: action.error } };
    case 'me/loaded':
      return { ...state, me: { status: 'loaded', data: action.me } };
    case 'me/failed':
      return { ...state, me: { status: 'failed', error: action.error } };
    case 'logout/requested':
      return state;  // logging out happens below; then the page loads again
  }
}

interface ChromeStore {
  dispatch(action: ChromeAction): void;
  subscribe(listener: (state: unknown, previous: unknown, action: { type: string }) => void): unknown;
}

// At document start, the requests (you: your modhash too, which votes and
// comments need); once there's a store, their answers into it, and logging
// out when asked (then the page again, signed out)
export function requestChrome() {
  const communities = fetchCommunities();
  const me = fetchMe();
  return (store: ChromeStore) => {
    communities.then(
      (list) => store.dispatch({ type: 'communities/loaded', communities: list }),
      (error) => store.dispatch({ type: 'communities/failed', error: String(error) }),
    );
    me.then(
      (data) => store.dispatch({ type: 'me/loaded', me: data }),
      (error) => store.dispatch({ type: 'me/failed', error: String(error) }),
    );
    store.subscribe((_state, _previous, action) => {
      if (action.type === 'logout/requested') logOut().then(() => location.reload(), (error: unknown) => console.error(error));
    });
  };
}
