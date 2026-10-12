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
      <main class="rr-grid rr-gap-2 rr-max-w-[40rem] rr-mx-auto rr-pt-2 rr-pb-8">
        {state.status === 'loading' && <Loader />}
        {state.status !== 'loading' && state.posts.length === 0 && (
          <p class="rr-py-12 rr-text-center rr-text-ink-2">No posts here</p>
        )}
        {state.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
          />
        ))}
        {state.after && state.status !== 'loading' && (
          <div class="rr-px-4 rr-pt-2">
            <BusyButton
              busy={state.status === 'more'}
              class="rr-grid rr-place-items-center rr-w-full rr-min-h-control rr-rounded-button rr-border rr-border-line rr-bg-surface rr-font-bold"
              onClick={() => dispatch({ type: 'more/requested' })}
            >
              {state.status === 'failed' ? 'Couldn’t load more. Try again' : 'More posts'}
            </BusyButton>
          </div>
        )}
      </main>
    </>
  );
}
