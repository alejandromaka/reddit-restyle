/* reddit's listing: the page's own address with .json added (raw_json=1:
   URLs not HTML-escaped). A Listing of t3 things (posts); `after` names the
   last one, for the next page. Pure: read into our Post, only what we draw. */

import { fetchJson } from '../../core/http';
import { plain } from '../../core/text';

// The parts of a t3 (post) we use, as reddit sends them
interface RedditImage { url: string; width: number; height: number }
interface RedditSize { u: string; x: number; y: number }
interface RedditMedia {  // a gallery's picture: p, its sizes (smallest first); s, the original (no u when it's animated)
  status: string;  // 'valid' once processed
  p?: RedditSize[];
  s?: Omit<RedditSize, 'u'> & { u?: string };
}
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
  selftext: string;  // markdown; '' when there's none
  is_self: boolean;
  is_video?: boolean;
  is_gallery?: boolean;
  post_hint?: string;  // 'image', 'hosted:video', 'rich:video', 'link', …
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  link_flair_text: string | null;
  preview?: { images?: { source: RedditImage; resolutions: RedditImage[] }[] };
  gallery_data?: { items: { media_id: string }[] };
  media_metadata?: Record<string, RedditMedia>;
  crosspost_parent_list?: RedditPost[];  // a crosspost: the post it shares
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
  link: string | null;     // where a link post goes, off reddit; null for text and reddit's own media
  // Its preview (a crosspost's from the post it shares; none for NSFW or spoilers):
  image: Image | null;     // a photo, a video's poster, a gallery's first, a link's card; wide enough for a phone
  video: boolean;          // the image is a video's poster
  gallery: number;         // a gallery's pictures; 0 when it isn't one
  text: string | null;     // with no image: a text post's opening, plain
  nsfw: boolean;
  spoiler: boolean;
  pinned: boolean;
  flair: string | null;
}

export interface Listing {
  posts: Post[];
  after: string | null;
}

// A phone's width at 2x: the smallest size at least this wide (else the largest)
const IMAGE_WIDTH = 640;
const pick = (sizes: Image[]) => sizes.find(({ width }) => width >= IMAGE_WIDTH) ?? sizes.at(-1) ?? null;

const sized = ({ u, x, y }: RedditSize): Image => ({ url: u, width: x, height: y });

function galleryOf(post: RedditPost): Image[] {
  const { gallery_data: data, media_metadata: media } = post;
  if (!post.is_gallery || !data || !media) return [];
  return data.items.flatMap(({ media_id }) => {
    const picture = media[media_id];
    if (picture?.status !== 'valid') return [];
    const { p = [], s } = picture;
    const image = pick([...p, ...(s?.u ? [{ ...s, u: s.u }] : [])].map(sized));
    return image ? [image] : [];
  });
}

function imageOf(post: RedditPost): Image | null {
  const image = post.preview?.images?.[0];
  return image ? pick([...image.resolutions, image.source]) : null;
}

// Enough of a text post to fill its lines
const TEXT_LENGTH = 300;

export function readPost(post: RedditPost): Post {
  const shared = post.crosspost_parent_list?.[0] ?? post;
  const hidden = post.over_18 || post.spoiler;
  const gallery = galleryOf(shared);
  const image = hidden ? null : gallery[0] ?? imageOf(shared);
  const offReddit = !shared.is_self && !/(^|\.)(redd\.it|reddit\.com)$/.test(shared.domain);
  return {
    id: post.name,
    title: post.title,
    subreddit: post.subreddit,
    author: post.author,
    score: post.score,
    comments: post.num_comments,
    created: post.created_utc,
    permalink: post.permalink,
    domain: shared.domain,
    link: offReddit ? shared.url : null,
    image,
    video: Boolean(shared.is_video) || shared.post_hint === 'hosted:video' || shared.post_hint === 'rich:video',
    gallery: gallery.length,
    text: hidden || image ? null : plain(shared.selftext).slice(0, TEXT_LENGTH) || null,
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
