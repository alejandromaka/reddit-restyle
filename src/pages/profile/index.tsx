/* Someone's profile, ours: their posts and comments by tab and sort, from
   reddit's JSON for the same address. The requests (the page, who they are,
   the frame's) go out at once, while reddit's HTML is still loading; ours is
   drawn when it's parsed. */

import { render } from 'preact';
import { block, hide, report, vote } from '../../account/contract';
import { sites } from '../../core/domains';
import { goTo, keepPlace, placeOf } from '../../core/place';
import { createStore, follow } from '../../core/store';
import { requestChrome } from '../../nav/chrome';
import { fetchRules } from '../../overflow/contract';
import { settledOverflow, startOverflow } from '../../overflow/state';
import type { Shell } from '../../shell/blocker';
import { fetchItems, fetchUser } from './contract';
import { startEffects } from './effects';
import { initialState, profileReducer } from './reducer';
import type { ProfileState } from './types';
import { ProfilePage } from './views/page';

export function setUpProfile(shell: Shell) {
  const { pathname, search } = location;
  const place = placeOf<ProfileState>();  // back here: where you were (and the page, if it's kept)
  const initial = place?.state ?? initialState(pathname, search);
  const first = fetchItems(pathname, search);
  const user = fetchUser(initial.name);
  const chrome = requestChrome();

  shell.ready(() => {
    const store = createStore(profileReducer, initial);
    const root = shell.mount();
    follow(store, (state) => render(<ProfilePage state={state} dispatch={store.dispatch} />, root));
    keepPlace(() => {
      const state = store.getState();
      return state.status === 'idle' ? settledOverflow(state) : null;
    });
    startEffects(store, { vote });
    startOverflow(store, { hide, report, rules: fetchRules, block, sites });
    chrome(store);
    if (place?.state) goTo(place.spot);  // before it shows: no jump
    shell.reveal();
    first.then(
      (items) => {
        if (place?.state) return store.dispatch({ type: 'page/refreshed', items });
        store.dispatch({ type: 'page/loaded', items });
        if (place) goTo(place.spot);
      },
      (error) => {
        if (!place?.state) store.dispatch({ type: 'page/failed', error: String(error) });  // the page as you left it stays
      },
    );
    user.then(
      (data) => store.dispatch({ type: 'user/loaded', user: data }),
      (error) => store.dispatch({ type: 'user/failed', error: String(error) }),
    );
  });
}
