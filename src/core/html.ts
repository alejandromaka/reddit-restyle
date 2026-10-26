/* reddit's rendered markdown (a post's selftext_html, a comment's body_html),
   rebuilt safe and ours: only the tags markdown makes, each given our
   utility classes; links only to http(s) and reddit's own paths (any
   other: its words, unlinked); nothing
   else (no scripts, styles, handlers, reddit's classes). A spoiler (reddit's
   md-spoiler-text) stays hidden until tapped (data-spoiler:
   components/markdown.tsx). A comment's link to a picture shows the picture
   (under the link's words, if it has any besides its address), loaded only
   as it nears the screen; a tap opens it big (data-picture). A gif with a
   video of itself (reddit's, Giphy's, imgur's .gifv: a fraction of the
   gif's size) is that video, muted and looping, which loads and plays only
   while on screen (data-src: components/markdown.tsx). reddit's markdown for
   a comment's media, left as written (![gif](giphy|id), ![img](id)), shows it
   too. Built in a document of its own, so nothing loads while it's built. */

const SPOILER = 'rr-rounded-sm rr-bg-neutral-content-strong rr-text-transparent';  // hidden until tapped

const TAGS: Record<string, string> = {
  p: '',
  br: '',
  hr: 'rr-border-b rr-border-neutral-border-weak',
  a: 'rr-text-a-default rr-underline',
  strong: 'rr-font-bold',
  b: 'rr-font-bold',
  em: 'rr-italic',
  i: 'rr-italic',
  del: 'rr-line-through',
  s: 'rr-line-through',
  sup: '',
  sub: '',
  code: 'rr-px-1 rr-rounded-sm rr-bg-secondary-background rr-font-mono rr-text-xs',
  pre: 'rr-p-3 rr-rounded-sm rr-bg-secondary-background rr-overflow-x-auto rr-font-mono rr-text-xs',
  blockquote: 'rr-grid rr-gap-2 rr-pl-3 rr-border-l-4 rr-border-neutral-border-medium rr-text-neutral-content-weak',
  ul: 'rr-grid rr-gap-1 rr-pl-6 rr-list-disc',
  ol: 'rr-grid rr-gap-1 rr-pl-6 rr-list-decimal',
  li: '',
  h1: 'rr-font-bold',
  h2: 'rr-font-bold',
  h3: 'rr-font-bold',
  h4: 'rr-font-bold',
  h5: 'rr-font-bold',
  h6: 'rr-font-bold',
  table: 'rr-block rr-overflow-x-auto rr-text-xs',
  thead: '',
  tbody: '',
  tr: '',
  th: 'rr-px-2 rr-py-1 rr-font-semibold',
  td: 'rr-px-2 rr-py-1 rr-border-t rr-border-neutral-border-weak',
};
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript']);  // nor what's in them
const LINK = /^(https?:\/\/|\/)/i;
const IMAGE = /^https:\/\/[^?#]+\.(?:jpe?g|png|gif|webp)(?:[?#]|$)/i;  // a link to a picture file
const GIFV = /^https:\/\/i\.imgur\.com\/(\w+)\.gifv(?:[?#]|$)/i;        // imgur's gif, as a page
const GIPHY = /^https:\/\/(?:(?:media\d*|i)\.giphy\.com\/media\/(?:v1\.\w+\/)?(\w+)|(?:www\.)?giphy\.com\/gifs\/(?:[\w-]*-)?(\w+))/i;
const MEDIA = /!\[(?:img|gif)\]\(((?:giphy\|)?[\w-]+)(?:\|[\w-]+)?\)/;  // reddit's markdown for a comment's media: ![gif](giphy|id|size), ![img](id)
const WRITTEN = /(!\[(?:img|gif)\]\((?:giphy\|)?[\w-]+(?:\|[\w-]+)?\))/;  // …to split text by
const BARE = /^(?:https?:\/\/\S*|<?(?:image|img|gif)>?)$/i;  // a link's words that say nothing: its address, or what old reddit writes for media
const PICTURE = 'rr-block rr-max-w-full rr-h-auto rr-max-h-64 rr-object-contain rr-object-left';  // as wide as it is, at most the comment's, not too tall

// A picture to show for a link: the one to load (a gif's video: its still, ''
// none), its size (0: as it comes), the one to open big; a gif, its video
export interface Picture { url: string; width: number; height: number; big: string; video?: string }
// The pictures reddit knows (a comment's media_metadata), by link or by id: sized, and smaller than the link's
export type Pictures = (ref: string) => Picture | null;

// A Giphy gif's id, from a link to it (its page, or the gif)
export const giphyOf = (href: string) => {
  const found = GIPHY.exec(href);
  return found ? found[1] ?? found[2]! : null;
};

let inert: Document | null = null;  // where it's built: nothing in it loads

// pictures: a comment's (else its links stay links)
export function clean(html: string, pictures?: Pictures): string {
  inert ??= document.implementation.createHTMLDocument('');
  const target = inert.createElement('div');
  copy(new DOMParser().parseFromString(html, 'text/html').body, target, pictures);
  return target.innerHTML;
}

// A link's picture, if it is one: as reddit knows it, else from where it's
// from (Giphy's and imgur's gifs, as their videos; any picture file), as it comes
function pictureOf(href: string, pictures: Pictures): Picture | null {
  const known = pictures(href);
  if (known) return known;
  const giphy = giphyOf(href);
  if (giphy) return { url: `https://media.giphy.com/media/${giphy}/giphy_s.gif`, width: 0, height: 0, big: `https://media.giphy.com/media/${giphy}/giphy.gif`, video: `https://media.giphy.com/media/${giphy}/giphy.mp4` };  // its still (Giphy's): shown until it plays, or if it can't
  const gifv = GIFV.exec(href)?.[1];
  if (gifv) return { url: `https://i.imgur.com/${gifv}l.jpg`, width: 0, height: 0, big: `https://i.imgur.com/${gifv}.gif`, video: `https://i.imgur.com/${gifv}.mp4` };
  return IMAGE.test(href) ? { url: href, width: 0, height: 0, big: href } : null;
}

function show(picture: Picture, href: string, to: Node) {
  const made = to.ownerDocument!;
  const link = made.createElement('a');
  link.className = 'rr-block rr-w-fit rr-max-w-full active:rr-opacity-100';  // a tap on the picture, not beside it; no dimming
  link.setAttribute('href', href);
  link.setAttribute('rel', 'noopener noreferrer');
  link.setAttribute('data-picture', picture.big);
  const image = made.createElement(picture.video ? 'video' : 'img');
  image.className = PICTURE;
  if (picture.video) {  // nothing yet: its video (and still) when it nears the screen
    image.setAttribute('data-src', picture.video);
    if (picture.url) image.setAttribute('data-poster', picture.url);
    for (const flag of ['muted', 'loop', 'playsinline']) image.setAttribute(flag, '');
    image.setAttribute('preload', 'none');
    image.setAttribute('aria-label', 'GIF');
  } else {
    image.setAttribute('loading', 'lazy');  // first: it waits to load until it nears the screen
    image.setAttribute('decoding', 'async');
    image.setAttribute('alt', '');
  }
  if (picture.width && picture.height) {  // its room, before it comes
    image.setAttribute('width', String(picture.width));
    image.setAttribute('height', String(picture.height));
  }
  if (!picture.video) image.setAttribute('src', picture.url);
  link.appendChild(image);
  to.appendChild(link);
}

// Text with reddit's markdown for media in it: each shown, if it's known (else as written)
function written(text: string, to: Node, pictures: Pictures) {
  const made = to.ownerDocument!;
  text.split(WRITTEN).forEach((part, index) => {
    const ref = index % 2 ? MEDIA.exec(part)?.[1] : undefined;  // the odd ones: what split it
    const picture = ref ? pictureOf(ref.startsWith('giphy|') ? `https://giphy.com/gifs/${ref.slice(6)}` : ref, pictures) : null;
    if (picture) show(picture, picture.big, to);
    else if (part) to.appendChild(made.createTextNode(part));
  });
}

function copy(from: Node, to: Node, pictures?: Pictures) {
  const made = to.ownerDocument!;
  for (const node of from.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (pictures && WRITTEN.test(text)) written(text, to, pictures);
      else to.appendChild(made.createTextNode(text));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;  // comments (reddit's SC_OFF/SC_ON)
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (DROPPED.has(tag)) continue;
    if (tag === 'span' && element.classList.contains('md-spoiler-text')) {
      const spoiler = made.createElement('span');
      spoiler.className = SPOILER;
      spoiler.setAttribute('data-spoiler', '');
      copy(element, spoiler, pictures);
      to.appendChild(spoiler);
      continue;
    }
    const classes = TAGS[tag];
    const href = tag === 'a' ? element.getAttribute('href') ?? '' : null;
    // a tag markdown doesn't make (reddit's <div class="md">, …), a link to elsewhere: its contents only
    if (classes === undefined || (href !== null && !LINK.test(href))) {
      copy(element, to, pictures);
      continue;
    }
    const picture = href && pictures ? pictureOf(href, pictures) : null;
    const words = element.textContent?.trim() ?? '';
    if (picture && (!words || BARE.test(words))) {  // just its address (or "<image>"): the picture in its place
      show(picture, href!, to);
      continue;
    }
    const clone = made.createElement(tag);
    if (classes) clone.className = classes;
    if (href) {
      clone.setAttribute('href', href);
      clone.setAttribute('rel', 'noopener noreferrer');
    }
    copy(element, clone, pictures);
    to.appendChild(clone);
    if (picture) show(picture, href!, to);  // its words, then the picture
  }
}
