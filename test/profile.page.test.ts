// @vitest-environment jsdom
/* Someone's profile drawn from reddit's JSON (the fixtures): who, About,
   tabs and sorts, their comments and posts, votes, pages */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setUpProfile } from '../src/pages/profile';
import type { Shell } from '../src/shell/blocker';

const read = (name: string) => readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8');

// reddit, from the fixtures: you are someone
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"name":"someone","modhash":"MODHASH"}}'
    : url.startsWith('/api/') ? '{}'
      : url.startsWith('/subreddits/') ? read('subscriptions')
        : url.endsWith('/about.json?raw_json=1') ? read('user')
          : read('user-listing'),
);
const posted = (fetchMock: ReturnType<typeof vi.fn>, url: string) =>
  fetchMock.mock.calls.filter(([to, init]) => to === url && init?.method === 'POST').map(([, init]) => Object.fromEntries(init.body as URLSearchParams));

const shell: Shell = {
  page: 'profile',
  ready: (callback) => callback(),
  mount: () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    return root;
  },
  reveal: () => {},
};

const main = () => document.querySelector('main')!;
const tabs = () => [...main().querySelectorAll('nav[aria-label="Profile"] a')].map((tab) => [tab.textContent, tab.getAttribute('href')]);
const cards = () => [...main().querySelectorAll('article')];

describe('profile page', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const open = (address: string) => {
    history.replaceState(null, '', address);
    setUpProfile(shell);
  };

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => answer(url));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('asks for the page’s JSON (a page’s worth) and who they are; draws them: name, u/name, bio, About folded', async () => {
    open('/user/someone/comments/?sort=top&t=week');
    const asked = fetchMock.mock.calls.map(([url]) => url);
    expect(asked).toContain('/user/someone/comments/.json?sort=top&t=week&raw_json=1&sr_detail=1&limit=25');
    expect(asked).toContain('/user/someone/about.json?raw_json=1');
    await vi.waitFor(() => expect(main().querySelector('h1')!.textContent).toBe('Some One'));
    expect(main().querySelector('header')!.textContent).toContain('u/someone');
    expect(main().querySelector('header')!.textContent).toContain('Lighthouses, mostly.');
    const about = main().querySelector('details')!;
    expect(about.open).toBe(false);
    expect(about.textContent).toContain('12 followers');
    expect(about.textContent).toContain('1.2kKarma');
  });

  it('your own: all your tabs, the one here current; its sorts, Top with its span', async () => {
    open('/user/someone/comments/?sort=top&t=week');
    await vi.waitFor(() => expect(tabs()).toHaveLength(7));
    expect(tabs().map(([label]) => label)).toEqual(['Overview', 'Posts', 'Comments', 'Saved', 'Hidden', 'Upvoted', 'Downvoted']);
    expect(main().querySelector('[aria-current="page"]')!.getAttribute('href')).toBe('/user/someone/comments/');
    const sort = main().querySelector<HTMLSelectElement>('select[aria-label="Sort"]')!;
    expect([...sort.options].map((option) => option.value)).toEqual([
      '/user/someone/comments/', '/user/someone/comments/?sort=hot', '/user/someone/comments/?sort=top', '/user/someone/comments/?sort=controversial',
    ]);
    expect(main().querySelector<HTMLSelectElement>('select[aria-label="Time"]')!.value).toBe('/user/someone/comments/?sort=top&t=week');
  });

  it('someone else’s: Overview, Posts, Comments', async () => {
    open('/user/other/');
    await vi.waitFor(() => expect(cards()).toHaveLength(3));  // you're known by then (asked once, earlier)
    expect(tabs()).toEqual([['Overview', '/user/other/'], ['Posts', '/user/other/submitted/'], ['Comments', '/user/other/comments/']]);
  });

  it('their comments and posts: a comment with the post it’s on, a post as a listing’s; the next page', async () => {
    open('/user/someone/');
    await vi.waitFor(() => expect(cards()).toHaveLength(3));
    const [first, post] = cards();
    expect(first!.querySelector('a[href="/r/pics/comments/1q2c002/sunrise_over_the_grand_canyon/"]')!.textContent).toBe('Sunrise over the Grand Canyon this morning');
    expect(first!.textContent).toContain('someone commented');
    expect(first!.querySelector('strong')!.textContent).toBe('unreal');
    expect(post!.querySelector('a[href^="/r/pics/comments/"]')!.textContent).toBe('A lighthouse at night (from r/EarthPorn)');
    const next = '/user/someone/?count=25&after=t1_u1c002';
    expect([...main().querySelectorAll('nav[aria-label="Pages"] a')].map((a) => a.getAttribute('href'))).toEqual([next, next]);
  });

  it('a vote on a comment: on screen at once, sent with your modhash', async () => {
    open('/user/someone/');
    await vi.waitFor(() => expect(cards()).toHaveLength(3));
    const down = cards()[0]!.querySelector<HTMLButtonElement>('button[aria-label="Downvote"]')!;
    down.click();
    await vi.waitFor(() => expect(down.getAttribute('aria-pressed')).toBe('true'));
    expect(down.parentElement!.textContent).toBe('39');
    await vi.waitFor(() => expect(posted(fetchMock, '/api/vote')).toEqual([{ id: 't1_u1c001', dir: '-1', rank: '1', uh: 'MODHASH' }]));
  });

  it('reddit says no: why, in place of the page', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.includes('/user/') ? new Response('', { status: 404 }) : answer(url)));
    open('/user/gone/');
    await vi.waitFor(() => expect(main().textContent).toContain('Couldn’t load this page'));
    expect(main().querySelector('header')!.textContent).toContain('/user/gone/about.json?raw_json=1: 404');
  });
});
