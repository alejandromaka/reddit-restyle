// @vitest-environment jsdom
/* A post's page drawn from reddit's JSON (the fixtures): the post, its
   comments, folding, replying, more, searching, sorting */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setUpPost } from '../src/pages/post';
import type { Shell } from '../src/shell/blocker';

const read = (name: string) => readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8');
const PATH = '/r/pics/comments/1q2c001/welcome_to_rpics/';

// reddit, from the fixtures
const answer = (url: string) => new Response(
  url === '/api/me.json?raw_json=1' ? '{"data":{"name":"you","modhash":"MODHASH"}}'
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
const authors = () => [...main().querySelectorAll('#comments article > header a')].map((a) => a.textContent);
const button = (text: string, within: ParentNode = main()) => [...within.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text || b.getAttribute('aria-label') === text)!;
const comment = (author: string) => [...main().querySelectorAll<HTMLElement>('#comments article')].find((a) => a.querySelector('header a')?.textContent === author)!;
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

  it('folding a thread: its words and replies go, until opened again', async () => {
    button('Fold the thread', comment('early_riser')).click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'automod']));
    button('Open the thread', comment('early_riser')).click();
    await vi.waitFor(() => expect(authors()).toEqual(['early_riser', 'pics-mod', 'automod']));
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
