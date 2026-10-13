/* reddit's profiles: /user/name/about.json, a t2 (who they are: their
   avatar, their profile's banner and bio, karma, since when, followers), and
   /user/name/[tab]/.json, a Listing of their posts (t3) and comments (t1),
   a page at a time as a subreddit's (listingUrl). Read into our types, only
   what we draw. */

import { voteOf, type Vote } from '../../account/contract';
import { fetchJson } from '../../core/http';
import { clean } from '../../core/html';
import { iconOf } from '../../nav/contract';
import { listingUrl, readPost, type Post, type RedditPost } from '../listing/contract';

// The parts of a t2 we use, as reddit sends them (a suspended account: its name, is_suspended, little else)
interface RedditUser {
  kind: 't2';
  data: {
    name: string;
    icon_img?: string;       // their avatar, round (raw_json=1: unescaped)
    snoovatar_img?: string;  // their whole snoo; '' when none
    total_karma?: number;
    link_karma?: number;
    comment_karma?: number;
    created_utc?: number;
    is_suspended?: boolean;
    subreddit?: {            // their profile, a subreddit of its own
      title: string;         // their display name; '' when none
      public_description: string;
      banner_img: string;    // '' when none
      subscribers: number;   // their followers
    } | null;
  };
}

// The parts of a t1 we use, in someone's listing: the comment, and the post it's on
interface RedditUserComment {
  name: string;             // t1_…
  author: string;
  body_html: string;
  score: number;
  score_hidden: boolean;
  likes: boolean | null;
  created_utc: number;
  subreddit: string;
  link_title: string;
  link_permalink: string;   // the post's, whole (https://www.reddit.com/r/…)
  permalink: string;        // the comment's: its thread, from it (/r/…/comments/…/…/id/)
  sr_detail?: { community_icon?: string; icon_img?: string };  // its subreddit's, when reddit sends it (sr_detail=1)
}

interface RedditUserListing {
  kind: 'Listing';
  data: {
    after: string | null;
    before: string | null;
    children: { kind: string; data: unknown }[];  // t3: a RedditPost; t1: a RedditUserComment
  };
}

export interface User {
  name: string;
  label: string;            // their display name, else their name
  icon: string | null;
  banner: string | null;
  bio: string | null;
  karma: number;
  followers: number | null;
  created: number | null;   // since when (seconds)
  suspended: boolean;
}

export interface UserComment {
  id: string;
  author: string;
  html: string;             // cleaned
  score: number;
  scoreHidden: boolean;
  vote: Vote;               // yours
  created: number;
  subreddit: string;
  subredditIcon: string | null;
  postTitle: string;
  postPath: string;         // the post's page, here
  permalink: string;        // its thread, from it
}

export type Item = { kind: 'post'; post: Post } | { kind: 'comment'; comment: UserComment };

export interface Items {
  items: Item[];
  after: string | null;
  before: string | null;
}

export function readUser({ data }: RedditUser): User {
  const profile = data.subreddit ?? null;
  return {
    name: data.name,
    label: profile?.title || data.name,
    icon: data.icon_img || data.snoovatar_img || null,
    banner: profile?.banner_img || null,
    bio: profile?.public_description || null,
    karma: data.total_karma ?? (data.link_karma ?? 0) + (data.comment_karma ?? 0),
    followers: profile ? profile.subscribers : null,
    created: data.created_utc ?? null,
    suspended: Boolean(data.is_suspended),
  };
}

// A whole reddit address (www.reddit.com's) as one here: its path
const here = (url: string) => new URL(url, 'https://old.reddit.com').pathname;

export function readComment(data: RedditUserComment): UserComment {
  return {
    id: data.name,
    author: data.author,
    html: clean(data.body_html),
    score: data.score,
    scoreHidden: data.score_hidden,
    vote: voteOf(data.likes),
    created: data.created_utc,
    subreddit: data.subreddit,
    subredditIcon: data.sr_detail ? iconOf(data.sr_detail) : null,
    postTitle: data.link_title,
    postPath: here(data.link_permalink),
    permalink: data.permalink,
  };
}

export function readItems({ data }: RedditUserListing): Items {
  const items = data.children.flatMap((child): Item[] => {
    if (child.kind === 't3') return [{ kind: 'post', post: readPost(child.data as RedditPost) }];
    if (child.kind === 't1') return [{ kind: 'comment', comment: readComment(child.data as RedditUserComment) }];
    return [];
  });
  return { items, after: data.after, before: data.before };
}

// A tab's address: overview is the profile's own; a sort (new: none) and its span in the query
export function tabPath(name: string, tab: string, sort?: string, time?: string | null) {
  const path = tab === 'overview' ? `/user/${name}/` : `/user/${name}/${tab}/`;
  const query = new URLSearchParams();
  if (sort && sort !== 'new') query.set('sort', sort);
  if (sort && time) query.set('t', time);
  const rest = query.toString();
  return rest ? `${path}?${rest}` : path;
}

export const userUrl = (name: string) => `/user/${name}/about.json?raw_json=1`;

export const fetchUser = async (name: string) => readUser(await fetchJson<RedditUser>(userUrl(name)));

export const fetchItems = async (path: string, search: string) => readItems(await fetchJson<RedditUserListing>(listingUrl(path, search)));
