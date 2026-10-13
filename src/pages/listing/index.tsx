/* A listing, ours: the front page or a subreddit, by sort. Its posts come
   from reddit's JSON for the same address; the requests (the posts, one
   subreddit's about, r/all's filters, the frame's: your communities and you)
   go out at once, while reddit's HTML is still loading, and ours is drawn
   when it's parsed. */

import { render } from 'preact';
import { fetchFilters, filter, hide, report, subscribe, vote } from '../../account/contract';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
import { fetchRules } from '../../overflow/contract';
import { startOverflow } from '../../overflow/state';
import type { Shell } from '../../shell/blocker';
import { fetchAbout, fetchListing } from './contract';
import { startEffects } from './effects';
import { initialState, listingReducer } from './reducer';
import { ListingPage } from './views/page';

export function setUpListing(shell: Shell) {
  const { pathname, search } = location;
  const initial = initialState(pathname, search);
  const first = fetchListing(pathname, search);
  const about = initial.about && initial.subreddit ? fetchAbout(initial.subreddit) : null;
  const filters = initial.filters ? fetchFilters() : null;
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(listingReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<ListingPage state={state} dispatch={store.dispatch} />, root));
    startEffects(store, { vote, subscribe, filter });
    startOverflow(store, { hide, report, rules: fetchRules });
    chrome(store);
    shell.reveal();
    first.then(
      (listing) => store.dispatch({ type: 'page/loaded', listing }),
      (error) => store.dispatch({ type: 'page/failed', error: String(error) }),
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
