/* A post's page, ours: the post and its comments, from reddit's JSON for the
   same address. The requests (the post, its subreddit's about, the frame's)
   go out at once, while reddit's HTML is still loading; ours is drawn when
   it's parsed. */

import { render } from 'preact';
import { comment, subscribe, vote } from '../../account/contract';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
import type { Shell } from '../../shell/blocker';
import { fetchAbout } from '../listing/contract';
import { fetchMore, fetchThread, readPosted } from './contract';
import { startEffects } from './effects';
import { initialState, postReducer } from './reducer';
import { PostPage } from './views/page';

export function setUpPost(shell: Shell) {
  const { pathname, search } = location;
  const initial = initialState(pathname, search);
  const first = fetchThread(pathname, search);
  const about = initial.subreddit ? fetchAbout(initial.subreddit) : null;
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(postReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<PostPage state={state} dispatch={store.dispatch} />, root));
    startEffects(store, {
      vote,
      subscribe,
      more: fetchMore,
      comment: async (parent, text) => readPosted(await comment(parent, text)),
    });
    chrome(store);
    shell.reveal();
    first.then(
      (thread) => store.dispatch({ type: 'page/loaded', thread }),
      (error) => store.dispatch({ type: 'page/failed', error: String(error) }),
    );
    about?.then(
      (data) => store.dispatch({ type: 'about/loaded', about: data }),
      (error) => store.dispatch({ type: 'about/failed', error: String(error) }),
    );
  });
}
