/* A post's page: its address with .json added (raw_json=1; sr_detail=1:
   its subreddit's icon; sort: the comments' order) answers [the post (a
   Listing of one t3), its comments (a Listing of t1s, each with its replies,
   and "more" for those not sent)]. The ones not sent come from the page of
   the comment they're under (or the post's again), with a bigger limit:
   reddit answers /api/morechildren with 403 now. Read into our types, only
   what we draw. */

import { voteOf, type Vote } from '../../account/contract';
import { fetchJson } from '../../core/http';
import { clean } from '../../core/html';
import { plain } from '../../core/text';
import { BIG_WIDTH, picturesOf, readPost, type Post, type RedditMedia, type RedditPost } from '../listing/contract';
import { COMMENT_SORTS } from './types';

// The parts of a t1 (comment) and a "more" we use, as reddit sends them
interface RedditComment {
  name: string;  // t1_…
  parent_id: string;
  author: string;
  body: string;  // markdown
  body_html: string;
  score: number;
  score_hidden: boolean;
  likes: boolean | null;
  created_utc: number;
  is_submitter: boolean;          // by the post's author
  distinguished: string | null;   // 'moderator', 'admin'
  stickied: boolean;
  author_flair_text: string | null;
  collapsed: boolean;             // reddit folds it (low score, …)
  author_is_blocked?: boolean;    // by you
  media_metadata?: Record<string, RedditMedia>;  // the pictures it links to, reddit's own
  depth: number;
  permalink: string;
  replies: '' | { kind: 'Listing'; data: { children: RedditThing[] } };
}
interface RedditMore {
  id: string;
  parent_id: string;
  count: number;
  children: string[];  // ids, without t1_ (id '_', no children: too deep to send here, "continue this thread")
  depth: number;
}
type RedditThing = { kind: 't1'; data: RedditComment } | { kind: 'more'; data: RedditMore } | { kind: string; data: unknown };
interface RedditListingOf<T> {
  kind: 'Listing';
  data: { children: T[] };
}
type RedditThread = [RedditListingOf<{ kind: 't3'; data: RedditPost }>, RedditListingOf<RedditThing>];

export interface Comment {
  kind: 'comment';
  id: string;              // t1_…
  author: string;
  html: string;            // its body, cleaned
  text: string;            // its body, plain (search)
  score: number;
  scoreHidden: boolean;
  vote: Vote;              // yours
  created: number;         // seconds since 1970
  op: boolean;             // by the post's author
  mod: boolean;            // as a moderator
  pinned: boolean;
  flair: string | null;
  folded: boolean;         // reddit folds it at first
  blocked: boolean;        // by someone you blocked (reddit's say)
  depth: number;
  permalink: string;       // its own thread
  replies: Reply[];
}

export interface More {
  kind: 'more';
  id: string;              // reddit's, for this "more"
  parent: string;          // t1_… or t3_…
  count: number;
  children: string[];      // what to ask for ([]: too deep: continueAt)
  depth: number;
  continueAt: string | null;  // too deep to load here: the parent's own thread
}

export type Reply = Comment | More;

export interface FullPost extends Post {
  html: string | null;     // its text, cleaned
  locked: boolean;         // no new comments
  archived: boolean;       // too old to vote or comment
}

export interface Thread {
  post: FullPost;
  comments: Reply[];
}


export function readComment(data: RedditComment): Comment {
  return {
    kind: 'comment',
    id: data.name,
    author: data.author,
    html: clean(data.body_html, picturesOf(data.media_metadata)),
    text: plain(data.body),
    score: data.score,
    scoreHidden: data.score_hidden,
    vote: voteOf(data.likes),
    created: data.created_utc,
    op: data.is_submitter,
    mod: data.distinguished === 'moderator',
    pinned: data.stickied,
    flair: data.author_flair_text || null,
    folded: data.collapsed,
    blocked: Boolean(data.author_is_blocked),
    depth: data.depth,
    permalink: data.permalink,
    replies: data.replies ? readReplies(data.replies.data.children, data.permalink) : [],
  };
}

// A comment you just made, as reddit answered (account/contract.ts: comment)
export const readPosted = (data: unknown) => readComment(data as RedditComment);

// thread: the comment (or post) they're under: its permalink, where "continue this thread" goes (a
// comment's own page shows its thread)
function readReplies(things: RedditThing[], thread: string): Reply[] {
  return things.flatMap((thing): Reply[] => {
    if (thing.kind === 't1') return [readComment(thing.data as RedditComment)];
    if (thing.kind !== 'more') return [];
    const more = thing.data as RedditMore;
    if (!more.children.length && more.id !== '_') return [];  // nothing more
    return [{
      kind: 'more',
      id: more.id,
      parent: more.parent_id,
      count: more.count,
      children: more.children,
      depth: more.depth,
      continueAt: more.children.length ? null : thread,
    }];
  });
}

export function readThread([posts, comments]: RedditThread): Thread {
  const raw = posts.data.children[0]!.data;
  const shared = raw.crosspost_parent_list?.[0] ?? raw;
  const post = readPost(raw, BIG_WIDTH);  // its pictures as big as when opened
  return {
    post: {
      ...post,
      html: !post.spoiler && shared.selftext_html ? clean(shared.selftext_html) : null,
      locked: Boolean(raw.locked),
      archived: Boolean(raw.archived),
    },
    comments: readReplies(comments.data.children, raw.permalink),
  };
}

// The post's JSON address: its path and query (sort, context), plus .json. Always
// with a sort: without one reddit uses the subreddit's suggested sort (r/Brooklyn's
// is New), while Sort by says Best
export function threadUrl(path: string, search: string) {
  const query = new URLSearchParams(search);
  const asked = query.get('sort');
  if (!asked || !(asked in COMMENT_SORTS)) query.set('sort', 'confidence');
  query.set('raw_json', '1');
  query.set('sr_detail', '1');
  return `${path.replace(/\/$/, '')}/.json?${query}`;
}

export const fetchThread = async (path: string, search: string) => readThread(await fetchJson<RedditThread>(threadUrl(path, search)));

// A "more"'s comments: the page of the comment they're under (the post's,
// for the post's), as many as reddit sends (500), in the same order; those
// of the "more" in its place, and a "more" for any still not sent
export const MORE_LIMIT = 500;

export function moreUrl(more: More, sort: string, thread: string) {
  const under = more.parent.startsWith('t1_') ? `${thread.replace(/\/$/, '')}/${more.parent.slice(3)}/` : thread;
  return threadUrl(under, `?sort=${encodeURIComponent(sort)}&limit=${MORE_LIMIT}`);
}

// Of the replies on the page, those the "more" stood for (with theirs), and a "more" for the rest
export function readMore(more: More, page: Reply[]): Reply[] {
  const replies = more.parent.startsWith('t1_') ? (page.find((reply) => reply.id === more.parent) as Comment | undefined)?.replies ?? [] : page;
  const wanted = new Set(more.children);
  const found = replies.filter((reply): reply is Comment => reply.kind === 'comment' && wanted.has(reply.id.slice(3)));
  const sent = new Set<string>();
  const count = (reply: Reply) => {
    if (reply.kind === 'more') reply.children.forEach((id) => sent.add(id));
    else { sent.add(reply.id.slice(3)); reply.replies.forEach(count); }
  };
  found.forEach(count);
  const left = more.children.filter((id) => !sent.has(id));
  if (left.length === more.children.length) throw new Error('reddit didn’t send them');
  return [...found, ...(left.length ? [{ ...more, children: left, count: Math.max(more.count - sent.size, left.length) }] : [])];
}

export async function fetchMore(more: More, sort: string, thread: string) {
  const page = readThread(await fetchJson<RedditThread>(moreUrl(more, sort, thread)));
  return readMore(more, page.comments);
}
