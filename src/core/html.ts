/* reddit's rendered markdown (a post's selftext_html, a comment's body_html),
   rebuilt safe and ours: only the tags markdown makes, each given our
   utility classes; links only to http(s) and reddit's own paths (any
   other: its words, unlinked); nothing
   else (no scripts, styles, handlers, reddit's classes). A spoiler (reddit's
   md-spoiler-text) stays hidden until tapped (data-spoiler:
   components/markdown.tsx). */

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

export function clean(html: string): string {
  const target = document.createElement('div');
  copy(new DOMParser().parseFromString(html, 'text/html').body, target);
  return target.innerHTML;
}

function copy(from: Node, to: Node) {
  for (const node of from.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      to.appendChild(document.createTextNode(node.textContent ?? ''));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;  // comments (reddit's SC_OFF/SC_ON)
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (DROPPED.has(tag)) continue;
    if (tag === 'span' && element.classList.contains('md-spoiler-text')) {
      const spoiler = document.createElement('span');
      spoiler.className = SPOILER;
      spoiler.setAttribute('data-spoiler', '');
      copy(element, spoiler);
      to.appendChild(spoiler);
      continue;
    }
    const classes = TAGS[tag];
    const href = tag === 'a' ? element.getAttribute('href') ?? '' : null;
    // a tag markdown doesn't make (reddit's <div class="md">, …), a link to elsewhere: its contents only
    if (classes === undefined || (href !== null && !LINK.test(href))) {
      copy(element, to);
      continue;
    }
    const clone = document.createElement(tag);
    if (classes) clone.className = classes;
    if (href) {
      clone.setAttribute('href', href);
      clone.setAttribute('rel', 'noopener noreferrer');
    }
    copy(element, clone);
    to.appendChild(clone);
  }
}
