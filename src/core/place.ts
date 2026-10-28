/* Your place on a page, kept when you leave it: back (or forward) to it, the
   page comes back as you left it, at the same spot, even when Safari has
   thrown it out of memory. What's kept, as you leave (and when Safari goes
   to the background, where iOS may close the tab without a word): the page's
   state (its posts, your votes and hides) and the spot: the first post or
   comment whose top is on screen ([data-place]), how far down it was, and
   the plain scroll. In sessionStorage: this tab's own, as its back and
   forward are, gone with it.

   Back or forward: the page as kept, if it's recent and was kept, drawn
   first; its fresh copy, asked for as usual, only updates what's shown (the
   page says how). A reload, or no page kept: the spot, on the fresh page. A
   link: the top, as always. Safari's own restoring is off: it would scroll
   a page not drawn yet. */

const KEY = 'restyle:places:1';  // a page's state changes shape: the next number (pages kept before aren't read)
const SPOTS = 30;              // the addresses whose spot is kept
const PAGES = 5;               // …and whose page too: the last you left
const FRESH = 30 * 60 * 1000;  // ms: a page kept longer is asked for again
const LARGEST = 500_000;       // characters: a page larger (a huge thread) keeps only its spot
const SETTLING = 2000;         // ms: the spot is held while pictures above it load, unless you touch first

export interface Spot {
  id: string | null;  // the post or comment ([data-place]); null: none on screen
  offset: number;     // px from the window's top to its top
  y: number;          // the page's scroll, if it's gone
}

interface Kept { address: string; at: number; spot: Spot; state?: unknown }

export interface Place<S> {
  state: S | null;  // the page as you left it (back or forward); null: ask for it
  spot: Spot;
}

const addressOf = () => location.pathname + location.search;

function read(): Kept[] {
  try {
    const kept: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    return Array.isArray(kept) ? (kept as Kept[]) : [];
  } catch {
    return [];
  }
}

function write(kept: Kept[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Full: the spots, without any page
    try {
      sessionStorage.setItem(KEY, JSON.stringify(kept.map(({ state: _, ...spot }) => spot)));
    } catch { /* not kept */ }
  }
}

const cameBy = () => (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;

// At document start: where you were, coming back here (back, forward, a reload); null: start at the top
export function placeOf<S>(): Place<S> | null {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const by = cameBy();
  if (by !== 'back_forward' && by !== 'reload') return null;
  const kept = read().find(({ address }) => address === addressOf());
  if (!kept) return null;
  const fresh = by === 'back_forward' && kept.state !== undefined && Date.now() - kept.at < FRESH;
  return { state: fresh ? (kept.state as S) : null, spot: kept.spot };
}

// The first post or comment whose top is on screen (one inside another: the outer one's first)
function spotNow(): Spot {
  for (const element of document.querySelectorAll<HTMLElement>('[data-place]')) {
    const { top } = element.getBoundingClientRect();
    if (top >= 0) return { id: element.dataset.place ?? null, offset: top, y: scrollY };
  }
  return { id: null, offset: 0, y: scrollY };
}

// Once drawn: the page (as settle leaves it: nothing half done, no menu open;
// null: only the spot) and the spot, kept whenever you leave
export function keepPlace<S>(page: () => S | null) {
  const keep = () => {
    const address = addressOf();
    const state = page();
    const json = state === null ? '' : JSON.stringify(state);
    const entry: Kept = { address, at: Date.now(), spot: spotNow(), ...(json && json.length <= LARGEST ? { state } : {}) };
    const kept = [entry, ...read().filter((each) => each.address !== address)].slice(0, SPOTS);
    write(kept.map((each, at) => (at < PAGES ? each : { address: each.address, at: each.at, spot: each.spot })));
  };
  addEventListener('pagehide', keep);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') keep();
  });
}

// Back to the spot (the page drawn), and held there while what's above it
// settles (pictures load, the strip comes): until you touch or scroll, or
// SETTLING passes
export function goTo(spot: Spot) {
  const place = () => {
    const element = spot.id ? document.querySelector(`[data-place="${spot.id}"]`) : null;
    if (element) scrollBy(0, element.getBoundingClientRect().top - spot.offset);
    else scrollTo(0, spot.y);
  };
  place();
  if (typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(place);
  observer.observe(document.body);
  const stop = () => {
    observer.disconnect();
    for (const type of ['touchstart', 'wheel', 'keydown']) removeEventListener(type, stop);
  };
  for (const type of ['touchstart', 'wheel', 'keydown']) addEventListener(type, stop, { passive: true });
  setTimeout(stop, SETTLING);
}
