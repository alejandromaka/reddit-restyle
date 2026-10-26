/* Reddit Restyle: old.reddit.com rebuilt for the iPhone mini.

   shell/       which page this is; reddit's CSS and scripts removed
   core/        store, network, text
   components/  our UI pieces
   pages/       one folder per page: contract (reddit's data), reducer, effects, views

   A page's set-up runs at document start, so its request for reddit's JSON
   goes out while reddit's HTML is still loading; it draws once the HTML is
   parsed (Shell.ready). Pages we don't draw are left as they come: without
   old reddit's code (Reddit Blocker) they break, on purpose, so what's
   missing shows. Nothing redirects, nothing falls back. */

import { startTheme } from './core/theme';
import { setUpListing } from './pages/listing';
import { setUpPost } from './pages/post';
import { setUpProfile } from './pages/profile';
import { takeOver, type Shell } from './shell/blocker';
import { pageOf, type PageName } from './shell/pages';

const SET_UP: Record<PageName, (shell: Shell) => unknown> = {
  listing: setUpListing,
  post: setUpPost,
  profile: setUpProfile,
};

function start(page: PageName) {
  // Already restyled: the loader's build and this one both installed
  if (document.documentElement.dataset.restyle) return;
  const shell = takeOver(page);
  startTheme();  // light or dark, before anything's drawn
  const style = document.createElement('style');
  style.dataset.restyle = '';  // ours: the blocker keeps it
  style.textContent = __CSS__;
  document.documentElement.append(style);
  // iOS only applies :active (our pressed look) once the page listens for touches
  document.addEventListener('touchstart', () => {}, { passive: true });
  SET_UP[page](shell);
}

const page = pageOf(location.pathname);
if (page) {
  // At document start <html> may not exist yet
  if (document.documentElement) start(page);
  else {
    new MutationObserver((_, waiting) => {
      if (!document.documentElement) return;
      waiting.disconnect();
      start(page);
    }).observe(document, { childList: true });
  }
}
