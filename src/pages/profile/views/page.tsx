/* Someone's profile, in the frame: their header and About, their tabs (and
   sorts), a page of their posts (one you hid here: a line, Undo) and
   comments, the pages around it; the page's "…" menu and report, outside the
   frame (the menu's dropdown is placed on the page) */

import { Loader } from '../../../components/busy';
import { Pager } from '../../../components/pager';
import { Frame } from '../../../nav/frame';
import { commentThing, postThing } from '../../../overflow/state';
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
        {state.status === 'idle' && state.items.length === 0 && (
          <p class="rr-py-12 rr-text-center rr-text-neutral-content-weak">Nothing here yet</p>
        )}
        {state.items.map((item) => {
          if (item.kind === 'comment') {
            const { comment } = item;
            return (
              <CommentCard
                key={comment.id}
                comment={comment}
                onVote={(vote) => dispatch({ type: 'vote/requested', id: comment.id, vote })}
                onMore={(at) => dispatch({ type: 'menu/opened', thing: commentThing(comment.id, comment.subreddit), at })}
              />
            );
          }
          const { post } = item;
          return state.hidden[post.id] ? (
            <HiddenPost
              key={post.id}
              onUndo={() => dispatch({ type: 'hide/requested', id: post.id, hidden: false })}
            />
          ) : (
            <PostCard
              key={post.id}
              post={post}
              mixed
              onVote={(vote) => dispatch({ type: 'vote/requested', id: post.id, vote })}
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
