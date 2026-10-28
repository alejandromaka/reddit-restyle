// @vitest-environment jsdom
/* Your place, kept when you leave a page: back to it, the page as you left it
   at the same spot (its fresh copy only updates scores); a reload, the spot
   on a fresh page; a link, the top */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keepPlace } from '../src/core/place';
import { setUpListing } from '../src/pages/listing';
import type { Shell } from '../src/shell/blocker';

const fixture = readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8');
const subscriptions = readFileSync(resolve(__dirname, 'fixtures/subscriptions.json'), 'utf8');
const about = readFileSync(resolve(__dirname, 'fixtures/about.json'), 'utf8');

// reddit later: the sunrise's score up, a new post on top
const later = (() => {
  const listing = JSON.parse(fixture);
  const [first, sunrise] = listing.data.children;
  sunrise.data.score = 61234;
  listing.data.children.unshift({ kind: 't3', data: { ...first.data, name: 't3_new', title: 'Posted since' } });
  return JSON.stringify(listing);
})();

let listing = fixture;
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"id":"y0u","name":"you","modhash":"MODHASH"}}'
    : url.startsWith('/subreddits/') ? subscriptions : url.includes('/about.json') ? about : listing,
);

const shell: Shell = {
  page: 'listing',
  ready: (callback) => callback(),
  mount: () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    return root;
  },
  reveal: () => {},
};

const titles = () => [...document.querySelectorAll('article > a:first-of-type')].map((a) => a.textContent);
const sunrise = () => document.querySelector('[data-place="t3_1q2c002"]')!.textContent;
const kept = () => JSON.parse(sessionStorage.getItem('restyle:places:1') ?? '[]');
const cameBy = (type: string) => vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type } as PerformanceNavigationTiming]);

describe('your place', () => {
  let scrollBy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    sessionStorage.clear();
    history.replaceState(null, '', '/r/pics/');
    listing = fixture;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => answer(url)));
    scrollBy = vi.fn();
    vi.stubGlobal('scrollBy', scrollBy);
    vi.stubGlobal('scrollTo', vi.fn());
    // You came by a link, read it, and left
    cameBy('navigate');
    setUpListing(shell);
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    dispatchEvent(new Event('pagehide'));
    listing = later;
  });

  it('is kept as you leave: the page (its posts) and the first post on screen', () => {
    const [entry] = kept();
    expect(entry).toMatchObject({ address: '/r/pics/', spot: { id: 't3_1q2c001', offset: 0, y: 0 } });
    expect(entry.state.posts).toHaveLength(7);
    expect(entry.state).toMatchObject({ status: 'idle', menu: null });
  });

  it('back: the page as you left it, at once, at your spot; its fresh copy only updates scores', async () => {
    cameBy('back_forward');
    setUpListing(shell);
    expect(titles()).toHaveLength(7);  // drawn before reddit answers
    expect(sunrise()).toContain('48k');
    expect(scrollBy).toHaveBeenCalled();
    await vi.waitFor(() => expect(sunrise()).toContain('61k'));
    expect(titles()).not.toContain('Posted since');  // nothing added or moved
  });

  it('a reload: the fresh page, at your spot', async () => {
    cameBy('reload');
    setUpListing(shell);
    expect(titles()).toHaveLength(0);
    await vi.waitFor(() => expect(titles()).toHaveLength(8));
    expect(titles()[0]).toBe('Posted since');
    expect(scrollBy).toHaveBeenCalled();
  });

  it('back after a while: the fresh page, at your spot', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31 * 60 * 1000);
    cameBy('back_forward');
    setUpListing(shell);
    await vi.waitFor(() => expect(titles()).toHaveLength(8));
    expect(scrollBy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('a link: the fresh page, at the top', async () => {
    cameBy('navigate');
    setUpListing(shell);
    await vi.waitFor(() => expect(titles()).toHaveLength(8));
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('keeps the last 30 spots, and the last 5 pages', () => {
    keepPlace(() => ({ page: location.pathname }));
    for (let at = 0; at < 40; at++) {
      history.replaceState(null, '', `/r/a${at}/`);
      dispatchEvent(new Event('pagehide'));
    }
    const entries = kept();
    expect(entries).toHaveLength(30);
    expect(entries[0].address).toBe('/r/a39/');
    expect(entries.filter((entry: { state?: unknown }) => entry.state !== undefined)).toHaveLength(5);
  });
});
