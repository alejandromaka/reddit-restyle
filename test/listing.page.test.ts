// @vitest-environment jsdom
/* A listing drawn from reddit's JSON (the fixture), and its pages */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setUpListing } from '../src/pages/listing';
import type { Shell } from '../src/shell/blocker';

const fixture = readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8');
const subscriptions = readFileSync(resolve(__dirname, 'fixtures/subscriptions.json'), 'utf8');
const about = readFileSync(resolve(__dirname, 'fixtures/about.json'), 'utf8');
const rules = readFileSync(resolve(__dirname, 'fixtures/rules.json'), 'utf8');
const filters = readFileSync(resolve(__dirname, 'fixtures/filters.json'), 'utf8');
// reddit, from the fixtures: you (your modhash), what you do (taken), your
// communities, a subreddit's about, the next page, a listing
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"id":"y0u","name":"you","modhash":"MODHASH","snoovatar_img":"https://i.redd.it/snoovatar/you.png"}}'
    : url.startsWith('/api/filter/') && !url.includes('/r/') ? filters
      : url.startsWith('/api/') || url === '/logout' ? '{}'
      : url.startsWith('/subreddits/') ? subscriptions : url.includes('/about.json') ? about : url.includes('/about/rules.json') ? rules
        : url.includes('after=') ? second : fixture,
);
const posted = (fetchMock: ReturnType<typeof vi.fn>, url: string) =>
  fetchMock.mock.calls.filter(([to, init]) => to === url && init?.method === 'POST').map(([, init]) => Object.fromEntries(init.body as URLSearchParams));
const second = JSON.stringify({ kind: 'Listing', data: { after: null, before: 't3_next', children: [
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
const pages = () => [...document.querySelectorAll('nav[aria-label="Pages"] > *')].map((page) => [page.textContent, page.getAttribute('href')]);

describe('listing page', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    history.replaceState(null, '', '/r/pics/top/?t=week');
    fetchMock = vi.fn(async (url: string) => answer(url));
    vi.stubGlobal('fetch', fetchMock);
    setUpListing(shell);
  });

  it('asks for the page’s JSON and draws its posts under where you are', async () => {
    expect(fetchMock.mock.calls[0]![0]).toBe('/r/pics/top/.json?t=week&raw_json=1&sr_detail=1&limit=25');
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

  it('a picture open big: a swipe down closes it; a short one, or one across, doesn’t', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    const viewer = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Pictures"]');
    // A finger: down, two moves, up; a swipe down claims its moves (the page behind doesn't scroll)
    const claimed: boolean[] = [];
    const swipe = (dx: number, dy: number) => {
      const at = (type: string, x: number, y: number) => {
        const touch = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
        viewer()!.dispatchEvent(touch);
        if (type === 'touchmove') claimed.push(touch.defaultPrevented);
      };
      at('touchstart', 100, 100);
      at('touchmove', 100 + dx / 2, 100 + dy / 2);
      at('touchmove', 100 + dx, 100 + dy);
      at('touchend', 100 + dx, 100 + dy);
    };
    document.querySelector<HTMLButtonElement>('article button[aria-label="Open the picture"]')!.click();
    await vi.waitFor(() => expect(viewer()).not.toBeNull());
    swipe(0, 60);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(viewer()).not.toBeNull();
    swipe(200, 20);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(viewer()).not.toBeNull();
    expect(claimed).toEqual([true, true, false, false]);  // the short swipe down: its; across: the gallery's
    swipe(0, 160);
    await vi.waitFor(() => expect(viewer()).toBeNull());
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

  it('pages, as old reddit’s: this one, 1; the next, its own address (count, after)', async () => {
    const next = '/r/pics/top/?t=week&count=25&after=t3_1q2c007';
    await vi.waitFor(() => expect(pages()).toEqual([['1', null], ['2', next], ['Next ›', next]]));
    expect(document.querySelector('[aria-current="page"]')!.textContent).toBe('1');
  });

  it('a later page: asked for where it starts; 1, the one before (count, before), this one; no next', async () => {
    history.replaceState(null, '', '/r/pics/top/?t=week&count=50&after=t3_x');
    setUpListing(shell);
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/r/pics/top/.json?t=week&count=50&after=t3_x&raw_json=1&sr_detail=1&limit=25');
    await vi.waitFor(() => expect(titles()).toEqual(['From the next page']));
    const before = '/r/pics/top/?t=week&count=51&before=t3_next';
    expect(pages()).toEqual([['‹ Prev', before], ['1', '/r/pics/top/?t=week'], ['2', before], ['3', null]]);
  });

  // The page's menu (in jsdom both the phone's sheet and the wider dropdown are there: the sheet's first)
  const menu = () => document.querySelector('[role="dialog"][aria-label="More options"]')!;
  const inMenu = (label: string) => [...menu().querySelectorAll('button')].find((b) => b.textContent === label)!;
  const report = () => document.querySelector('[role="dialog"][aria-label="Report"]')!;
  const more = (index: number) => document.querySelectorAll<HTMLButtonElement>('article button[aria-label="More options"]')[index]!;

  it('a post’s "…": Hide, Report; hidden, it’s a line with Undo, and reddit’s told each time', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    more(1).click();
    await vi.waitFor(() => expect(menu().hasAttribute('inert')).toBe(false));
    expect([...menu().querySelectorAll('button')].map((b) => b.textContent)).toEqual(expect.arrayContaining(['Hide', 'Report']));
    inMenu('Hide').click();
    await vi.waitFor(() => expect(titles()).not.toContain('Sunrise over the Grand Canyon this morning'));
    expect(menu().hasAttribute('inert')).toBe(true);
    await vi.waitFor(() => expect(posted(fetchMock, '/api/hide')).toEqual([{ id: 't3_1q2c002', uh: 'MODHASH' }]));
    const undo = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Undo')!;
    expect(undo.parentElement!.textContent).toBe('Post hiddenUndo');
    undo.click();
    await vi.waitFor(() => expect(titles()).toContain('Sunrise over the Grand Canyon this morning'));
    await vi.waitFor(() => expect(posted(fetchMock, '/api/unhide')).toEqual([{ id: 't3_1q2c002', uh: 'MODHASH' }]));
  });

  it('blocking a post’s author: asked first; each of their posts a line, reddit told; Undo unblocks them, all back', async () => {
    const sure = () => document.querySelector('[role="dialog"][aria-label="Block account"]')!;
    const lines = () => [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Undo').map((undo) => undo.parentElement!.textContent);
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    more(3).click();  // someone's, the first of their four
    await vi.waitFor(() => expect(menu().hasAttribute('inert')).toBe(false));
    inMenu('Block u/someone').click();
    await vi.waitFor(() => expect(sure().textContent).toContain('Block u/someone?'));
    [...sure().querySelectorAll('button')].find((b) => b.textContent === 'Block account')!.click();
    await vi.waitFor(() => expect(titles()).toHaveLength(3));
    expect(lines()).toEqual(Array(4).fill('u/someone blockedUndo'));
    await vi.waitFor(() => expect(posted(fetchMock, '/api/block_user')).toEqual([{ name: 'someone', uh: 'MODHASH' }]));
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Undo')!.click();
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    await vi.waitFor(() => expect(posted(fetchMock, '/api/unfriend')).toEqual([{ name: 'someone', type: 'enemy', container: 't2_y0u', uh: 'MODHASH' }]));
  });

  it('blocking a link post’s site: this device’s at once, a line with Undo; blocked before, its posts left out; your account lists it, Unblock brings them back', async () => {
    const KEY = 'reddit-restyle:domains';
    const undo = () => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Undo');
    localStorage.removeItem(KEY);
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    more(1).click();  // a picture on reddit: no site to block
    await vi.waitFor(() => expect(menu().hasAttribute('inert')).toBe(false));
    expect([...menu().querySelectorAll('button')].map((b) => b.textContent).filter(Boolean)).toEqual(['Hide', 'Report', 'Block u/early_riser']);
    more(2).click();  // newsy's link to example.com
    await vi.waitFor(() => expect(inMenu('Block example.com')).toBeDefined());
    inMenu('Block example.com').click();
    await vi.waitFor(() => expect(titles()).not.toContain('Museum restores a 400-year-old painting'));
    expect(undo()!.parentElement!.textContent).toBe('example.com blockedUndo');
    expect(localStorage.getItem(KEY)).toBe('["example.com"]');
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toEqual([]);  // reddit's not told: this device's
    undo()!.click();
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(localStorage.getItem(KEY)).toBe('[]');

    localStorage.setItem(KEY, '["example.com"]');  // blocked before this page
    setUpListing(shell);
    await vi.waitFor(() => expect(titles()).toHaveLength(6));
    expect(undo()).toBeUndefined();  // left out, no line
    document.querySelector<HTMLButtonElement>('header button[aria-label="Account"]')!.click();
    const sheet = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Account"]')!;
    const blocked = sheet.querySelector('details')!;
    expect(blocked.querySelector('summary')!.textContent).toBe('Blocked Domains1');
    expect(blocked.querySelector('li')!.textContent).toBe('example.comUnblock');
    blocked.querySelector('button')!.click();
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    expect(blocked.querySelector('li')).toBeNull();
    expect(localStorage.getItem(KEY)).toBe('[]');
    localStorage.removeItem(KEY);
  });

  it('Hide beside a post’s comments: the same hide as its "…" (a line with Undo, reddit told)', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    const pill = [...document.querySelectorAll<HTMLButtonElement>('article button')].find((b) => b.textContent === 'Hide')!;
    expect(pill.closest('article')!.querySelector('a[href*="/comments/"]')).not.toBeNull();
    pill.click();
    await vi.waitFor(() => expect(titles()).toHaveLength(6));
    await vi.waitFor(() => expect(posted(fetchMock, '/api/hide')).toEqual([{ id: 't3_1q2c001', uh: 'MODHASH' }]));
  });

  it('reporting a post: its subreddit’s rules for posts and reddit’s, one chosen, sent; thanks', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    more(0).click();
    inMenu('Report').click();
    await vi.waitFor(() => expect(report().hasAttribute('inert')).toBe(false));
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/r/pics/about/rules.json?raw_json=1');
    const reasons = () => [...report().querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
    await vi.waitFor(() => expect(reasons().map((b) => b.textContent)).toEqual([
      'No screenshots', 'Be civil', 'Spam', 'Personal and confidential information', 'Threatening, harassing, or inciting violence',
    ]));
    const send = [...report().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Report')!;
    expect(send.disabled).toBe(true);
    reasons()[1]!.click();
    await vi.waitFor(() => expect(reasons()[1]!.getAttribute('aria-pressed')).toBe('true'));
    expect(send.disabled).toBe(false);
    send.click();
    await vi.waitFor(() => expect(posted(fetchMock, '/api/report')).toEqual([{ api_type: 'json', thing_id: 't3_1q2c001', reason: 'Incivility', uh: 'MODHASH' }]));
    await vi.waitFor(() => expect(report().textContent).toContain('Thanks for your report'));
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
    expect(document.querySelector('main')!.textContent).toContain('/r/pics/.json?raw_json=1&sr_detail=1&limit=25: 403');
    expect(document.querySelectorAll('article')).toHaveLength(0);
  });
});

describe('r/all', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const changed = (method: string) => fetchMock.mock.calls.filter(([, init]) => init?.method === method)
    .map(([url, init]) => [url, init.headers?.['X-Modhash'], init.body ? Object.fromEntries(init.body as URLSearchParams) : null]);
  const rail = () => document.querySelector('aside section')!;
  const listed = () => [...rail().querySelectorAll('li a')].map((a) => a.textContent);

  beforeEach(() => {
    history.replaceState(null, '', '/r/all/');
    fetchMock = vi.fn(async (url: string) => answer(url));
    vi.stubGlobal('fetch', fetchMock);
    setUpListing(shell);
  });

  const show = () => [...rail().querySelectorAll('button')].find((b) => b.textContent?.startsWith('Show'))!;

  it('the subreddits you keep out of it, A–Z: in the bar, folded (Show 3) as old reddit’s; behind Filters (N), open', async () => {
    await vi.waitFor(() => expect(show().textContent).toBe('Show 3'));
    expect(listed()).toEqual([]);
    show().click();
    await vi.waitFor(() => expect(listed()).toEqual(['r/funny', 'r/gaming', 'r/memes']));
    expect(show().textContent).toBe('Show less');
    expect([...document.querySelectorAll('[role="dialog"][aria-label="Filtered from r/all"] li a')].map((a) => a.textContent)).toEqual(['r/funny', 'r/gaming', 'r/memes']);
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/api/filter/user/you/f/all?raw_json=1');
    expect([...document.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Filters'))!.textContent).toBe('Filters (3)');
  });

  it('one added (r/name or name): listed, reddit told (PUT, your modhash), its posts gone from the page; × lets it back in', async () => {
    await vi.waitFor(() => expect(titles()).toHaveLength(7));
    await vi.waitFor(() => expect(show()).toBeTruthy());
    show().click();
    const form = rail().querySelector('form')!;
    form.querySelector('input')!.value = 'r/pics';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(listed()).toEqual(['r/funny', 'r/gaming', 'r/memes', 'r/pics']));
    expect(titles()).toEqual([]);  // every post here is r/pics'
    expect(form.querySelector('input')!.value).toBe('');
    await vi.waitFor(() => expect(changed('PUT')).toEqual([['/api/filter/user/you/f/all/r/pics', 'MODHASH', { model: '{"name":"pics"}' }]]));
    rail().querySelector<HTMLButtonElement>('button[aria-label="Let r/funny back into r/all"]')!.click();
    await vi.waitFor(() => expect(listed()).toEqual(['r/gaming', 'r/memes', 'r/pics']));
    await vi.waitFor(() => expect(changed('DELETE')).toEqual([['/api/filter/user/you/f/all/r/funny', 'MODHASH', null]]));
  });
});
