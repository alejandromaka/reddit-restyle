/* A listing, ours: the front page or a subreddit, by sort. Its posts come
   from reddit's JSON for the same address; the requests (the posts, one
   subreddit's about, the frame's: your communities and you) go out at once,
   while reddit's HTML is still loading, and ours is drawn when it's parsed. */

import { render } from 'preact';
import { subscribe, vote } from '../../account/contract';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
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
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(listingReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<ListingPage state={state} dispatch={store.dispatch} />, root));
    startEffects(store, { vote, subscribe });
    chrome(store);
    shell.reveal();
    first.then(
      (listing) => store.dispatch({ type: 'page/loaded', listing }),
      (error) => store.dispatch({ type: 'page/failed', error: String(error) }),
    );
    about?.then(
      (data) => store.dispatch({ type: 'about/loaded', about: data }),
      (error) => store.dispatch({ type: 'about/failed', error: String(error) }),
    );
  });
}
