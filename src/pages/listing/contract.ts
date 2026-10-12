/* reddit's listing: the page's own address with .json added (raw_json=1:
   URLs not HTML-escaped). A Listing of t3 things (posts); `after` names the
   last one, for the next page. Pure: read into our Post, only what we draw. */

import { fetchJson } from '../../core/http';

// The parts of a t3 (post) we use, as reddit sends them
interface RedditImage { url: string; width: number; height: number }
interface RedditPost {
  name: string;  // t3_…
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  domain: string;
  url: string;
  is_self: boolean;
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  link_flair_text: string | null;
  preview?: { images?: { source: RedditImage; resolutions: RedditImage[] }[] };
}
interface RedditListing {
  kind: 'Listing';
  data: { after: string | null; children: { kind: string; data: RedditPost }[] };
}

export interface Image { url: string; width: number; height: number }

export interface Post {
  id: string;              // t3_…
  title: string;
  subreddit: string;       // without r/
  author: string;
  score: number;
  comments: number;
  created: number;         // seconds since 1970
  permalink: string;       // /r/…/comments/…
  domain: string;
  link: string | null;     // where a link post goes; null for a text post
  image: Image | null;     // its preview, wide enough for a phone; none for NSFW or spoilers
  nsfw: boolean;
  spoiler: boolean;
  pinned: boolean;
  flair: string | null;
}

export interface Listing {
  posts: Post[];
  after: string | null;
}

// A phone's width at 2x: the smallest preview at least this wide (else the original)
const IMAGE_WIDTH = 640;

function previewOf(post: RedditPost): Image | null {
  const image = post.preview?.images?.[0];
  if (!image || post.over_18 || post.spoiler) return null;
  return image.resolutions.find(({ width }) => width >= IMAGE_WIDTH) ?? image.source;
}

export function readPost(post: RedditPost): Post {
  return {
    id: post.name,
    title: post.title,
    subreddit: post.subreddit,
    author: post.author,
    score: post.score,
    comments: post.num_comments,
    created: post.created_utc,
    permalink: post.permalink,
    domain: post.domain,
    link: post.is_self ? null : post.url,
    image: previewOf(post),
    nsfw: post.over_18,
    spoiler: post.spoiler,
    pinned: post.stickied,
    flair: post.link_flair_text || null,
  };
}

export function readListing(answer: RedditListing): Listing {
  return {
    posts: answer.data.children.filter(({ kind }) => kind === 't3').map(({ data }) => readPost(data)),
    after: answer.data.after,
  };
}

// The listing's JSON address: the page's path and query, plus .json (and, for more, after=)
export function listingUrl(path: string, search: string, after?: string) {
  const query = new URLSearchParams(search);
  query.set('raw_json', '1');
  if (after) query.set('after', after);
  return `${path.replace(/\/$/, '')}/.json?${query}`;
}

export const fetchListing = async (path: string, search: string, after?: string) =>
  readListing(await fetchJson<RedditListing>(listingUrl(path, search, after)));
