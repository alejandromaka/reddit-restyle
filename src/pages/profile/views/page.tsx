/* Someone's profile, in the frame: their header (Block or Unblock, not
   yours) and About, their tabs (and sorts), a page of their posts (one you
   hid here, someone else's you blocked, or from a site you blocked here: a
   line, Undo; from a site you blocked before: none) and comments, the pages
   around it; the page's "…" menu, report and block, outside the frame (the
   menu's dropdown is placed on the page) */

import { Loader } from '../../../components/busy';
import { Pager } from '../../../components/pager';
import { Frame } from '../../../nav/frame';
import { commentThing, isBlocked, postThing, siteBlock, siteOf } from '../../../overflow/state';
import { HiddenPost, Overflow } from '../../../overflow/views';
import { PostCard } from '../../listing/views/post';
import type { ProfileAction, ProfileState } from '../types';
import { CommentCard } from './comment';
import { Heading } from './heading';
import { Tabs } from './tabs';

interface ProfilePageProps {
  state: ProfileState;
  dispatch: (action: ProfileAction) => void;
}

export function ProfilePage({ state, dispatch }: ProfilePageProps) {
  const mine = state.me.status === 'loaded' && state.me.data.name.toLowerCase() === state.name.toLowerCase();
  // Blocked by you (null: no button: you, or not known yet)
  const blocked = state.me.status === 'loaded' && !mine && state.user.status === 'loaded' ? isBlocked(state, state.name, state.user.data.blocked) : null;
  // A post someone else wrote (your saved, hidden, voted on), whose author you blocked
  const gone = (author: string) => author.toLowerCase() !== state.name.toLowerCase() && isBlocked(state, author);
  // A site you blocked before: its posts left out (blocked here: a line, Undo)
  const items = state.items.filter((item) => item.kind === 'comment' || siteBlock(state, siteOf(item.post))?.here !== false);
  return (
    <>
      <Frame
        current={`u_${state.name}`}  // a person you follow is among your communities as u_name
        chrome={state}
        dispatch={dispatch}
      >
        <Heading
          name={state.name}
          user={state.user}
          blocked={blocked}
          onBlock={(block) => dispatch(block ? { type: 'block/opened', name: state.name } : { type: 'block/requested', name: state.name, blocked: false })}
        />
        <Tabs
          name={state.name}
          tab={state.tab}
          mine={mine}
          sort={state.sort}
          time={state.time}
        />
        {state.status === 'loading' && <Loader />}
        {state.status === 'failed' && (
          <div class="rr-grid rr-gap-1 rr-px-4 rr-py-12 rr-text-center">
            <p class="rr-font-semibold">Couldn’t load this page</p>
            <p class="rr-text-xs rr-text-neutral-content-weak">{state.error}</p>
          </div>
        )}
        {state.status === 'idle' && items.length === 0 && (
          <p class="rr-py-12 rr-text-center rr-text-neutral-content-weak">Nothing here yet</p>
        )}
        {items.map((item) => {
          if (item.kind === 'comment') {
            const { comment } = item;
            return (
              <CommentCard
                key={comment.id}
                comment={comment}
                onVote={(vote) => dispatch({ type: 'vote/requested', id: comment.id, vote })}
                onMore={(at) => dispatch({ type: 'menu/opened', thing: commentThing(comment.id, comment.subreddit, comment.author), at })}
              />
            );
          }
          const { post } = item;
          if (state.hidden[post.id]) {
            return (
              <HiddenPost
                key={post.id}
                onUndo={() => dispatch({ type: 'hide/requested', id: post.id, hidden: false })}
              />
            );
          }
          if (gone(post.author)) {
            return (
              <HiddenPost
                key={post.id}
                blocked={`u/${post.author}`}
                onUndo={() => dispatch({ type: 'block/requested', name: post.author, blocked: false })}
              />
            );
          }
          const site = siteBlock(state, siteOf(post));
          if (site) {
            return (
              <HiddenPost
                key={post.id}
                blocked={site.domain}
                onUndo={() => dispatch({ type: 'domain/requested', domain: site.domain, blocked: false })}
              />
            );
          }
          return (
            <PostCard
              key={post.id}
              post={post}
              mixed
              onVote={(vote) => dispatch({ type: 'vote/requested', id: post.id, vote })}
              hidden={state.hidden[post.id] ?? post.hidden}
              onHide={(hidden) => dispatch({ type: 'hide/requested', id: post.id, hidden })}
              onMore={(at) => dispatch({ type: 'menu/opened', thing: postThing(post, state.hidden), at })}
            />
          );
        })}
        {state.status === 'idle' && (
          <Pager
            path={state.path}
            search={state.search}
            page={state.page}
            after={state.after}
            before={state.before}
          />
        )}
      </Frame>
      <Overflow
        state={state}
        dispatch={dispatch}
      />
    </>
  );
}
