/* A post's page, ours: the post and its comments, from reddit's JSON for the
   same address. The requests (the post, its subreddit's about, the frame's)
   go out at once, while reddit's HTML is still loading; ours is drawn when
   it's parsed. */

import { render } from 'preact';
import { block, comment, hide, report, subscribe, vote } from '../../account/contract';
import { sites } from '../../core/domains';
import { goTo, keepPlace, placeOf } from '../../core/place';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
import { fetchRules } from '../../overflow/contract';
import { settledOverflow, startOverflow } from '../../overflow/state';
import type { Shell } from '../../shell/blocker';
import { fetchAbout } from '../listing/contract';
import { fetchMore, fetchThread, readPosted } from './contract';
import { startEffects } from './effects';
import { initialState, postReducer } from './reducer';
import type { PostState } from './types';
import { PostPage } from './views/page';

export function setUpPost(shell: Shell) {
  const { pathname, search } = location;
  const place = placeOf<PostState>();  // back here: where you were (and the page, if it's kept)
  const initial = place?.state ?? initialState(pathname, search);
  const first = fetchThread(pathname, search);
  const about = initial.subreddit ? fetchAbout(initial.subreddit) : null;
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(postReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<PostPage state={state} dispatch={store.dispatch} />, root));
    // Kept with nothing half done: no reply box open, no comment or "more" on its way, no search
    keepPlace(() => {
      const state = store.getState();
      return state.status === 'idle' ? { ...settledOverflow(state), replyingTo: null, sending: null, sendError: null, loading: {}, query: '' } : null;
    });
    startEffects(store, {
      vote,
      subscribe,
      more: fetchMore,
      comment: async (parent, text) => readPosted(await comment(parent, text)),
    });
    startOverflow(store, { hide, report, rules: fetchRules, block, sites });
    chrome(store);
    if (place?.state) goTo(place.spot);  // before it shows: no jump
    shell.reveal();
    first.then(
      (thread) => {
        if (place?.state) return store.dispatch({ type: 'page/refreshed', thread });
        store.dispatch({ type: 'page/loaded', thread });
        if (place) goTo(place.spot);
      },
      (error) => {
        if (!place?.state) store.dispatch({ type: 'page/failed', error: String(error) });  // the page as you left it stays
      },
    );
    about?.then(
      (data) => store.dispatch({ type: 'about/loaded', about: data }),
      (error) => store.dispatch({ type: 'about/failed', error: String(error) }),
    );
  });
}
