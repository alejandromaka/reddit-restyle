// @vitest-environment jsdom
/* Search: the bar's field (in a subreddit: in it, or all of reddit), and a
   search's results, drawn as a listing from reddit's search.json */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { searchable, searchUrl } from '../src/nav/search';
import { setUpListing } from '../src/pages/listing';
import type { Shell } from '../src/shell/blocker';

const fixture = readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8');
const subscriptions = readFileSync(resolve(__dirname, 'fixtures/subscriptions.json'), 'utf8');
const about = readFileSync(resolve(__dirname, 'fixtures/about.json'), 'utf8');
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"id":"y0u","name":"you","modhash":"MODHASH"}}'
    : url.startsWith('/subreddits/') ? subscriptions : url.includes('/about.json') ? about : fixture,
);

HTMLMediaElement.prototype.canPlayType = () => 'maybe';

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
const field = () => document.querySelector<HTMLInputElement>('form[role="search"] input[type="search"]')!;
const chip = () => document.querySelector('form[role="search"] button[aria-label^="Search all of reddit"]');

let fetchMock: ReturnType<typeof vi.fn>;
const open = (path: string) => {
  history.replaceState(null, '', path);
  fetchMock = vi.fn(async (url: string) => answer(url));
  vi.stubGlobal('fetch', fetchMock);
  setUpListing(shell);
};

describe('searchUrl, searchable', () => {
  it('all of reddit’s, or a subreddit’s only; its sort and span kept', () => {
    expect(searchUrl('grand canyon', null)).toBe('/search/?q=grand+canyon');
    expect(searchUrl('sunrise', 'pics', { sort: 'top', t: 'week' })).toBe('/r/pics/search/?q=sunrise&sort=top&t=week&restrict_sr=on');
  });

  it('a subreddit (or several) can be searched in; the front page, Popular, All and people can’t', () => {
    expect([searchable('pics'), searchable('pics+funny'), searchable(null), searchable('All'), searchable('popular'), searchable('u_someone')]).toEqual([true, true, false, false, false, false]);
  });
});

describe('the bar’s search', () => {
  it('in a subreddit, it starts in it: × takes it out (all of reddit), and so does ⌫ on the empty field', async () => {
    open('/r/pics/');
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(field().placeholder).toBe('Search in r/pics');
    expect(document.querySelector('form[role="search"]')!.getAttribute('action')).toBe('/r/pics/search/');
    (chip() as HTMLButtonElement).click();
    await vi.waitFor(() => expect(chip()).toBeNull());
    expect(field().placeholder).toBe('Search Reddit');
    expect(document.querySelector('form[role="search"]')!.getAttribute('action')).toBe('/search/');
  });

  it('⌫ on the empty field takes the subreddit out', async () => {
    open('/r/pics/');
    await vi.waitFor(() => expect(chip()).not.toBeNull());
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await vi.waitFor(() => expect(chip()).toBeNull());
  });

  it('on the front page, all of reddit; 🔍 opens it over the bar (a phone’s), Cancel closes it', async () => {
    open('/');
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(chip()).toBeNull();
    const button = document.querySelector<HTMLButtonElement>('header button[aria-label="Search"]')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    await vi.waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('true'));
    expect(document.activeElement).toBe(field());
    [...document.querySelectorAll<HTMLButtonElement>('form[role="search"] button')].find((b) => b.textContent === 'Cancel')!.click();
    await vi.waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('false'));
  });
});

describe('a search’s results', () => {
  it('asks for search.json and draws the posts under its words, where it looked, its sorts', async () => {
    open('/r/pics/search/?q=sunrise&restrict_sr=on&sort=top&t=week');
    expect(fetchMock.mock.calls[0]![0]).toBe('/r/pics/search.json?q=sunrise&restrict_sr=on&sort=top&t=week&raw_json=1&sr_detail=1&limit=25&type=link');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/about.json'))).toBe(false);
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(document.querySelector('h1')!.textContent).toBe('“sunrise”');
    expect(document.querySelector('h1 + p')!.textContent).toBe('In r/pics · Search all of reddit');
    expect(document.querySelector('h1 + p a')!.getAttribute('href')).toBe('/search/?q=sunrise&sort=top&t=week');
    expect(field().value).toBe('sunrise');
    expect(chip()).not.toBeNull();
    const sort = document.querySelector<HTMLSelectElement>('select[aria-label="Sort"]')!;
    expect([...sort.options].map((o) => o.textContent)).toEqual(['Relevance', 'Hot', 'Top', 'New', 'Comments']);
    expect(sort.value).toBe('/r/pics/search/?q=sunrise&restrict_sr=on&sort=top&t=week');
    expect([...sort.options].find((o) => o.textContent === 'New')!.value).toBe('/r/pics/search/?q=sunrise&restrict_sr=on&sort=new&t=week');
    const time = document.querySelector<HTMLSelectElement>('select[aria-label="Time"]')!;
    expect([...time.options].find((o) => o.textContent === 'All time')!.value).toBe('/r/pics/search/?q=sunrise&restrict_sr=on&sort=top&t=all');
    expect(document.querySelector('article p > a')!.textContent).toContain('r/pics');  // results: where each is from
  });

  it('all of reddit’s, asked from a subreddit: Search only it', async () => {
    open('/r/pics/search/?q=sunrise');
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(document.querySelector('h1 + p')!.textContent).toBe('In all of reddit · Search only r/pics');
    expect(chip()).toBeNull();
  });

  it('none: No results', async () => {
    history.replaceState(null, '', '/search/?q=nothing');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('/search.json') ? new Response('{"kind":"Listing","data":{"after":null,"before":null,"children":[]}}') : answer(url))));
    setUpListing(shell);
    await vi.waitFor(() => expect(document.body.textContent).toContain('No results'));
    expect(document.querySelector('h1 + p')!.textContent).toBe('In all of reddit');
  });
});
