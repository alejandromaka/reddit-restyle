/* Takes over a page: removes reddit's CSS and every script of reddit's.
   While the HTML parses, an observer sees each element before its script
   runs, so reddit's scripts never run (ads and trackers included): ours draws
   the whole page. */

import { pageOf, type PageName } from './pages';

export interface Shell {
  readonly page: PageName;
  ready(callback: () => void): void;  // once the HTML is parsed
  mount(): HTMLElement;               // reddit's markup out, our root in its place
  reveal(): void;                     // the page is hidden until ours is drawn
}

const SAFETY = 3000;  // ms: the page shows by then, drawn or not

// Reddit's: every script, style and stylesheet (or preload) that isn't ours
function isReddits(node: Node) {
  if (node instanceof HTMLScriptElement || node instanceof HTMLStyleElement) return !node.hasAttribute('data-restyle');
  return node instanceof HTMLLinkElement && /(^|\s)(stylesheet|preload|modulepreload)(\s|$)/i.test(node.rel);
}

function block(nodes: Iterable<Node>) {
  for (const node of nodes) {
    if (!isReddits(node)) continue;
    if (node instanceof HTMLScriptElement) node.type = 'javascript/blocked';  // a type that never runs
    (node as Element).remove();
  }
}

// old.reddit.com's viewport is a desktop's: the phone's width instead
function fitViewport() {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = Object.assign(document.createElement('meta'), { name: 'viewport' });
    document.head.append(meta);
  }
  meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
}

export function takeOver(): Shell | undefined {
  const page = pageOf(location.pathname);
  if (!page) return undefined;
  const html = document.documentElement;
  html.dataset.restyle = page;

  // Hidden until ours is drawn: no flash of reddit's markup
  const show = () => html.style.removeProperty('visibility');
  html.style.visibility = 'hidden';
  setTimeout(show, SAFETY);

  // What's parsed already, then each element as the parser adds it
  block(document.querySelectorAll('script, style, link'));
  const observer = new MutationObserver((records) => {
    for (const record of records) block(record.addedNodes);
  });
  observer.observe(html, { childList: true, subtree: true });

  const waiting: (() => void)[] = [];
  function onParsed() {
    block(document.querySelectorAll('script, style, link'));
    fitViewport();
    for (const callback of waiting.splice(0)) callback();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onParsed, { once: true });
  else queueMicrotask(onParsed);

  return {
    page,
    ready(callback) {
      if (document.readyState === 'loading') waiting.push(callback);
      else callback();
    },
    mount() {
      const root = document.createElement('div');
      document.body.replaceChildren(root);
      return root;
    },
    reveal: show,
  };
}
