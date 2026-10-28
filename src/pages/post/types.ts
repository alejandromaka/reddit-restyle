import type { Vote } from '../../account/contract';
import type { Load } from '../../core/store';
import type { ChromeAction, ChromeState } from '../../nav/chrome';
import type { OverflowAction, OverflowState } from '../../overflow/state';
import type { About } from '../listing/contract';
import type { Comment, Reply, Thread, FullPost } from './contract';

// The comments' orders (?sort=), as reddit.com names them
export const COMMENT_SORTS = { confidence: 'Best', top: 'Top', new: 'New', controversial: 'Controversial', old: 'Old', qa: 'Q&A' } as const;
export type CommentSort = keyof typeof COMMENT_SORTS;

export interface PostState extends ChromeState, OverflowState {
  path: string;                     // the post's own address (…/comments/id/slug/), without a comment's
  subreddit: string | null;         // from the address (null: /comments/id/, until the post says)
  focus: string | null;             // one comment's thread (…/comments/id/slug/abc/): t1_abc
  sort: CommentSort;
  status: 'loading' | 'failed' | 'idle';
  error: string | null;             // why the post didn't come
  post: FullPost | null;
  comments: Reply[];
  about: Load<About> | null;        // its subreddit's (Join); null: no subreddit in the address
  folded: Record<string, boolean>;  // comments you folded or opened (else reddit's say)
  loading: Record<string, string>;  // "more"s on their way: id → '' (failed: why)
  query: string;                    // searching the comments
  replyingTo: string | null;        // the comment whose reply box is open
  sending: string | null;           // a comment on its way: its parent
  sendError: { parent: string; error: string } | null;
  sent: number;                     // comments made here so far (the post's box starts again empty)
}

export type PostAction =
  | { type: 'page/loaded'; thread: Thread }
  | { type: 'page/refreshed'; thread: Thread }  // back to the page as you left it: its fresh copy
  | { type: 'page/failed'; error: string }
  | { type: 'about/loaded'; about: About }
  | { type: 'about/failed'; error: string }
  | { type: 'vote/requested'; id: string; vote: Vote }  // the post's (t3_…) or a comment's (t1_…)
  | { type: 'vote/failed'; id: string; vote: Vote }     // back to the vote before
  | { type: 'join/requested'; joined: boolean }
  | { type: 'join/failed'; joined: boolean }            // back to before
  | { type: 'fold/toggled'; id: string; folded: boolean }
  | { type: 'more/requested'; id: string }
  | { type: 'more/loaded'; id: string; replies: Reply[] }
  | { type: 'more/failed'; id: string; error: string }
  | { type: 'search/changed'; query: string }
  | { type: 'reply/toggled'; parent: string | null }     // a comment's reply box, opened (null: closed)
  | { type: 'comment/requested'; parent: string; text: string }
  | { type: 'comment/posted'; parent: string; comment: Comment }
  | { type: 'comment/failed'; parent: string; error: string }
  | ChromeAction
  | OverflowAction;
