/* A post's page: its address with .json added (raw_json=1; sr_detail=1:
   its subreddit's icon; sort: the comments' order) answers [the post (a
   Listing of one t3), its comments (a Listing of t1s, each with its replies,
   and "more" for those not sent)]. The ones not sent come from
   /api/morechildren.json, a hundred at a time, flat (each names its parent).
   Read into our types, only what we draw. */

import type { Vote } from '../../account/contract';
import { fetchJson } from '../../core/http';
import { clean } from '../../core/html';
import { plain } from '../../core/text';
import { BIG_WIDTH, readPost, type Post, type RedditPost } from '../listing/contract';

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
interface RedditMoreChildren {
  json: { errors: string[][]; data?: { things: RedditThing[] } };
}

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

const voteOf = (likes: boolean | null | undefined): Vote => (likes === null || likes === undefined ? 0 : likes ? 1 : -1);

export function readComment(data: RedditComment): Comment {
  return {
    kind: 'comment',
    id: data.name,
    author: data.author,
    html: clean(data.body_html),
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

// morechildren's answer, flat, as a tree: each under its parent, the rest where the "more" was
export function readMore(things: RedditThing[], thread: string): Reply[] {
  const top: Reply[] = [];
  const byId = new Map<string, Comment>();
  for (const thing of things) {
    const [reply] = readReplies([thing], thread);
    if (!reply) continue;
    const parent = reply.kind === 'comment' ? (thing.data as RedditComment).parent_id : reply.parent;
    (byId.get(parent)?.replies ?? top).push(reply);
    if (reply.kind === 'comment') byId.set(reply.id, reply);
  }
  return top;
}

// The post's JSON address: its path and query (sort, context), plus .json
export function threadUrl(path: string, search: string) {
  const query = new URLSearchParams(search);
  query.set('raw_json', '1');
  query.set('sr_detail', '1');
  return `${path.replace(/\/$/, '')}/.json?${query}`;
}

export const fetchThread = async (path: string, search: string) => readThread(await fetchJson<RedditThread>(threadUrl(path, search)));

// The next comments of a "more": a hundred at most (reddit's limit)
export const MORE_AT_ONCE = 100;

export function moreUrl(post: string, children: string[], sort: string) {
  const query = new URLSearchParams({ api_type: 'json', raw_json: '1', link_id: post, children: children.slice(0, MORE_AT_ONCE).join(','), sort });
  return `/api/morechildren.json?${query}`;
}

export async function fetchMore(post: string, children: string[], sort: string, thread: string) {
  const answer = await fetchJson<RedditMoreChildren>(moreUrl(post, children, sort));
  if (answer.json.errors.length) throw new Error(answer.json.errors.map((error) => error[1] ?? error[0]).join('; '));
  return readMore(answer.json.data?.things ?? [], thread);
}
