// @vitest-environment jsdom
/* A post's page drawn from reddit's JSON (the fixtures): the post, its
   comments, folding, replying, more, searching, sorting, blocking */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setUpPost } from '../src/pages/post';
import type { Shell } from '../src/shell/blocker';

const read = (name: string) => readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8');
const PATH = '/r/pics/comments/1q2c001/welcome_to_rpics/';

// reddit, from the fixtures
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"id":"y0u","name":"you","modhash":"MODHASH"}}'
    : url === '/api/comment' ? read('posted')
      : url.startsWith('/api/morechildren.json') ? read('morechildren')
        : url.startsWith('/subreddits/') ? read('subscriptions')
          : url.includes('/about.json') ? read('about')
            : read('thread'),
);

const shell: Shell = {
  page: 'post',
  ready: (callback) => callback(),
  mount: () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    return root;
  },
  reveal: () => {},
};

const main = () => document.querySelector('main')!;
const authors = () => [...main().querySelectorAll('#comments article > header > a')].map((name) => name.textContent);
const button = (text: string, within: ParentNode = main()) => [...within.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text || b.getAttribute('aria-label') === text)!;
const comment = (author: string) => [...main().querySelectorAll<HTMLElement>('#comments article')].find((a) => a.querySelector('header > a')?.textContent === author)!;
const row = (author: string) => comment(author).querySelector<HTMLElement>('header')!;  // who and when: a tap folds
const type = (field: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('a post’s page', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const sent = (url: string) => fetchMock.mock.calls.filter(([to, init]) => to === url && init?.method === 'POST').map(([, init]) => Object.fromEntries(init.body as URLSearchParams));
  const asked = (start: string) => fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith(start));

  beforeEach(async () => {
    history.replaceState(null, '', PATH);
    fetchMock = vi.fn(async (url: string) => answer(url));
    vi.stubGlobal('fetch', fetchMock);
    setUpPost(shell);
    await vi.waitFor(() => expect(main().querySelector('h1')).not.toBeNull());
  });

  it('the post, all of it: its JSON asked for, its title, its text (a spoiler hidden until tapped)', () => {
    expect(asked(PATH)).toEqual([`${PATH}.json?raw_json=1&sr_detail=1`]);
    expect(main().querySelector('h1')!.textContent).toBe('Welcome to r/pics: read the rules before posting');
    expect(main().textContent).toContain('Hi everyone! Read the rules.');
    const spoiler = main().querySelector<HTMLElement>('[data-spoiler]')!;
    expect(spoiler.className).toContain('rr-text-transparent');
    spoiler.click();
    expect(spoiler.className).not.toContain('rr-text-transparent');
  });

  it('its comments, as a tree; reddit’s folded one folded; more, and a thread too deep for here', () => {
    expect(authors()).toEqual(['early_riser', 'pics-mod', 'automod']);
    expect(comment('automod').textContent).not.toContain('Reminder');
    expect(button('View 12 more comments')).toBeTruthy();
    expect(button('3 more replies')).toBeTruthy();
    expect(main().querySelector('a[href="/r/pics/comments/1q2c001/welcome_to_rpics/c2/"]')!.textContent).toBe('Continue this thread →');
  });

  it('folding: a tap on who and when folds the comment and its replies away; again, brings them all back', async () => {
    row('early_riser').click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'automod']));
    expect(comment('early_riser').textContent).not.toContain('First!');
    row('early_riser').click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'pics-mod', 'automod']));
    expect(comment('early_riser').textContent).toContain('First!');
  });

  it('the thread’s line: a tap folds the comment it comes down from; again (its row), opens it', async () => {
    comment('early_riser').querySelector<HTMLButtonElement>(':scope > .rr-relative > button')!.click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'automod']));
    row('early_riser').click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'pics-mod', 'automod']));
  });

  it('the thread’s line runs beside its replies but the last, into the last one’s curve', () => {
    const line = comment('early_riser').querySelector<HTMLButtonElement>(':scope > .rr-relative > button')!;
    expect(line.parentElement!.contains(comment('pics-mod'))).toBe(true);
    expect(line.parentElement!.contains(button('3 more replies'))).toBe(false);
  });

  it('"…": the post’s, Hide, Report and Block its author (a text post: no site); a comment’s, Report and Block (reddit hides posts only), by the post’s subreddit’s rules', async () => {
    const menu = () => document.querySelector('[role="dialog"][aria-label="More options"]')!;
    const items = () => [...menu().querySelectorAll('button')].map((b) => b.textContent).filter(Boolean);  // not the scrim's
    main().querySelector<HTMLButtonElement>('article button[aria-label="More options"]')!.click();  // the post's, first
    await vi.waitFor(() => expect(items()).toEqual(['Hide', 'Report', 'Block u/pics-mod']));
    comment('early_riser').querySelector<HTMLButtonElement>('button[aria-label="More options"]')!.click();
    await vi.waitFor(() => expect(items()).toEqual(['Report', 'Block u/early_riser']));
    [...menu().querySelectorAll('button')].find((b) => b.textContent === 'Report')!.click();
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"][aria-label="Report"]')!.textContent).toContain('Report this comment'));
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain('/r/pics/about/rules.json?raw_json=1');
  });

  it('blocking a comment’s author: asked first; sent; their comments folded, Blocked; unblocked from the "…", again open', async () => {
    const menu = () => document.querySelector('[role="dialog"][aria-label="More options"]')!;
    const sure = () => document.querySelector('[role="dialog"][aria-label="Block account"]')!;
    comment('pics-mod').querySelector<HTMLButtonElement>('button[aria-label="More options"]')!.click();
    await vi.waitFor(() => expect(button('Block u/pics-mod', menu())).toBeDefined());
    button('Block u/pics-mod', menu()).click();
    await vi.waitFor(() => expect(sure().textContent).toContain('Block u/pics-mod?'));
    expect(sent('/api/block_user')).toEqual([]);  // not before you're sure
    button('Block account', sure()).click();
    await vi.waitFor(() => expect(sent('/api/block_user')).toEqual([{ name: 'pics-mod', uh: 'MODHASH' }]));
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'pics-mod', 'automod']));
    expect(row('pics-mod').textContent).toContain('Blocked');
    expect(comment('pics-mod').querySelector('button[aria-label="More options"]')).toBeNull();  // folded: its row only
    row('pics-mod').click();  // still yours to open
    await vi.waitFor(() => expect(comment('pics-mod').querySelector('button[aria-label="More options"]')).not.toBeNull());
    comment('pics-mod').querySelector<HTMLButtonElement>('button[aria-label="More options"]')!.click();
    await vi.waitFor(() => expect(button('Unblock u/pics-mod', menu())).toBeDefined());
    button('Unblock u/pics-mod', menu()).click();
    await vi.waitFor(() => expect(sent('/api/unfriend')).toEqual([{ name: 'pics-mod', type: 'enemy', container: 't2_y0u', uh: 'MODHASH' }]));
    expect(row('pics-mod').textContent).not.toContain('Blocked');
  });

  it('a picture a comment links to: in it, sized (reddit’s copy a phone’s width), loaded as it nears the screen; a tap opens it big', async () => {
    const image = comment('pics-mod').querySelector<HTMLImageElement>('a[data-picture] img')!;
    expect(['src', 'width', 'height', 'loading'].map((name) => image.getAttribute(name))).toEqual(['https://preview.redd.it/v8x2k1top.jpeg?width=640&crop=smart&auto=webp&s=a2', '640', '480', 'lazy']);
    expect(comment('pics-mod').textContent).toContain('Here it is from the top:');
    expect(comment('pics-mod').textContent).not.toContain('https://');  // the picture, not its address
    image.click();
    const viewer = () => document.querySelector('[role="dialog"][aria-label="Pictures"]');
    await vi.waitFor(() => expect(viewer()).not.toBeNull());
    expect(viewer()!.querySelector('img')!.getAttribute('src')).toBe('https://preview.redd.it/v8x2k1top.jpeg?width=1080&crop=smart&auto=webp&s=a3');
  });

  it('a gif a comment has (reddit’s markdown for it, as written): its video, which loads and plays only while it’s on screen', async () => {
    let tell: (entries: { target: Element; isIntersecting: boolean }[]) => void = () => {};
    const watched: Element[] = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof tell) { tell = callback; }
      observe(target: Element) { watched.push(target); }
      unobserve() {}
    });
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    setUpPost(shell);  // the page again, with gifs watched
    const gif = await vi.waitFor(() => comment('pics-mod').querySelector('video')!);
    expect(comment('pics-mod').textContent).not.toContain('![gif]');
    expect(gif.getAttribute('src')).toBeNull();  // nothing until it nears the screen
    await vi.waitFor(() => expect(watched).toContain(gif));
    tell([{ target: gif, isIntersecting: true }]);
    expect([gif.getAttribute('src'), gif.getAttribute('poster'), gif.muted]).toEqual(['https://external-preview.redd.it/gif.gif?width=480&format=mp4&s=b4', 'https://external-preview.redd.it/still.png?width=480&crop=smart&format=png8&s=b2', true]);
    expect(play).toHaveBeenCalled();
    tell([{ target: gif, isIntersecting: false }]);
    expect(pause).toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });

  it('the name: their profile, not a fold', () => {
    const name = row('early_riser').querySelector('a')!;
    expect(name.getAttribute('href')).toBe('/user/early_riser/');
    name.addEventListener('click', (event) => event.preventDefault());  // jsdom: no going there
    name.click();
    expect(comment('early_riser').textContent).toContain('First!');
  });

  it('folding with ⊖, and reddit’s folded one opened with a tap on its row', async () => {
    button('Fold the thread', comment('early_riser')).click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'automod']));
    row('automod').click();
    await vi.waitFor(() => expect(comment('automod').textContent).toContain('Reminder: be civil'));
  });

  it('a reply: its box under the comment; sent with your modhash; first among its replies', async () => {
    button('Reply', comment('early_riser')).click();
    await vi.waitFor(() => expect(comment('early_riser').querySelector('textarea')).not.toBeNull());
    const box = comment('early_riser').querySelector('textarea')!;
    expect(box.getAttribute('placeholder')).toBe('Reply to u/early_riser');
    type(box, 'Nice one');
    button('Comment', comment('early_riser')).click();
    await vi.waitFor(() => expect(sent('/api/comment')).toEqual([{ api_type: 'json', thing_id: 't1_c1', text: 'Nice one', uh: 'MODHASH' }]));
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'you', 'pics-mod', 'automod']));
    expect(comment('early_riser').querySelector('textarea')).toBeNull();  // the box, closed
  });

  it('a comment on the post: the box under it; first among the comments', async () => {
    button('Join the conversation').click();
    await vi.waitFor(() => expect(main().querySelector('textarea')).not.toBeNull());
    type(main().querySelector('textarea')!, 'Hello');
    button('Comment').click();
    await vi.waitFor(() => expect(sent('/api/comment')[0]).toMatchObject({ thing_id: 't3_1q2c001', text: 'Hello' }));
    await vi.waitFor(() => expect(authors()[0]).toBe('you'));
  });

  it('more replies: asked for, each under its parent', async () => {
    button('3 more replies').click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'pics-mod', 'night_owl', 'early_riser', 'lurker', 'automod']));
    const url = new URL(asked('/api/morechildren.json')[0]!, 'https://old.reddit.com');
    expect([url.searchParams.get('link_id'), url.searchParams.get('children'), url.searchParams.get('sort')]).toEqual(['t3_1q2c001', 'c5,c6,c7', 'confidence']);
  });

  it('searching: the loaded comments that match, each with a way to its thread', async () => {
    type(main().querySelector<HTMLInputElement>('input[type="search"]')!, 'great');
    await vi.waitFor(() => expect(main().textContent).toContain('1 of the loaded comments matches “great”'));
    expect(main().querySelector('#comments a[href="/r/pics/comments/1q2c001/welcome_to_rpics/c1/"]')!.textContent).toBe('Go to thread');
    button('Clear search').click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'pics-mod', 'automod']));
  });

  it('sort by: a dropdown of reddit’s orders, Best chosen', () => {
    const sort = main().querySelector<HTMLSelectElement>('select[aria-label="Sort comments"]')!;
    expect(sort.value).toBe(`${PATH}?sort=confidence`);
    expect([...sort.options].map((o) => o.textContent)).toEqual(['Best', 'Top', 'New', 'Controversial', 'Old', 'Q&A']);
  });
});
