/* A listing, in the frame: where you are and its sorts, a page of its posts, the pages around it */

import { Loader } from '../../../components/busy';
import { Pager } from '../../../components/pager';
import { Frame } from '../../../nav/frame';
import type { ListingAction, ListingState } from '../types';
import { Heading } from './heading';
import { PostCard } from './post';
import { Sorts } from './sorts';

interface ListingPageProps {
  state: ListingState;
  dispatch: (action: ListingAction) => void;
}

export function ListingPage({ state, dispatch }: ListingPageProps) {
  return (
    <Frame
      current={state.subreddit}
      chrome={state}
      dispatch={dispatch}
    >
      {state.kind === 'subreddit' && state.subreddit ? (
        <Heading
          subreddit={state.subreddit}
          about={state.about}
          onJoin={(joined) => dispatch({ type: 'join/requested', joined })}
        />
      ) : (
        // no header, as on reddit.com: the sorts right under the bar
        <h1 class="rr-sr-only">{state.subreddit ? `r/${state.subreddit}` : 'Home'}</h1>
      )}
      <Sorts
        subreddit={state.subreddit}
        kind={state.kind}
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
      {state.status === 'idle' && state.posts.length === 0 && (
        <p class="rr-py-12 rr-text-center rr-text-neutral-content-weak">No posts here</p>
      )}
      {state.posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          mixed={state.kind !== 'subreddit'}
          onVote={(vote) => dispatch({ type: 'vote/requested', id: post.id, vote })}
        />
      ))}
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
  );
}
