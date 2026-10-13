/* Network → actions: what you do on a post (each already on screen; one
   reddit refuses goes back, and the console says why): votes, joins; more
   comments when asked for; your comments and replies, sent */

import type { Vote } from '../../account/contract';
import type { Store } from '../../core/store';
import type { Comment, Reply } from './contract';
import { findReply } from './reducer';
import type { PostAction, PostState } from './types';

interface PostApi {
  vote: (id: string, dir: Vote) => Promise<void>;
  subscribe: (name: string, join: boolean) => Promise<void>;
  more: (post: string, children: string[], sort: string, thread: string) => Promise<Reply[]>;
  comment: (parent: string, text: string) => Promise<Comment>;
}

export function startEffects(store: Store<PostState, PostAction>, api: PostApi) {
  store.subscribe((state, previous, action) => {
    if (action.type === 'vote/requested') {
      const before = previous.post?.id === action.id ? previous.post.vote : (findReply(previous.comments, action.id) as Comment | undefined)?.vote ?? 0;
      api.vote(action.id, action.vote).catch((error: unknown) => {
        console.error(error);
        store.dispatch({ type: 'vote/failed', id: action.id, vote: before });
      });
    }
    if (action.type === 'join/requested' && state.about?.status === 'loaded' && state.about !== previous.about) {
      api.subscribe(state.about.data.name, action.joined).catch((error: unknown) => {
        console.error(error);
        store.dispatch({ type: 'join/failed', joined: !action.joined });
      });
    }
    if (action.type === 'more/requested' && state.loading !== previous.loading && state.post) {
      const more = findReply(state.comments, action.id);
      if (more?.kind !== 'more') return;
      api.more(state.post.id, more.children, state.sort, state.post.permalink).then(
        (replies) => store.dispatch({ type: 'more/loaded', id: action.id, replies }),
        (error: unknown) => store.dispatch({ type: 'more/failed', id: action.id, error: String(error) }),
      );
    }
    if (action.type === 'comment/requested' && state.sending && !previous.sending) {
      api.comment(action.parent, action.text).then(
        (comment) => store.dispatch({ type: 'comment/posted', parent: action.parent, comment }),
        (error: unknown) => store.dispatch({ type: 'comment/failed', parent: action.parent, error: String(error) }),
      );
    }
  });
}
