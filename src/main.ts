/* Reddit Restyle: old.reddit.com rebuilt for the iPhone mini.

   shell/       which page this is; reddit's CSS and scripts removed
   core/        store, network, text
   components/  our UI pieces
   pages/       one folder per page: contract (reddit's data), reducer, effects, views

   A page's set-up runs at document start, so its request for reddit's JSON
   goes out while reddit's HTML is still loading; it draws once the HTML is
   parsed (Shell.ready). */

import { setUpListing } from './pages/listing';
import { takeOver, type Shell } from './shell/blocker';
import { bail, skipThisLoad } from './shell/gate';
import type { PageName } from './shell/pages';

const SET_UP: Record<PageName, (shell: Shell) => unknown> = {
  listing: setUpListing,
};

function start() {
  const shell = takeOver();
  if (!shell) return;
  const style = document.createElement('style');
  style.dataset.restyle = '';  // ours: the blocker keeps it
  style.textContent = __CSS__;
  document.documentElement.append(style);
  // iOS only applies :active (our pressed look) once the page listens for touches
  document.addEventListener('touchstart', () => {}, { passive: true });
  // Anything unexpected while setting up ours: reddit's own page instead
  try {
    SET_UP[shell.page](shell);
  } catch (error) {
    bail(`${shell.page}: ${error}`);
  }
}

if (!skipThisLoad()) {
  // At document start <html> may not exist yet
  if (document.documentElement) start();
  else {
    new MutationObserver((_, waiting) => {
      if (!document.documentElement) return;
      waiting.disconnect();
      start();
    }).observe(document, { childList: true });
  }
}
