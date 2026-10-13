/* Network → actions: the next page of posts when asked for; your votes and
   joins, sent (each already on screen; one reddit refuses goes back, and the
   console says why) */

import type { Vote } from '../../account/contract';
import type { Store } from '../../core/store';
import type { Listing } from './contract';
import type { ListingAction, ListingState } from './types';

interface ListingApi {
  more: (after: string) => Promise<Listing>;
  vote: (id: string, dir: Vote) => Promise<void>;
  subscribe: (name: string, join: boolean) => Promise<void>;
}

export function startEffects(store: Store<ListingState, ListingAction>, api: ListingApi) {
  store.subscribe((state, previous, action) => {
    if (state.status === 'more' && previous.status !== 'more' && state.after) {
      api.more(state.after).then(
        (listing) => store.dispatch({ type: 'more/loaded', listing }),
        () => store.dispatch({ type: 'more/failed' }),
      );
    }
    if (action.type === 'vote/requested') {
      const before = previous.posts.find(({ id }) => id === action.id)?.vote ?? 0;
      api.vote(action.id, action.vote).catch((error: unknown) => {
        console.error(error);
        store.dispatch({ type: 'vote/failed', id: action.id, vote: before });
      });
    }
    if (action.type === 'join/requested' && state.about?.status === 'loaded' && state.about !== previous.about) {
      api.subscribe(state.about.data.name, action.joined).catch((error: unknown) => {
        console.error(error);
        store.dispatch({ type: 'join/failed', joined: !action.joined });
      });
    }
  });
}
