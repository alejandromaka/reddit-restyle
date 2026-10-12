/* Reddit Restyle: old.reddit.com rebuilt for the iPhone mini.

   shell/       which page this is; reddit's CSS and scripts removed; www for the rest
   core/        store, network, text
   components/  our UI pieces
   pages/       one folder per page: contract (reddit's data), reducer, effects, views

   A page's set-up runs at document start, so its request for reddit's JSON
   goes out while reddit's HTML is still loading; it draws once the HTML is
   parsed (Shell.ready). Pages we don't draw go to www. */

import { setUpListing } from './pages/listing';
import { takeOver, type Shell } from './shell/blocker';
import { pageOf, type PageName } from './shell/pages';
import { toWww } from './shell/www';

const SET_UP: Record<PageName, (shell: Shell) => unknown> = {
  listing: setUpListing,
};

function start(page: PageName) {
  const shell = takeOver(page);
  const style = document.createElement('style');
  style.dataset.restyle = '';  // ours: the blocker keeps it
  style.textContent = __CSS__;
  document.documentElement.append(style);
  // iOS only applies :active (our pressed look) once the page listens for touches
  document.addEventListener('touchstart', () => {}, { passive: true });
  SET_UP[page](shell);
}

const page = pageOf(location.pathname);
if (!page) toWww();
// At document start <html> may not exist yet
else if (document.documentElement) start(page);
else {
  new MutationObserver((_, waiting) => {
    if (!document.documentElement) return;
    waiting.disconnect();
    start(page);
  }).observe(document, { childList: true });
}
