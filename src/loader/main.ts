/* Reddit Restyle Loader: installed once, it runs the build it keeps (in the
   Userscripts app's storage) and never fetches on its own. A new build comes
   only when you ask for it:

   - Update Reddit Restyle in your account menu (the restyle's own),
   - any old.reddit.com address with #restyle-update on the end (works even
     when the kept build is broken),
   - the Userscripts menu's Update Reddit Restyle, where the app has one,
   - with no build kept yet, the Install button it puts on the page.

   The build runs here, in the userscript's own world, not the page's: the
   page's Content Security Policy doesn't apply. Should Safari refuse it here,
   it goes in the page as a script instead (ours: the restyle keeps it). */

import { pageOf } from '../shell/pages';
import { LOADER_ATTRIBUTE, UPDATE_EVENT, versionOf } from './contract';

const CODE = 'code';
const HASH = '#restyle-update';
const TIMEOUT = 30_000;  // ms

// Once <html> exists (at document start it may not yet)
function withRoot(callback: (html: HTMLElement) => void) {
  if (document.documentElement) return callback(document.documentElement);
  new MutationObserver((_, waiting) => {
    if (!document.documentElement) return;
    waiting.disconnect();
    callback(document.documentElement);
  }).observe(document, { childList: true });
}

function run(code: string) {
  let build: () => void;
  try {
    build = new Function(code) as () => void;
  } catch (error) {
    if (!(error instanceof EvalError)) throw error;
    withRoot((html) => {
      const script = document.createElement('script');
      script.dataset.restyle = '';  // ours: the restyle doesn't remove it
      script.textContent = code;
      html.append(script);
      script.remove();
    });
    return;
  }
  build();
}

// A line on the page, at the bottom, for a few seconds (or with a button, until tapped)
function say(text: string, button?: { label: string; onClick: () => void }) {
  withRoot((html) => {
    document.querySelector('[data-restyle-note]')?.remove();
    const note = document.createElement('div');
    note.dataset.restyleNote = '';
    note.setAttribute('role', 'status');
    note.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483647;display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:12px;background:#1a1a1b;color:#fff;font:14px/1.3 -apple-system,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    note.append(Object.assign(document.createElement('span'), { textContent: text, style: 'flex:1' }));
    if (button) {
      const tap = Object.assign(document.createElement('button'), { type: 'button', textContent: button.label });
      tap.style.cssText = 'flex:none;padding:8px 14px;border:0;border-radius:999px;background:#d93900;color:#fff;font:600 14px -apple-system,system-ui,sans-serif';
      tap.addEventListener('click', button.onClick);
      note.append(tap);
    } else {
      setTimeout(() => note.remove(), 4000);
    }
    html.append(note);
  });
}

function download(url: string) {
  return new Promise<string>((resolve, reject) => {
    GM.xmlHttpRequest({
      method: 'GET',
      url,
      timeout: TIMEOUT,
      onload: ({ status, responseText }) => status === 200 ? resolve(responseText) : reject(new Error(`${status}`)),
      onerror: () => reject(new Error('no answer')),
      ontimeout: () => reject(new Error('timed out')),
    });
  });
}

let updating = false;

async function update(kept: string | undefined) {
  if (updating) return;
  updating = true;
  say('Getting the latest Reddit Restyle…');
  try {
    // A fresh copy: past any cache between here and the host
    const code = await download(`${__BUNDLE_URL__}?t=${Date.now()}`);
    const version = versionOf(code);
    if (!version) throw new Error('that isn’t a Reddit Restyle build');
    if (code === kept) {
      say(`Reddit Restyle is up to date (${version}).`);
      return;
    }
    await GM.setValue(CODE, code);
    say(`Reddit Restyle ${version}: reloading…`);
    setTimeout(() => location.reload(), 600);
  } catch (error) {
    say(`Couldn’t update Reddit Restyle: ${(error as Error).message}`, { label: 'Retry', onClick: () => { updating = false; update(kept); } });
    console.error('Reddit Restyle Loader:', error);
  } finally {
    updating = false;
  }
}

async function start() {
  // An owned page stays hidden until it's drawn (the restyle shows it), so
  // reddit's own markup doesn't flash while the build is read
  const owned = pageOf(location.pathname);
  withRoot((html) => { if (owned) html.style.visibility = 'hidden'; });

  const kept = await GM.getValue<string>(CODE);
  const ask = () => update(kept);
  document.addEventListener(UPDATE_EVENT, ask);
  GM.registerMenuCommand?.('Update Reddit Restyle', ask);

  const asked = () => {
    if (location.hash !== HASH) return false;
    history.replaceState(history.state, '', location.pathname + location.search);
    return true;
  };
  window.addEventListener('hashchange', () => { if (asked()) ask(); });

  if (!kept) {
    withRoot((html) => html.style.removeProperty('visibility'));
    if (asked()) return ask();
    say('Reddit Restyle isn’t installed yet.', { label: 'Install', onClick: ask });
    return;
  }

  withRoot((html) => { html.dataset[LOADER_ATTRIBUTE] = versionOf(kept) ?? 'unknown'; });
  try {
    run(kept);
  } catch (error) {
    console.error('Reddit Restyle Loader: the kept build failed', error);
    withRoot((html) => html.style.removeProperty('visibility'));
    say('Reddit Restyle failed to start.', { label: 'Update', onClick: ask });
  }
  if (asked()) ask();
}

start();
