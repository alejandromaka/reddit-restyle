/* A listing: its bar, its posts, more on request */

import { BusyButton, Loader } from '../../../components/busy';
import type { ListingAction, ListingState } from '../types';
import { Bar } from './bar';
import { PostCard } from './post';

interface ListingPageProps {
  state: ListingState;
  dispatch: (action: ListingAction) => void;
}

export function ListingPage({ state, dispatch }: ListingPageProps) {
  return (
    <>
      <Bar
        subreddit={state.subreddit}
        sort={state.sort}
      />
      <main class="rr-max-w-[40rem] rr-mx-auto rr-pb-8">
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
      </main>
    </>
  );
}
