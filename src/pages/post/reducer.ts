import type { Vote } from '../../account/contract';
import { chromeReducer, initialChrome } from '../../nav/chrome';
import { initialOverflow, isOverflowAction, overflowReducer } from '../../overflow/state';
import { refreshedPost } from '../listing/reducer';
import { MORE_AT_ONCE, type Comment, type More, type Reply } from './contract';
import { COMMENT_SORTS, type CommentSort, type PostAction, type PostState } from './types';

// A post's path: /r/pics/comments/abc/its_title/ (and a comment's: …/def/), or /comments/abc/
const PATH = /^\/(?:r\/([\w+]+)\/)?comments\/(\w+)(?:\/([^/]*))?(?:\/(\w+))?\/?$/;

export function initialState(path: string, search = ''): PostState {
  const [, subreddit = null, id = '', slug = '', comment] = PATH.exec(path) ?? [];
  const asked = new URLSearchParams(search).get('sort');
  return {
    path: `${subreddit ? `/r/${subreddit}` : ''}/comments/${id}/${slug ? `${slug}/` : ''}`,
    subreddit,
    focus: comment ? `t1_${comment}` : null,
    sort: asked && asked in COMMENT_SORTS ? (asked as CommentSort) : 'confidence',
    status: 'loading',
    error: null,
    post: null,
    comments: [],
    about: subreddit ? { status: 'loading' } : null,
    folded: {},
    loading: {},
    query: '',
    replyingTo: null,
    sending: null,
    sendError: null,
    sent: 0,
    ...initialChrome(),
    ...initialOverflow(),
  };
}

// Every comment loaded, in order (search; finding one)
export const allComments = (replies: Reply[]): Comment[] =>
  replies.flatMap((reply) => (reply.kind === 'comment' ? [reply, ...allComments(reply.replies)] : []));

export const findReply = (replies: Reply[], id: string): Reply | undefined => {
  for (const reply of replies) {
    if (reply.id === id) return reply;
    const found = reply.kind === 'comment' ? findReply(reply.replies, id) : undefined;
    if (found) return found;
  }
  return undefined;
};

// The tree with one reply replaced by others (none, one, several)
function replace(replies: Reply[], id: string, by: (reply: Reply) => Reply[]): Reply[] {
  return replies.flatMap((reply) => {
    if (reply.id === id) return by(reply);
    return reply.kind === 'comment' && reply.replies.length ? [{ ...reply, replies: replace(reply.replies, id, by) }] : [reply];
  });
}

const votedComment = (vote: Vote) => (reply: Reply): Reply[] =>
  [reply.kind === 'comment' ? { ...reply, vote, score: reply.score + vote - reply.vote } : reply];

function voted(state: PostState, id: string, vote: Vote): PostState {
  const { post } = state;
  if (post?.id === id) return { ...state, post: { ...post, vote, score: post.score + vote - post.vote } };
  return { ...state, comments: replace(state.comments, id, votedComment(vote)) };
}

function joined(state: PostState, join: boolean): PostState {
  if (state.about?.status !== 'loaded' || state.about.data.joined === join) return state;
  const { data } = state.about;
  return { ...state, about: { status: 'loaded', data: { ...data, joined: join, members: data.members + (join ? 1 : -1) } } };
}

// A "more", loaded: what came in its place, and a "more" for the rest (reddit sends a hundred at a time)
const loadedMore = (replies: Reply[]) => (reply: Reply): Reply[] => {
  const more = reply as More;
  const rest = more.children.slice(MORE_AT_ONCE);
  return [...replies, ...(rest.length ? [{ ...more, children: rest, count: Math.max(more.count - MORE_AT_ONCE, rest.length) }] : [])];
};

function posted(state: PostState, parent: string, comment: Comment): PostState {
  const done = { ...state, sending: null, sendError: null, replyingTo: null, sent: state.sent + 1 };
  if (parent === state.post?.id) return { ...done, comments: [comment, ...state.comments] };
  return { ...done, comments: replace(state.comments, parent, (reply) => [reply.kind === 'comment' ? { ...reply, replies: [comment, ...reply.replies] } : reply]) };
}

// The comments as you left them, each one's score and your vote as reddit has them now (none added, gone or moved)
function refreshed(replies: Reply[], now: Map<string, Comment>): Reply[] {
  return replies.map((reply) => {
    if (reply.kind !== 'comment') return reply;
    const it = now.get(reply.id);
    return { ...reply, ...(it ? { score: it.score, vote: it.vote } : {}), replies: refreshed(reply.replies, now) };
  });
}

const without = (record: Record<string, string>, id: string) => Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));

export function postReducer(state: PostState, action: PostAction): PostState {
  switch (action.type) {
    case 'page/loaded':
      return { ...state, status: 'idle', post: action.thread.post, comments: action.thread.comments, subreddit: state.subreddit ?? action.thread.post.subreddit };
    case 'page/refreshed': {
      const now = new Map(allComments(action.thread.comments).map((comment) => [comment.id, comment]));
      return { ...state, post: state.post && refreshedPost(state.post, action.thread.post), comments: refreshed(state.comments, now) };
    }
    case 'page/failed':
      return { ...state, status: 'failed', error: action.error };
    case 'about/loaded':
      return { ...state, about: { status: 'loaded', data: action.about } };
    case 'about/failed':
      return { ...state, about: { status: 'failed', error: action.error } };
    case 'vote/requested':
    case 'vote/failed':
      return voted(state, action.id, action.vote);
    case 'join/requested':
    case 'join/failed':
      return joined(state, action.joined);
    case 'fold/toggled':
      return { ...state, folded: { ...state.folded, [action.id]: action.folded } };
    case 'more/requested':
      return action.id in state.loading && !state.loading[action.id] ? state : { ...state, loading: { ...state.loading, [action.id]: '' } };
    case 'more/loaded':
      return { ...state, loading: without(state.loading, action.id), comments: replace(state.comments, action.id, loadedMore(action.replies)) };
    case 'more/failed':
      return { ...state, loading: { ...state.loading, [action.id]: action.error } };
    case 'search/changed':
      return { ...state, query: action.query };
    case 'reply/toggled':
      return { ...state, replyingTo: action.parent, sendError: null };
    case 'comment/requested':
      return state.sending ? state : { ...state, sending: action.parent, sendError: null };
    case 'comment/posted':
      return posted(state, action.parent, action.comment);
    case 'comment/failed':
      return { ...state, sending: null, sendError: { parent: action.parent, error: action.error } };
    default:
      return isOverflowAction(action) ? overflowReducer(state, action) : chromeReducer(state, action);
  }
}
