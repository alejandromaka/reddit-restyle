// @vitest-environment jsdom
/* A listing drawn from reddit's JSON (the fixture), and More posts */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setUpListing } from '../src/pages/listing';
import type { Shell } from '../src/shell/blocker';

const fixture = readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8');
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
    fetchMock = vi.fn(async (url: string) => new Response(url.includes('after=') ? second : fixture));
    vi.stubGlobal('fetch', fetchMock);
    setUpListing(shell);
  });

  it('asks for the page’s JSON and draws its posts under its bar', async () => {
    expect(fetchMock.mock.calls[0]![0]).toBe('/r/pics/top/.json?t=week&raw_json=1');
    await vi.waitFor(() => expect(titles()).toHaveLength(4));
    expect(document.querySelector('h1')!.textContent).toBe('r/pics');
    expect(document.querySelector('nav [aria-current="page"]')!.textContent).toBe('top');
    expect(titles()[1]).toBe('Sunrise over the Grand Canyon this morning');
    expect(document.querySelector('img')!.getAttribute('src')).toBe('https://preview.redd.it/abc123.jpeg?width=640&s=c');
    expect([...document.querySelectorAll('article span')].map((s) => s.textContent)).toEqual(expect.arrayContaining(['Pinned', 'Announcement', 'NSFW']));
  });

  it('More posts: the next page, appended', async () => {
    await vi.waitFor(() => expect(moreButton()).toBeTruthy());
    moreButton()!.click();
    expect(fetchMock.mock.calls[1]![0]).toBe('/r/pics/top/.json?t=week&raw_json=1&after=t3_1q2c004');
    await vi.waitFor(() => expect(titles()).toHaveLength(5));
    expect(titles()[4]).toBe('From the next page');
    expect(moreButton()).toBeUndefined();  // no page after it
  });
});
