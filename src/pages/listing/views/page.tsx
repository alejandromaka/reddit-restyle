/* A listing, in the frame: where you are and its sorts, a page of its posts
   (one you hid here, or by someone or from a site you blocked here: a line,
   Undo; from a site you blocked before: none), the pages around it; the
   page's "…" menu, report and block, outside the frame (the menu's dropdown
   is placed on the page) */

import { Loader } from '../../../components/busy';
import { Pager } from '../../../components/pager';
import { Frame } from '../../../nav/frame';
import { isBlocked, postThing, siteBlock, siteOf } from '../../../overflow/state';
import { HiddenPost, Overflow } from '../../../overflow/views';
import type { ListingAction, ListingState } from '../types';
import { FiltersButton, FiltersRail } from './filters';
import { Heading } from './heading';
import { PostCard } from './post';
import { Sorts } from './sorts';

interface ListingPageProps {
  state: ListingState;
  dispatch: (action: ListingAction) => void;
}

export function ListingPage({ state, dispatch }: ListingPageProps) {
  const { filters } = state;
  const onFilter = (subreddit: string, filtered: boolean) => dispatch({ type: 'filter/requested', subreddit, filtered });
  // r/all: a subreddit you just filtered out leaves the page at once (reddit leaves it out of the next)
  const out = filters?.status === 'loaded' ? new Set(filters.data.map((name) => name.toLowerCase())) : null;
  const kept = out ? state.posts.filter((post) => !out.has(post.subreddit.toLowerCase())) : state.posts;
  // A site you blocked before: its posts left out (blocked here: a line, Undo)
  const posts = kept.filter((post) => siteBlock(state, siteOf(post))?.here !== false);
  return (
    <>
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
        >
          {filters && (
            <FiltersButton
              filters={filters}
              error={state.filterError}
              onFilter={onFilter}
            />
          )}
        </Sorts>
        {filters && (
          <FiltersRail
            filters={filters}
            error={state.filterError}
            onFilter={onFilter}
          />
        )}
        {state.status === 'loading' && <Loader />}
        {state.status === 'failed' && (
          <div class="rr-grid rr-gap-1 rr-px-4 rr-py-12 rr-text-center">
            <p class="rr-font-semibold">Couldn’t load this page</p>
            <p class="rr-text-xs rr-text-neutral-content-weak">{state.error}</p>
          </div>
        )}
        {state.status === 'idle' && posts.length === 0 && (
          <p class="rr-py-12 rr-text-center rr-text-neutral-content-weak">No posts here</p>
        )}
        {posts.map((post) => {
          if (state.hidden[post.id]) {
            return (
              <HiddenPost
                key={post.id}
                onUndo={() => dispatch({ type: 'hide/requested', id: post.id, hidden: false })}
              />
            );
          }
          if (isBlocked(state, post.author)) {
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
              mixed={state.kind !== 'subreddit'}
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
            beyond={state.beyond}
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
