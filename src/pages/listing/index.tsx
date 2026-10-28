/* A listing, ours: the front page or a subreddit, by sort. Its posts come
   from reddit's JSON for the same address; the requests (the posts, one
   subreddit's about, r/all's filters, the frame's: your communities and you)
   go out at once, while reddit's HTML is still loading, and ours is drawn
   when it's parsed. */

import { render } from 'preact';
import { block, fetchFilters, filter, hide, report, subscribe, vote } from '../../account/contract';
import { sites } from '../../core/domains';
import { goTo, keepPlace, placeOf } from '../../core/place';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
import { fetchRules } from '../../overflow/contract';
import { settledOverflow, startOverflow } from '../../overflow/state';
import type { Shell } from '../../shell/blocker';
import { fetchAbout, fetchListing } from './contract';
import { startEffects } from './effects';
import { initialState, listingReducer } from './reducer';
import type { ListingState } from './types';
import { ListingPage } from './views/page';

export function setUpListing(shell: Shell) {
  const { pathname, search } = location;
  const place = placeOf<ListingState>();  // back here: where you were (and the page, if it's kept)
  const initial = place?.state ?? initialState(pathname, search);
  const first = fetchListing(pathname, search);
  const about = initial.about && initial.subreddit ? fetchAbout(initial.subreddit) : null;
  const filters = initial.filters ? fetchFilters() : null;
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(listingReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<ListingPage state={state} dispatch={store.dispatch} />, root));
    keepPlace(() => {
      const state = store.getState();
      return state.status === 'idle' ? settledOverflow(state) : null;
    });
    startEffects(store, { vote, subscribe, filter });
    startOverflow(store, { hide, report, rules: fetchRules, block, sites });
    chrome(store);
    if (place?.state) goTo(place.spot);  // before it shows: no jump
    shell.reveal();
    first.then(
      (listing) => {
        if (place?.state) return store.dispatch({ type: 'page/refreshed', listing });
        store.dispatch({ type: 'page/loaded', listing });
        if (place) goTo(place.spot);
      },
      (error) => {
        if (!place?.state) store.dispatch({ type: 'page/failed', error: String(error) });  // the page as you left it stays
      },
    );
    filters?.then(
      (names) => store.dispatch({ type: 'filters/loaded', filters: names }),
      (error) => store.dispatch({ type: 'filters/failed', error: String(error) }),
    );
    about?.then(
      (data) => store.dispatch({ type: 'about/loaded', about: data }),
      (error) => store.dispatch({ type: 'about/failed', error: String(error) }),
    );
  });
}
