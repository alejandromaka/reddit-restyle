/* Network → actions: the next page of posts when asked for */

import type { Store } from '../../core/store';
import type { Listing } from './contract';
import type { ListingAction, ListingState } from './types';

export type FetchMore = (after: string) => Promise<Listing>;

export function startEffects(store: Store<ListingState, ListingAction>, fetchMore: FetchMore) {
  store.subscribe((state, previous) => {
    if (state.status !== 'more' || previous.status === 'more' || !state.after) return;
    fetchMore(state.after).then(
      (listing) => store.dispatch({ type: 'more/loaded', listing }),
      () => store.dispatch({ type: 'more/failed' }),
    );
  });
}
