// @vitest-environment jsdom
/* A listing drawn from reddit's JSON (the fixture), and More posts */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setUpListing } from '../src/pages/listing';
import type { Shell } from '../src/shell/blocker';

const fixture = readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8');
const subscriptions = readFileSync(resolve(__dirname, 'fixtures/subscriptions.json'), 'utf8');
const about = readFileSync(resolve(__dirname, 'fixtures/about.json'), 'utf8');
// reddit, from the fixtures: you (your modhash), what you do (taken), your
// communities, a subreddit's about, the next page, a listing
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"name":"you","modhash":"MODHASH","snoovatar_img":"https://i.redd.it/snoovatar/you.png"}}'
    : url.startsWith('/api/') || url === '/logout' ? '{}'
      : url.startsWith('/subreddits/') ? subscriptions : url.includes('/about.json') ? about : url.includes('after=') ? second : fixture,
);
const posted = (fetchMock: ReturnType<typeof vi.fn>, url: string) =>
  fetchMock.mock.calls.filter(([to, init]) => to === url && init?.method === 'POST').map(([, init]) => Object.fromEntries(init.body as URLSearchParams));
const second = JSON.stringify({ kind: 'Listing', data: { after: null, children: [
  { kind: 't3', data: { ...JSON.parse(fixture).data.children[2].data, name: 't3_next', title: 'From the next page' } },
] } });

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
const moreButton = () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'More posts');

describe('listing page', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    history.replaceState(null, '', '/r/pics/top/?t=week');
    fetchMock = vi.fn(async (url: string) => answer(url));
    vi.stubGlobal('fetch', fetchMock);
    setUpListing(shell);
  });

  it('asks for the page’s JSON and draws its posts under where you are', async () => {
    expect(fetchMock.mock.calls[0]![0]).toBe('/r/pics/top/.json?t=week&raw_json=1&sr_detail=1');
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(document.querySelector('h1')!.textContent).toBe('r/pics');
    await vi.waitFor(() => expect(document.querySelector('h1 + p')!.textContent).toBe('32m members'));
    const sort = document.querySelector<HTMLSelectElement>('select[aria-label="Sort"]')!;
    expect([sort.value, sort.parentElement!.textContent]).toEqual(['/r/pics/top/', 'TopHotNewTopRising']);  // shown, then its options
    expect(titles()[1]).toBe('Sunrise over the Grand Canyon this morning');
    expect(document.querySelector('article p > a')!.textContent).toBe('u/pics-mod');  // one subreddit: who, not where
    expect(document.querySelector('article img')!.getAttribute('src')).toBe('https://preview.redd.it/abc123.jpeg?width=640&s=c');
    expect([...document.querySelectorAll('article span')].map((s) => s.textContent)).toEqual(expect.arrayContaining(['Pinned', 'Announcement', 'NSFW', '1/2']));
    const video = document.querySelector('article video')!;
    expect([video.getAttribute('src'), video.getAttribute('preload'), video.hasAttribute('controls')]).toEqual(['https://v.redd.it/vid005/HLSPlaylist.m3u8?a=1', 'none', true]);
    expect(document.querySelector('article')!.textContent).toContain('Please read the rules before posting.');
  });

  it('a picture, tapped: open big (at its full size); Escape closes it', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    document.querySelector<HTMLButtonElement>('article button[aria-label="Open the picture"]')!.click();
    const viewer = () => document.querySelector('[role="dialog"][aria-label="Pictures"]');
    await vi.waitFor(() => expect(viewer()).not.toBeNull());
    expect(viewer()!.querySelector('img')!.getAttribute('src')).toBe('https://preview.redd.it/abc123.jpeg?width=3024&s=src');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.waitFor(() => expect(viewer()).toBeNull());
  });

  it('More posts: the next page, appended', async () => {
    await vi.waitFor(() => expect(moreButton()).toBeTruthy());
    moreButton()!.click();
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/r/pics/top/.json?t=week&raw_json=1&sr_detail=1&after=t3_1q2c007');
    await vi.waitFor(() => expect(titles()).toHaveLength(8));
    expect(titles()[7]).toBe('From the next page');
    expect(moreButton()).toBeUndefined();  // no page after it
  });

  it('top: its span, a dropdown on the week as the address says, each option an address', async () => {
    const select = () => document.querySelector<HTMLSelectElement>('select[aria-label="Time"]');
    await vi.waitFor(() => expect(select()).not.toBeNull());
    expect([...select()!.options].map((o) => [o.textContent, o.value])).toEqual([
      ['Now', '/r/pics/top/?t=hour'], ['Today', '/r/pics/top/?t=day'], ['This week', '/r/pics/top/?t=week'],
      ['This month', '/r/pics/top/?t=month'], ['This year', '/r/pics/top/?t=year'], ['All time', '/r/pics/top/?t=all'],
    ]);
    expect(select()!.value).toBe('/r/pics/top/?t=week');
    expect(select()!.parentElement!.textContent).toContain('This week');
  });

  it('a vote: on screen at once (its pill turns), sent with your modhash', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    const upvote = document.querySelector<HTMLButtonElement>('article button[aria-label="Upvote"]')!;
    upvote.click();
    await vi.waitFor(() => expect(upvote.getAttribute('aria-pressed')).toBe('true'));
    expect(upvote.parentElement!.className).toContain('rr-bg-upvote-background');
    expect(upvote.parentElement!.textContent).toBe('1.2k');
    await vi.waitFor(() => expect(posted(fetchMock, '/api/vote')).toEqual([{ id: 't3_1q2c001', dir: '1', rank: '1', uh: 'MODHASH' }]));
  });

  it('a vote reddit refuses: back as it was', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    fetchMock.mockImplementation(async (url: string) => (url === '/api/vote' ? new Response('', { status: 403 }) : answer(url)));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const downvote = document.querySelector<HTMLButtonElement>('article button[aria-label="Downvote"]')!;
    downvote.click();
    expect(downvote.getAttribute('aria-pressed')).toBe('true');
    await vi.waitFor(() => expect(downvote.getAttribute('aria-pressed')).toBe('false'));
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it('where you are, as reddit.com has it: banner, icon, name, members; Join, sent', async () => {
    const join = () => [...document.querySelectorAll<HTMLButtonElement>('main header button')].find((b) => /Join/.test(b.textContent ?? ''));
    await vi.waitFor(() => expect(join()!.textContent).toBe('Join'));
    expect(document.querySelector('main header img')!.getAttribute('src')).toBe('https://styles.redditmedia.com/t5_2qh0u/styles/mobileBannerImage_pics.png');
    expect(document.querySelector('main header h1')!.textContent).toBe('r/pics');
    join()!.click();
    await vi.waitFor(() => expect(join()!.textContent).toBe('Joined'));
    expect(document.querySelector('h1 + p')!.textContent).toBe('32m members');
    await vi.waitFor(() => expect(posted(fetchMock, '/api/subscribe')).toEqual([{ action: 'sub', sr_name: 'pics', uh: 'MODHASH', skip_initial_defaults: 'true' }]));
  });

  it('you, in the bar: your account (a sheet on a phone): View Profile, Settings, Dark Mode, Log Out, which logs out', async () => {
    const button = () => document.querySelector<HTMLButtonElement>('header button[aria-label="Account"]');
    await vi.waitFor(() => expect(button()).not.toBeNull());
    expect(button()!.querySelector('img')!.getAttribute('src')).toBe('https://i.redd.it/snoovatar/you.png');
    const sheet = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Account"]')!;
    const closed = () => sheet().hasAttribute('inert') || Boolean(sheet().inert);
    expect(closed()).toBe(true);
    button()!.click();
    await vi.waitFor(() => expect(closed()).toBe(false));
    expect([...sheet().querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['View Profileu/you', '/user/you/'], ['Settings', '/prefs/']]);
    const theme = sheet().querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(theme.getAttribute('aria-checked')).toBe('false');
    theme.click();
    await vi.waitFor(() => expect(theme.getAttribute('aria-checked')).toBe('true'));
    expect([document.documentElement.dataset.theme, localStorage.getItem('reddit-restyle:theme')]).toEqual(['dark', 'dark']);
    expect(closed()).toBe(false);  // a switch: the sheet stays open
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});  // jsdom can't reload the page after
    [...sheet().querySelectorAll('button')].find((b) => b.textContent === 'Log Out')!.click();
    await vi.waitFor(() => expect(posted(fetchMock, '/logout')).toEqual([{ uh: 'MODHASH', top: 'off' }]));
    errors.mockRestore();
  });

  it('the strip on top: Home, Popular, All, then your communities, as old reddit has them', async () => {
    const strip = () => [...document.querySelectorAll('nav[aria-label="Reddits"] a')].map((a) => [a.textContent, a.getAttribute('href')]);
    await vi.waitFor(() => expect(strip()).toHaveLength(7));
    expect(strip()).toEqual([
      ['Home', '/'], ['Popular', '/r/popular/'], ['All', '/r/all/'],
      ['soccer', '/r/soccer/'], ['AskHistorians', '/r/AskHistorians/'], ['aviation', '/r/aviation/'], ['u/someone', '/user/someone/'],
    ]);
  });

  it('the menu: Home, Popular, All, then your communities; out of reach until opened, and after Escape', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    const menu = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Menu"]')!;
    const open = () => !menu().hasAttribute('inert') && !menu().inert;
    expect(open()).toBe(false);
    document.querySelector<HTMLButtonElement>('button[aria-label="Menu"]')!.click();
    await vi.waitFor(() => expect(open()).toBe(true));
    const links = [...menu().querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/', '/r/popular/', '/r/all/', '/r/soccer/', '/r/AskHistorians/', '/r/aviation/', '/user/someone/']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.waitFor(() => expect(open()).toBe(false));
    document.querySelector<HTMLButtonElement>('button[aria-label="Menu"]')!.click();  // ☰ again: it toggles
    await vi.waitFor(() => expect(open()).toBe(true));
    document.querySelector<HTMLButtonElement>('button[aria-label="Menu"]')!.click();
    await vi.waitFor(() => expect(open()).toBe(false));
  });
});

describe('popular and all: no header, as on reddit.com', () => {
  it('none for r/all', async () => {
    history.replaceState(null, '', '/r/all/');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => answer(url)));
    setUpListing(shell);
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(document.querySelector('main header')).toBeNull();
    expect(document.querySelector('h1')!.textContent).toBe('r/all');  // for screen readers only
  });
});

describe('the front page', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => answer(url)));
    setUpListing(shell);
  });

  it('no header (as reddit.com), and each post’s subreddit with its icon (no about to ask for)', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(document.querySelector('main header')).toBeNull();
    expect(document.querySelector('h1')!.textContent).toBe('Home');  // for screen readers only
    expect(document.querySelector<HTMLSelectElement>('select[aria-label="Sort"]')!.value).toBe('/best/');  // best, first
    expect(document.querySelector('select[aria-label="Time"]')).toBeNull();  // hot: no span
    expect(document.querySelector('nav[aria-label="Reddits"] [aria-current="page"]')!.textContent).toBe('Home');
    const where = document.querySelectorAll('article')[1]!.querySelector('p > a')!;
    expect(where.getAttribute('href')).toBe('/r/pics/');
    expect(where.querySelector('img')!.getAttribute('src')).toBe('https://styles.redditmedia.com/t5_2qh0u/styles/communityIcon_pics.png?width=256&s=d');
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('about.json'))).toBe(false);
  });
});

describe('listing page, when reddit says no', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/r/pics/');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));
    setUpListing(shell);
  });

  it('says so, and why, in place of the posts', async () => {
    await vi.waitFor(() => expect(document.querySelector('main')!.textContent).toContain('Couldn’t load this page'));
    expect(document.querySelector('main')!.textContent).toContain('/r/pics/.json?raw_json=1&sr_detail=1: 403');
    expect(document.querySelectorAll('article')).toHaveLength(0);
  });
});
