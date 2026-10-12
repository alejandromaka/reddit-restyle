/* A listing, ours: the front page or a subreddit, by sort. Its posts come
   from reddit's JSON for the same address; the request goes out at once,
   while reddit's HTML is still loading, and ours is drawn when it's parsed. */

import { render } from 'preact';
import { createStore, follow } from '../../core/store';
import type { Shell } from '../../shell/blocker';
import { fetchListing } from './contract';
import { startEffects } from './effects';
import { initialState, listingReducer } from './reducer';
import { ListingPage } from './views/page';

export function setUpListing(shell: Shell) {
  const { pathname, search } = location;
  const first = fetchListing(pathname, search);

  shell.ready(() => {
    const store = createStore(listingReducer, initialState(pathname));
    const root = shell.mount();
    follow(store, (state) => render(<ListingPage state={state} dispatch={store.dispatch} />, root));
    startEffects(store, (after) => fetchListing(pathname, search, after));
    shell.reveal();
    first.then(
      (listing) => store.dispatch({ type: 'page/loaded', listing }),
      (error) => store.dispatch({ type: 'page/failed', error: String(error) }),
    );
  });
}
