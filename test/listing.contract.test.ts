/* Reading reddit's listing JSON (test/fixtures/listing.json: written by hand
   in reddit's format; replace it with a saved /r/pics.json?raw_json=1) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listingUrl, readListing } from '../src/pages/listing/contract';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8'));

describe('readListing', () => {
  const { posts, after } = readListing(answer);
  const [pinned, photo, link, nsfw] = posts;

  it('reads every post and where the next page starts', () => {
    expect(posts.map(({ id }) => id)).toEqual(['t3_1q2c001', 't3_1q2c002', 't3_1q2c003', 't3_1q2c004']);
    expect(after).toBe('t3_1q2c004');
  });

  it('a text post: no link, no image; pinned with its flair', () => {
    expect(pinned).toMatchObject({ link: null, image: null, pinned: true, flair: 'Announcement', subreddit: 'pics', comments: 87 });
  });

  it('a photo: the smallest preview at least 640 wide', () => {
    expect(photo!.image).toEqual({ url: 'https://preview.redd.it/abc123.jpeg?width=640&s=c', width: 640, height: 853 });
    expect(photo!.link).toBe('https://i.redd.it/abc123.jpeg');
  });

  it('a link without a preview; an empty flair is none', () => {
    expect(link).toMatchObject({ image: null, link: 'https://example.com/museum-restores-painting', domain: 'example.com', flair: null });
  });

  it('NSFW: its preview stays hidden', () => {
    expect(nsfw).toMatchObject({ nsfw: true, image: null });
  });
});

describe('listingUrl', () => {
  it('adds .json to the page, keeps its query, asks for unescaped URLs', () => {
    expect(listingUrl('/', '')).toBe('/.json?raw_json=1');
    expect(listingUrl('/r/pics/top/', '?t=week')).toBe('/r/pics/top/.json?t=week&raw_json=1');
    expect(listingUrl('/r/pics', '', 't3_x')).toBe('/r/pics/.json?raw_json=1&after=t3_x');
  });
});
