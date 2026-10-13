/* reddit's listing: the page's own address with .json added (raw_json=1:
   URLs not HTML-escaped; sr_detail=1: each post's subreddit's icon; limit:
   a page, core/paging.ts). A Listing of t3 things (posts); `after` names the
   last one, for the next page, `before` the first, for the one before. And a
   subreddit's about.json: its name, icon and members. Read into our types,
   only what we draw. */

import { voteOf, type Vote } from '../../account/contract';
import { fetchJson } from '../../core/http';
import { PAGE_SIZE } from '../../core/paging';
import { plain } from '../../core/text';
import { iconOf } from '../../nav/contract';

// The parts of a t3 (post) we use, as reddit sends them
interface RedditImage { url: string; width: number; height: number }
interface RedditSizes { source: RedditImage; resolutions: RedditImage[] }
interface RedditSize { u: string; x: number; y: number }
interface RedditMedia {  // a gallery's picture: p, its sizes (smallest first); s, the original (no u when it's animated)
  status: string;  // 'valid' once processed
  p?: RedditSize[];
  s?: Omit<RedditSize, 'u'> & { u?: string };
}
export interface RedditPost {
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
  hidden: boolean;                 // you hid it from your listings
  link_flair_text: string | null;
  likes: boolean | null;  // your vote: up, down, none
  preview?: { images?: { source: RedditImage; resolutions: RedditImage[]; variants?: { mp4?: RedditSizes } }[] };  // mp4: a gif, as video
  gallery_data?: { items: { media_id: string }[] };
  media_metadata?: Record<string, RedditMedia>;
  crosspost_parent_list?: RedditPost[];  // a crosspost: the post it shares
  sr_detail?: { community_icon?: string; icon_img?: string };
  secure_media?: { reddit_video?: { hls_url: string } } | null;  // a video reddit hosts: HLS (Safari plays it, with sound)
  selftext_html?: string | null;  // its text, rendered
  locked?: boolean;
  archived?: boolean;
}
interface RedditListing {
  kind: 'Listing';
  data: { after: string | null; before: string | null; children: { kind: string; data: RedditPost }[] };
}

export interface Image { url: string; width: number; height: number }

// What a post shows: a video (reddit's own, or a gif: it plays here), pictures
// (one, or a gallery; each also big, to open), or a link's card (an outside
// video: playable, where it's from)
export type Media =
  | { kind: 'video'; url: string; poster: Image | null; loop: boolean }
  | { kind: 'pictures'; pictures: Image[]; big: Image[] }
  | { kind: 'link'; card: Image; url: string; playable: boolean };

export interface Post {
  id: string;              // t3_…
  title: string;
  subreddit: string;       // without r/
  subredditIcon: string | null;
  author: string;
  score: number;
  vote: Vote;              // yours
  comments: number;
  created: number;         // seconds since 1970
  permalink: string;       // /r/…/comments/…
  domain: string;
  link: string | null;     // where a link post goes, off reddit; null for text and reddit's own media
  // Its preview (a crosspost's from the post it shares; none for spoilers):
  media: Media | null;     // wide enough for a phone
  text: string | null;     // with no media: a text post's opening, plain
  nsfw: boolean;
  spoiler: boolean;
  pinned: boolean;
  hidden: boolean;         // you hid it (reddit's say)
  flair: string | null;
}

export interface Listing {
  posts: Post[];
  after: string | null;   // the next page's start; null: the last page
  before: string | null;  // the page before's end; null: the first page
}

// A phone's width at 2x: the smallest size at least this wide (else the largest)
const IMAGE_WIDTH = 640;
export const BIG_WIDTH = 1080;  // at 3x: a picture opened, and the post page's
const pick = (sizes: Image[], wide: number) => sizes.find(({ width }) => width >= wide) ?? sizes.at(-1) ?? null;

const sized = ({ u, x, y }: RedditSize): Image => ({ url: u, width: x, height: y });

export function galleryOf(post: RedditPost, wide = IMAGE_WIDTH): Image[] {
  const { gallery_data: data, media_metadata: media } = post;
  if (!post.is_gallery || !data || !media) return [];
  return data.items.flatMap(({ media_id }) => {
    const picture = media[media_id];
    if (picture?.status !== 'valid') return [];
    const { p = [], s } = picture;
    const image = pick([...p, ...(s?.u ? [{ ...s, u: s.u }] : [])].map(sized), wide);
    return image ? [image] : [];
  });
}

function imageOf(post: RedditPost, wide: number): Image | null {
  const image = post.preview?.images?.[0];
  return image ? pick([...image.resolutions, image.source], wide) : null;
}

const offReddit = (post: RedditPost) => !post.is_self && !/(^|\.)(redd\.it|reddit\.com)$/.test(post.domain);

function mediaOf(post: RedditPost, wide: number): Media | null {
  const poster = imageOf(post, wide);
  const hls = post.secure_media?.reddit_video?.hls_url;
  if (hls) return { kind: 'video', url: hls, poster, loop: false };
  const gif = post.preview?.images?.[0]?.variants?.mp4;
  const clip = gif && pick([...gif.resolutions, gif.source], wide);
  if (clip) return { kind: 'video', url: clip.url, poster, loop: true };
  const gallery = galleryOf(post, wide);
  if (gallery.length) return { kind: 'pictures', pictures: gallery, big: galleryOf(post, BIG_WIDTH) };
  if (!poster) return null;
  if (offReddit(post) && post.post_hint !== 'image') return { kind: 'link', card: poster, url: post.url, playable: post.post_hint === 'rich:video' };
  return { kind: 'pictures', pictures: [poster], big: [imageOf(post, BIG_WIDTH) ?? poster] };
}

// Enough of a text post to fill its lines
const TEXT_LENGTH = 300;

// wide: its pictures at least this wide (the post page's are bigger)
export function readPost(post: RedditPost, wide = IMAGE_WIDTH): Post {
  const shared = post.crosspost_parent_list?.[0] ?? post;
  const media = post.spoiler ? null : mediaOf(shared, wide);
  return {
    id: post.name,
    title: post.title,
    subreddit: post.subreddit,
    subredditIcon: post.sr_detail ? iconOf(post.sr_detail) : null,
    author: post.author,
    score: post.score,
    vote: voteOf(post.likes),
    comments: post.num_comments,
    created: post.created_utc,
    permalink: post.permalink,
    domain: shared.domain,
    link: offReddit(shared) ? shared.url : null,
    media,
    text: post.spoiler || media ? null : plain(shared.selftext).slice(0, TEXT_LENGTH) || null,
    nsfw: post.over_18,
    spoiler: post.spoiler,
    pinned: post.stickied,
    hidden: post.hidden,
    flair: post.link_flair_text || null,
  };
}

export function readListing(answer: RedditListing): Listing {
  return {
    posts: answer.data.children.filter(({ kind }) => kind === 't3').map(({ data }) => readPost(data)),
    after: answer.data.after,
    before: answer.data.before,
  };
}

// The listing's JSON address: the page's path and query (where it starts: count, after or before), plus .json, a page's worth
export function listingUrl(path: string, search: string) {
  const query = new URLSearchParams(search);
  query.set('raw_json', '1');
  query.set('sr_detail', '1');
  query.set('limit', String(PAGE_SIZE));
  return `${path.replace(/\/$/, '')}/.json?${query}`;
}

export const fetchListing = async (path: string, search: string) =>
  readListing(await fetchJson<RedditListing>(listingUrl(path, search)));


// A subreddit's about.json: a t5 thing
interface RedditAbout {
  kind: 't5';
  data: {
    display_name: string;
    display_name_prefixed: string;
    subscribers: number;
    user_is_subscriber: boolean | null;  // null when you're signed out
    community_icon?: string;
    icon_img?: string;
    mobile_banner_image?: string;        // its hero image, sized for phones
    banner_background_image?: string;
    banner_img?: string;                 // old reddit's
    banner_background_color?: string;
    key_color?: string;
    primary_color?: string;
  };
}

export interface About {
  name: string;            // soccer: for joining and leaving
  label: string;           // r/soccer, as the subreddit writes it
  icon: string | null;
  banner: string | null;   // its banner
  color: string | null;    // without one, its color
  members: number;
  joined: boolean;
}

export const readAbout = ({ data }: RedditAbout): About => ({
  name: data.display_name,
  label: data.display_name_prefixed,
  icon: iconOf(data),
  banner: data.mobile_banner_image || data.banner_background_image || data.banner_img || null,
  color: data.banner_background_color || data.key_color || data.primary_color || null,
  members: data.subscribers,
  joined: Boolean(data.user_is_subscriber),
});

export const aboutUrl = (subreddit: string) => `/r/${subreddit}/about.json?raw_json=1`;

export const fetchAbout = async (subreddit: string) => readAbout(await fetchJson<RedditAbout>(aboutUrl(subreddit)));
