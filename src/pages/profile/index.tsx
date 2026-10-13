/* Someone's profile, ours: their posts and comments by tab and sort, from
   reddit's JSON for the same address. The requests (the page, who they are,
   the frame's) go out at once, while reddit's HTML is still loading; ours is
   drawn when it's parsed. */

import { render } from 'preact';
import { hide, report, vote } from '../../account/contract';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
import { fetchRules } from '../../overflow/contract';
import { startOverflow } from '../../overflow/state';
import type { Shell } from '../../shell/blocker';
import { fetchItems, fetchUser } from './contract';
import { startEffects } from './effects';
import { initialState, profileReducer } from './reducer';
import { ProfilePage } from './views/page';

export function setUpProfile(shell: Shell) {
  const { pathname, search } = location;
  const initial = initialState(pathname, search);
  const first = fetchItems(pathname, search);
  const user = fetchUser(initial.name);
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(profileReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<ProfilePage state={state} dispatch={store.dispatch} />, root));
    startEffects(store, { vote });
    startOverflow(store, { hide, report, rules: fetchRules });
    chrome(store);
    shell.reveal();
    first.then(
      (items) => store.dispatch({ type: 'page/loaded', items }),
      (error) => store.dispatch({ type: 'page/failed', error: String(error) }),
    );
    user.then(
      (data) => store.dispatch({ type: 'user/loaded', user: data }),
      (error) => store.dispatch({ type: 'user/failed', error: String(error) }),
    );
  });
}
