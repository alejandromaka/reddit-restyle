/* A post's page, in the frame, as reddit.com's: the post, the comment box,
   Sort by and Search Comments, then the comments (one comment's thread: just
   it, with a way to them all) */

import { Loader } from '../../../components/busy';
import { Frame } from '../../../nav/frame';
import { postThing } from '../../../overflow/state';
import { Overflow } from '../../../overflow/views';
import { allComments } from '../reducer';
import type { PostAction, PostState } from '../types';
import { Comments, SearchResults } from './comments';
import { Composer } from './composer';
import { PostHead } from './head';
import { CommentTools } from './tools';

interface PostPageProps {
  state: PostState;
  dispatch: (action: PostAction) => void;
}

export function PostPage({ state, dispatch }: PostPageProps) {
  const { post } = state;
  return (
    <>
      <Frame
        current={state.subreddit}
        chrome={state}
        dispatch={dispatch}
        post
      >
        {state.status === 'loading' && <Loader />}
        {state.status === 'failed' && (
          <div class="rr-grid rr-gap-1 rr-px-4 rr-py-12 rr-text-center">
            <p class="rr-font-semibold">Couldn’t load this post</p>
            <p class="rr-text-xs rr-text-neutral-content-weak">{state.error}</p>
          </div>
        )}
        {post && (
          <>
            <PostHead
              post={post}
              about={state.about}
              onVote={(vote) => dispatch({ type: 'vote/requested', id: post.id, vote })}
              onJoin={(joined) => dispatch({ type: 'join/requested', joined })}
              onMore={(at) => dispatch({ type: 'menu/opened', thing: postThing(post, state.hidden), at })}
            />
            <div class="rr-px-4 rr-py-2">
              {post.locked || post.archived ? (
                <p class="rr-text-xs rr-text-neutral-content-weak">{post.archived ? 'This post is archived: no new comments' : 'Comments are locked'}</p>
              ) : (
                <Composer
                  key={`post-${state.sent}`}
                  placeholder="Join the conversation"
                  sending={state.sending === post.id}
                  error={state.sendError?.parent === post.id ? state.sendError.error : null}
                  onSend={(text) => dispatch({ type: 'comment/requested', parent: post.id, text })}
                />
              )}
            </div>
            <CommentTools
              path={state.path}
              sort={state.sort}
              query={state.query}
              onSearch={(query) => dispatch({ type: 'search/changed', query })}
            />
            {state.focus && (
              <p class="rr-px-4 rr-py-2 rr-text-xs rr-text-neutral-content-weak">
                Single comment thread ·{' '}
                <a
                  class="rr-font-semibold rr-text-a-default"
                  href={state.path}
                >
                  See all comments
                </a>
              </p>
            )}
            <section
              id="comments"
              class="rr-px-4"
            >
              {state.query.trim() ? (
                <SearchResults
                  comments={allComments(state.comments)}
                  query={state.query}
                />
              ) : (
                <Comments
                  replies={state.comments}
                  talk={{ state, subreddit: post.subreddit, closed: post.locked || post.archived, dispatch }}
                />
              )}
              {!state.query.trim() && state.comments.length === 0 && (
                <p class="rr-py-12 rr-text-center rr-text-neutral-content-weak">No comments yet</p>
              )}
            </section>
          </>
        )}
      </Frame>
      <Overflow
        state={state}
        dispatch={dispatch}
      />
    </>
  );
}
