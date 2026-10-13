/* Network → actions: your votes, sent (each already on screen; one reddit
   refuses goes back, and the console says why) */

import type { Vote } from '../../account/contract';
import type { Store } from '../../core/store';
import type { ProfileAction, ProfileState } from './types';

interface ProfileApi {
  vote: (id: string, dir: Vote) => Promise<void>;
}

export function startEffects(store: Store<ProfileState, ProfileAction>, api: ProfileApi) {
  store.subscribe((_state, previous, action) => {
    if (action.type !== 'vote/requested') return;
    const item = previous.items.find((each) => (each.kind === 'post' ? each.post.id : each.comment.id) === action.id);
    const before = item ? (item.kind === 'post' ? item.post.vote : item.comment.vote) : 0;
    api.vote(action.id, action.vote).catch((error: unknown) => {
      console.error(error);
      store.dispatch({ type: 'vote/failed', id: action.id, vote: before });
    });
  });
}
