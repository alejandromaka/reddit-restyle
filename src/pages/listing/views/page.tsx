/* A listing, in the frame: where you are and its sorts, its posts, more on request */

import { BusyButton, Loader } from '../../../components/busy';
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
      {state.after && state.status !== 'loading' && (
        <div class="rr-p-4">
          <BusyButton
            busy={state.status === 'more'}
            class="rr-grid rr-place-items-center rr-w-full rr-h-12 rr-rounded-full rr-bg-secondary-background rr-font-semibold"
            onClick={() => dispatch({ type: 'more/requested' })}
          >
            {state.status === 'more-failed' ? 'Couldn’t load more. Try again' : 'More posts'}
          </BusyButton>
        </div>
      )}
    </Frame>
  );
}
