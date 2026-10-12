/* Reading reddit's listing JSON (test/fixtures/listing.json: written by hand
   in reddit's format; replace it with a saved /r/pics.json?raw_json=1) */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listingUrl, readListing } from '../src/pages/listing/contract';

const answer = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/listing.json'), 'utf8'));

describe('readListing', () => {
  const { posts, after } = readListing(answer);
  const [pinned, photo, link, nsfw, video, gallery, crosspost] = posts;

  it('reads every post and where the next page starts', () => {
    expect(posts.map(({ id }) => id)).toEqual(['t3_1q2c001', 't3_1q2c002', 't3_1q2c003', 't3_1q2c004', 't3_1q2c005', 't3_1q2c006', 't3_1q2c007']);
    expect(after).toBe('t3_1q2c007');
  });

  it('a text post: its opening as plain text, spoilers hidden; pinned with its flair', () => {
    expect(pinned).toMatchObject({ link: null, image: null, pinned: true, flair: 'Announcement', subreddit: 'pics', comments: 87 });
    expect(pinned!.text).toBe('Hi everyone! Please read the rules before posting. No screenshots & no memes. Be civil Credit the artist The last episode [spoiler] by the way.');
  });

  it('a photo: the smallest preview at least 640 wide; reddit’s own, so no link', () => {
    expect(photo).toMatchObject({ image: { url: 'https://preview.redd.it/abc123.jpeg?width=640&s=c', width: 640, height: 853 }, link: null, text: null });
  });

  it('a link: its card and where it goes; an empty flair is none', () => {
    expect(link).toMatchObject({ link: 'https://example.com/museum-restores-painting', domain: 'example.com', flair: null, video: false });
    expect(link!.image!.url).toBe('https://external-preview.redd.it/museum.jpg?width=640&s=c');
  });

  it('NSFW: its preview stays hidden', () => {
    expect(nsfw).toMatchObject({ nsfw: true, image: null, text: null });
  });

  it('a video: its poster, marked as one', () => {
    expect(video).toMatchObject({ video: true, link: null, image: { url: 'https://external-preview.redd.it/vid005.png?width=640&s=c', width: 640, height: 360 } });
  });

  it('a gallery: its first picture in its own order, and how many there are (failed ones left out)', () => {
    expect(gallery).toMatchObject({ gallery: 2, link: null, image: { url: 'https://preview.redd.it/g2.jpg?width=640&s=x', width: 640, height: 853 } });
  });

  it('a crosspost: the preview of the post it shares', () => {
    expect(crosspost).toMatchObject({ subreddit: 'pics', link: null, domain: 'i.redd.it', image: { url: 'https://preview.redd.it/light.jpeg?width=640&s=c' } });
  });
});

describe('listingUrl', () => {
  it('adds .json to the page, keeps its query, asks for unescaped URLs', () => {
    expect(listingUrl('/', '')).toBe('/.json?raw_json=1');
    expect(listingUrl('/r/pics/top/', '?t=week')).toBe('/r/pics/top/.json?t=week&raw_json=1');
    expect(listingUrl('/r/pics', '', 't3_x')).toBe('/r/pics/.json?raw_json=1&after=t3_x');
  });
});
